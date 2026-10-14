/**
 * Logika tampilan strip kesehatan preflight foto kartu OG di dashboard admin.
 *
 * Dipisah dari komponennya (`@/components/dashboard/og-photo-health`) karena
 * dua hal di sini terlalu mudah salah dan terlalu mahal untuk salah:
 *
 * 1. **Frekuensi poling.** Endpoint ini membaca keadaan satu proses, jadi
 *    memolesnya tiap beberapa detik saat semuanya sehat hanya menambah trafik
 *    ke database tanpa menambah pengetahuan. Yang diinginkan justru sebaliknya:
 *    lambat saat sehat, cepat saat rusak.
 * 2. **Pemetaan keadaan → warna dan kata.** Verdict `failing` yang dirender
 *    dengan warna "aman" adalah laporan yang berbohong. Pemetaan itu diuji di
 *    sini, bukan diwariskan dari kebiasaan.
 */

import type {
  OgPhotoPreflightReport,
  PreflightFailureReason,
} from "@/lib/og-photo-preflight"
import type { OgPhotoPreflightWindow } from "@/lib/og-photo-preflight-snapshot"

export const OG_PHOTO_HEALTH_QUERY_KEY = ["admin-og-photo-health"] as const

/** Cakupan default yang dibaca strip: satu jam terakhir. */
export const OG_PHOTO_HEALTH_WINDOW_LABEL = "1h"

export const OG_PHOTO_HEALTH_QUERY_PATH = `/api/admin/og-photo?window=${OG_PHOTO_HEALTH_WINDOW_LABEL}`

/**
 * Jalur laporan teks, lengkap dengan jendela yang diminta — tautan "detail"
 * harus menghasilkan laporan yang sama cakupannya dengan yang diringkas di
 * kartu, bukan jendela default yang kebetulan berbeda.
 */
export const OG_PHOTO_HEALTH_DETAIL_PATH = `${OG_PHOTO_HEALTH_QUERY_PATH}&format=text`

/**
 * Bentuk balasan `GET /api/admin/og-photo`: laporan per proses, ditambah
 * agregat jendela dari snapshot Mongo. Agregat bisa null (pembacaan riwayat
 * gagal) tanpa membatalkan seluruh laporan — laporan per proses tetap sah.
 */
export type OgPhotoHealthResponse = OgPhotoPreflightReport & {
  windowLabel: string
  aggregate: OgPhotoPreflightWindow | null
  aggregateError: string | null
  snapshotFlush: "skipped" | "throttled" | "written" | "failed"
}

export type OgPhotoHealthTone = "success" | "warning" | "destructive" | "muted"

export type OgPhotoHealthReason = {
  reason: PreflightFailureReason
  label: string
  count: number
}

export type OgPhotoHealthSummary = {
  verdict: OgPhotoPreflightReport["verdict"]
  verdictLabel: string
  tone: OgPhotoHealthTone
  /** Satu kalimat yang menjelaskan apa yang sedang terjadi. */
  headline: string
  reasons: OgPhotoHealthReason[]
  attemptsLabel: string
  cacheLabel: string
  /** Terisi hanya selama episode alert berjalan. */
  alertLabel: string | null
  /** Host yang paling banyak gagal di proses ini; null bila tidak ada. */
  topHost: string | null
  windowLabel: string | null
  windowSummaryLabel: string | null
  windowError: string | null
}

const VERDICT_LABELS: Record<
  OgPhotoPreflightReport["verdict"],
  { label: string; tone: OgPhotoHealthTone }
> = {
  // "unknown" bukan "sehat": belum ada satu pun percobaan sejak proses hidup,
  // jadi tidak ada yang bisa diklaim. Warnanya sengaja netral, bukan hijau.
  unknown: { label: "Belum ada data", tone: "muted" },
  healthy: { label: "Sehat", tone: "success" },
  degraded: { label: "Sempat gagal", tone: "warning" },
  failing: { label: "Foto hilang", tone: "destructive" },
}

const REASON_LABELS: Record<PreflightFailureReason, string> = {
  http: "CDN menolak",
  timeout: "Waktu habis",
  network: "Jaringan",
}

