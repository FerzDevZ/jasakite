/**
 * Penyimpanan delta hitungan preflight foto OG, plus pembacaan satu jendela
 * waktu yang sudah dijumlahkan dari semua instance.
 *
 * Kenapa ada: hitungan di `@/lib/og-photo-preflight` hidup di memori satu
 * proses. Artinya dua hal yang membuatnya belum berguna sebagai angka produksi:
 * setiap redeploy mengembalikannya ke `unknown`, dan di deployment
 * multi-instance tiap instance hanya melaporkan bagiannya sendiri. Modul ini
 * menutup keduanya — delta ditulis ke Mongo, lalu dijumlahkan untuk jendela
 * 15 menit sampai 7 hari.
 *
 * Kebijakan tulis sengaja dua kecepatan:
 * - **Segera** saat delta memuat kegagalan atau alert. Bukti bahwa foto hilang
 *   tidak boleh menunggu jendela throttle; proses yang mati lima detik setelah
 *   kegagalan pertama justru kasus yang ingin kita lihat.
 * - **Maksimal sekali per menit** saat trafiknya sehat. Satu baris per render
 *   kartu akan membuat koleksi ini tumbuh secepat trafik crawler, padahal isi
 *   baris sehat tidak berbeda-beda.
 *
 * Kegagalan menulis TIDAK menghapus hitungannya: delta yang gagal dikembalikan
 * ke modul preflight (`restoreOgPhotoPreflightDelta`) supaya percobaan
 * berikutnya membawanya lagi. Laporan per proses tetap utuh apa pun yang
 * terjadi di sini — penyimpanan adalah lapisan tambahan, bukan syarat.
 */

import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import {
  drainOgPhotoPreflightDelta,
  emptyOgPhotoPreflightDelta,
  hasOgPhotoPreflightActivity,
  ogPhotoPreflightDelta,
  OG_PHOTO_PREFLIGHT_DELTA_KEYS,
  restoreOgPhotoPreflightDelta,
  type OgPhotoPreflightDelta,
} from "@/lib/og-photo-preflight"

/** Jeda minimum antar tulisan saat trafik sehat. */
export const SNAPSHOT_FLUSH_INTERVAL_MS = 60_000

/** Umur baris snapshot. Lebih tua dari ini dihapus, bukan ditumpuk selamanya. */
export const SNAPSHOT_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000

/** Pembersihan dijalankan paling sering sekali per jam, bukan tiap flush. */
const SNAPSHOT_CLEANUP_INTERVAL_MS = 60 * 60 * 1_000

/**
 * Jendela yang boleh diminta dari endpoint admin, dalam label yang enak diketik
 * (bukan angka milidetik yang harus dihitung sendiri oleh operator).
 */
export const OG_PREFLIGHT_WINDOW_LABELS = {
  "15m": 15 * 60 * 1_000,
  "1h": 60 * 60 * 1_000,
  "6h": 6 * 60 * 60 * 1_000,
  "24h": 24 * 60 * 60 * 1_000,
  "7d": 7 * 24 * 60 * 60 * 1_000,
} as const

export type OgPhotoPreflightWindowLabel = keyof typeof OG_PREFLIGHT_WINDOW_LABELS

export const DEFAULT_OG_PREFLIGHT_WINDOW_LABEL: OgPhotoPreflightWindowLabel = "1h"

/**
 * Identitas proses ini. Acak per proses, bukan hostname: dua proses di satu
 * mesin (mis. dua worker) adalah dua pelapor, dan yang dihitung pembaca adalah
 * berapa pelapor yang menyumbang di jendela itu.
 */
const instanceId = randomUUID()

let lastFlushAt = 0
let lastCleanupAt = 0

/**
 * Hanya untuk pengujian: kembalikan throttle dan jadwal pembersihan ke keadaan
 * awal. Tanpa ini urutan test saling mempengaruhi — flush "pertama" di satu test
 * bisa tertahan throttle yang dipasang test sebelumnya.
 */
export function __resetOgPhotoPreflightSnapshotStore(): void {
  lastFlushAt = 0
  lastCleanupAt = 0
}

export type OgPhotoPreflightFlushOutcome =
  | { status: "skipped" }
  | { status: "throttled" }
  | { status: "written"; snapshotId: string }
  | { status: "failed"; error: string }