/**
 * Selang poling per verdict, dalam milidetik.
 *
 * `healthy` tetap dipoles lambat (bukan `false`) supaya kegagalan pertama
 * muncul sendiri di layar admin yang sudah terbuka, tanpa perlu muat ulang —
 * tapi tidak lebih sering dari yang masuk akal untuk keadaan yang tidak berubah.
 */
const REFETCH_INTERVAL_BY_VERDICT: Record<
  OgPhotoPreflightReport["verdict"],
  number
> = {
  failing: 15_000,
  degraded: 30_000,
  unknown: 60_000,
  healthy: 5 * 60_000,
}

/**
 * Selang poling untuk `useQuery`. Selalu angka positif, jadi tidak ada keadaan
 * "berhenti memantau" yang bisa membuat masalah berikutnya tidak terlihat.
 */
export function ogPhotoHealthRefetchInterval(
  report: OgPhotoHealthResponse | undefined
): number {
  if (!report) return REFETCH_INTERVAL_BY_VERDICT.unknown
  return REFETCH_INTERVAL_BY_VERDICT[report.verdict]
}

function ageLabel(ms: number | null): string | null {
  if (ms === null) return null
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} detik lalu`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} menit lalu`
  return `${Math.round(minutes / 60)} jam lalu`
}

function headlineFor(report: OgPhotoHealthResponse): string {
  const unreachable = report.attempts.unreachable

  switch (report.verdict) {
    case "failing":
      return `Percobaan terakhir gagal — kartu yang dibagikan sekarang tampil tanpa foto (${unreachable} dari ${report.attempts.total} percobaan gagal).`
    case "degraded":
      return `Percobaan terakhir berhasil, tapi ada kegagalan ${ageLabel(report.lifetime.msSinceLastFailure) ?? "baru saja"}.`
    case "healthy":
      return `Semua ${report.attempts.total} percobaan berhasil; tidak ada foto yang hilang.`
    default:
      return "Belum ada kartu yang dirender sejak proses ini hidup — angka apa pun belum bisa disimpulkan."
  }
}

function windowSummaryLabel(
  aggregate: OgPhotoPreflightWindow | null
): string | null {
  if (!aggregate) return null
  if (aggregate.snapshots === 0) {
    return "Belum ada riwayat tersimpan di jendela ini."
  }
  return `${aggregate.snapshots} snapshot dari ${aggregate.instances} instance · ${aggregate.attempts.total} percobaan · ${aggregate.failures.total} gagal`
}

/**
 * Ringkas laporan mentah menjadi yang benar-benar dibaca admin. Ketiga alasan
 * kegagalan SELALU muncul — termasuk yang bernilai nol — supaya "0" terbaca
 * sebagai "diperiksa dan kosong", bukan sebagai kategori yang hilang.
 */
export function summarizeOgPhotoHealth(
  report: OgPhotoHealthResponse
): OgPhotoHealthSummary {
  const verdict = VERDICT_LABELS[report.verdict]
  const topHost = report.failingHosts[0]
    ? `${report.failingHosts[0].host} — ${report.failingHosts[0].failures}×`
    : null

  return {
    verdict: report.verdict,
    verdictLabel: verdict.label,
    tone: verdict.tone,
    headline: headlineFor(report),
    reasons: (Object.keys(REASON_LABELS) as PreflightFailureReason[]).map(
      (reason) => ({
        reason,
        label: REASON_LABELS[reason],
        count: report.failures.byReason[reason],
      })
    ),
    attemptsLabel: `${report.attempts.total} percobaan · ${report.attempts.reachable} berhasil`,
    cacheLabel: `${report.cache.servedFromCache} dari cache · ${report.cache.dedupedInFlight} dedupe`,
    alertLabel: report.alerts.activeSince
      ? `ALERT aktif sejak ${report.alerts.activeSince} (${report.alerts.consecutiveFailures} kegagalan berurutan)`
      : null,
    topHost,
    windowLabel: report.aggregate ? report.windowLabel : null,
    windowSummaryLabel: windowSummaryLabel(report.aggregate),
    windowError: report.aggregateError,
  }
}