export type OgPhotoPreflightWindow = {
  windowMs: number
  since: string
  /** Berapa proses menyumbang di jendela ini — 1 di VPS satu node. */
  instances: number
  snapshots: number
  attempts: { total: number; reachable: number; unreachable: number }
  failures: {
    total: number
    byReason: Record<"http" | "timeout" | "network", number>
  }
  alerts: { raised: number; cleared: number }
  cache: { servedFromCache: number; dedupedInFlight: number }
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Tulis delta yang belum dilaporkan. Aman dipanggil di jalur render kartu:
 * pemanggilan tanpa trafik baru langsung `skipped` tanpa menyentuh database,
 * dan yang sehat dibatasi satu tulisan per menit.
 *
 * `now` bisa disuntik supaya throttle dan pembersihan bisa diuji tanpa menunggu
 * waktu nyata.
 */
export async function flushOgPhotoPreflightSnapshot(
  now: number = Date.now()
): Promise<OgPhotoPreflightFlushOutcome> {
  const pending = ogPhotoPreflightDelta()
  if (!hasOgPhotoPreflightActivity(pending)) return { status: "skipped" }

  const urgent = pending.unreachable > 0 || pending.alertsRaised > 0
  if (!urgent && now - lastFlushAt < SNAPSHOT_FLUSH_INTERVAL_MS) {
    return { status: "throttled" }
  }

  const delta = drainOgPhotoPreflightDelta()

  try {
    const snapshot = await prisma.ogPhotoPreflightSnapshot.create({
      data: {
        instanceId,
        capturedAt: new Date(now),
        ...delta,
      },
    })

    lastFlushAt = now
    await pruneOldSnapshots(now)

    return { status: "written", snapshotId: String(snapshot.id) }
  } catch (error) {
    restoreOgPhotoPreflightDelta(delta)
    console.error(
      "[og/foto][SNAPSHOT] gagal menyimpan hitungan preflight, akan dicoba lagi pada flush berikutnya:",
      error
    )
    return { status: "failed", error: describeError(error) }
  }
}

/**
 * Hapus snapshot yang lebih tua dari masa retensi. Dijalankan di dalam flush
 * yang sudah berhasil, dan kegagalannya sengaja tidak menggagalkan flush —
 * pembersihan yang gagal berarti koleksi tumbuh sedikit, bukan data hilang.
 */
async function pruneOldSnapshots(now: number): Promise<void> {
  if (now - lastCleanupAt < SNAPSHOT_CLEANUP_INTERVAL_MS) return
  lastCleanupAt = now

  try {
    await prisma.ogPhotoPreflightSnapshot.deleteMany({
      where: { capturedAt: { lt: new Date(now - SNAPSHOT_RETENTION_MS) } },
    })
  } catch (error) {
    console.error("[og/foto][SNAPSHOT] gagal menghapus snapshot lama:", error)
  }
}

/**
 * Jumlahkan satu jendela waktu dari seluruh instance. Melempar saat database
 * tidak terbaca — pemanggil (endpoint admin) yang memutuskan bagaimana
 * melaporkannya, karena laporan per proses tetap sah dan tetap harus tersaji.
 */
export async function readOgPhotoPreflightWindow(
  windowMs: number,
  now: number = Date.now()
): Promise<OgPhotoPreflightWindow> {
  const since = new Date(now - windowMs)
  const rows = await prisma.ogPhotoPreflightSnapshot.findMany({
    where: { capturedAt: { gte: since } },
  })

  const totals = emptyOgPhotoPreflightDelta()
  const instanceIds = new Set<string>()

  for (const row of rows) {
    instanceIds.add(row.instanceId)
    for (const key of OG_PHOTO_PREFLIGHT_DELTA_KEYS) {
      totals[key] += row[key]
    }
  }

  return {
    windowMs,
    since: since.toISOString(),
    instances: instanceIds.size,
    snapshots: rows.length,
    attempts: {
      total: totals.attempts,
      reachable: totals.reachable,
      unreachable: totals.unreachable,
    },
    failures: {
      total: totals.unreachable,
      byReason: {
        http: totals.failuresHttp,
        timeout: totals.failuresTimeout,
        network: totals.failuresNetwork,
      },
    },
    alerts: { raised: totals.alertsRaised, cleared: totals.alertsCleared },
    cache: {
      servedFromCache: totals.servedFromCache,
      dedupedInFlight: totals.dedupedInFlight,
    },
  }
}

export type OgPhotoPreflightWindowResolution =
  | { ok: true; label: OgPhotoPreflightWindowLabel; windowMs: number }
  | { ok: false; error: string }

/**
 * Terjemahkan `?window=` dari endpoint admin. Nilai kosong memakai default;
 * nilai yang tidak dikenal DITOLAK, bukan diam-diam diganti default — laporan
 * yang menyebut "1 jam" padahal pembacanya minta 24 jam adalah laporan yang
 * menyesatkan.
 */
export function resolveOgPhotoPreflightWindow(
  label: string | null
): OgPhotoPreflightWindowResolution {
  const allowed = Object.keys(OG_PREFLIGHT_WINDOW_LABELS) as OgPhotoPreflightWindowLabel[]
  const normalized = label?.trim()

  if (!normalized) {
    return {
      ok: true,
      label: DEFAULT_OG_PREFLIGHT_WINDOW_LABEL,
      windowMs: OG_PREFLIGHT_WINDOW_LABELS[DEFAULT_OG_PREFLIGHT_WINDOW_LABEL],
    }
  }

  if ((allowed as string[]).includes(normalized)) {
    const known = normalized as OgPhotoPreflightWindowLabel
    return { ok: true, label: known, windowMs: OG_PREFLIGHT_WINDOW_LABELS[known] }
  }

  return {
    ok: false,
    error: `Nilai window "${normalized}" tidak dikenal. Pilih salah satu: ${allowed.join(", ")}.`,
  }
}

function ageLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} jam`
  return `${Math.round(hours / 24)} hari`
}

/**
 * Ringkasan teks satu jendela: inilah bagian yang menjawab "apakah ini masalah
 * satu instance atau seluruh platform" tanpa membedah log.
 */
export function formatOgPhotoPreflightWindowText(
  window: OgPhotoPreflightWindow
): string {
  const lines = [
    `Jendela ${ageLabel(window.windowMs)} terakhir — ${window.instances} instance, ${window.snapshots} snapshot tersimpan:`,
    `  percobaan: ${window.attempts.total} (${window.attempts.reachable} berhasil, ${window.attempts.unreachable} gagal)`,
    `  alasan: http ${window.failures.byReason.http} · timeout ${window.failures.byReason.timeout} · network ${window.failures.byReason.network}`,
    `  episode alert: ${window.alerts.raised} dinaikkan, ${window.alerts.cleared} pulih`,
    `  cache: dilayani dari cache ${window.cache.servedFromCache} · dedupe ${window.cache.dedupedInFlight}`,
  ]

  if (window.snapshots === 0) {
    lines.push(
      "  catatan: belum ada snapshot tersimpan di jendela ini — angka per proses di atas tetap berlaku, tapi belum ada riwayat yang bisa dibandingkan."
    )
  }

  return lines.join("\n")
}
