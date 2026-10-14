import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  __resetOgPhotoPreflight,
  isImageReachable,
  ogPhotoPreflightReport,
} from "@/lib/og-photo-preflight"
import {
  OG_PHOTO_HEALTH_DETAIL_PATH,
  OG_PHOTO_HEALTH_QUERY_PATH,
  OG_PHOTO_HEALTH_WINDOW_LABEL,
  ogPhotoHealthRefetchInterval,
  summarizeOgPhotoHealth,
  type OgPhotoHealthResponse,
} from "@/lib/og-photo-health-view"
import type { OgPhotoPreflightWindow } from "@/lib/og-photo-preflight-snapshot"

/**
 * Logika strip kesehatan preflight foto OG.
 *
 * Dua hal di sini terlalu mahal untuk salah: verdict yang dirender dengan warna
 * "aman" adalah laporan yang berbohong, dan poling yang sama cepatnya di semua
 * keadaan berarti menambah trafik ke database tanpa menambah pengetahuan.
 *
 * Laporan uji diambil dari modul preflight yang sungguhan (bukan objek literal)
 * supaya perubahan bentuk laporan muncul sebagai kegagalan di sini, bukan
 * sebagai `undefined` yang dirender jadi "NaN" di dashboard.
 */

const now = Date.UTC(2026, 9, 12, 4, 0, 0)

function okResponse(): Response {
  return new Response(null, { status: 200 })
}

function rejectedResponse(status: number): Response {
  return new Response(null, { status })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  __resetOgPhotoPreflight()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const EMPTY_WINDOW: OgPhotoPreflightWindow = {
  windowMs: 3_600_000,
  since: new Date(now - 3_600_000).toISOString(),
  instances: 2,
  snapshots: 12,
  attempts: { total: 40, reachable: 38, unreachable: 2 },
  failures: { total: 2, byReason: { http: 1, timeout: 0, network: 1 } },
  alerts: { raised: 1, cleared: 1 },
  cache: { servedFromCache: 30, dedupedInFlight: 2 },
}

/** Laporan lengkap seperti yang dibalas endpoint admin. */
function healthResponse(
  overrides: Partial<OgPhotoHealthResponse> = {}
): OgPhotoHealthResponse {
  return {
    ...ogPhotoPreflightReport(now),
    windowLabel: OG_PHOTO_HEALTH_WINDOW_LABEL,
    aggregate: EMPTY_WINDOW,
    aggregateError: null,
    snapshotFlush: "written",
    ...overrides,
  }
}

async function driveFailure(path: string): Promise<void> {
  fetchMock.mockResolvedValueOnce(rejectedResponse(404))
  await isImageReachable(`https://cdn-uji.example/${path}`, now)
}

async function driveSuccess(path: string): Promise<void> {
  fetchMock.mockResolvedValueOnce(okResponse())
  await isImageReachable(`https://cdn-uji.example/${path}`, now)
}

describe("poling strip kesehatan", () => {
  it("melambat saat sehat dan merapat saat foto hilang", async () => {
    // Belum ada data: tidak ada yang bisa diklaim, tapi tetap dipantau.
    const unknownInterval = ogPhotoHealthRefetchInterval(undefined)
    expect(unknownInterval).toBe(60_000)

    await driveSuccess("satu.png")
    const healthyInterval = ogPhotoHealthRefetchInterval(healthResponse())

    await driveFailure("dua.png")
    await driveSuccess("tiga.png")
    const degradedInterval = ogPhotoHealthRefetchInterval(healthResponse())

    await driveFailure("empat.png")
    await driveFailure("lima.png")
    const failingInterval = ogPhotoHealthRefetchInterval(healthResponse())

    // Urutannya yang penting, bukan angkanya: makin rusak makin sering.
    expect(failingInterval).toBeLessThan(degradedInterval)
    expect(degradedInterval).toBeLessThan(healthyInterval)
    expect(healthyInterval).toBeLessThanOrEqual(5 * 60_000)

    // Tidak pernah berhenti memantau: `false` akan berarti masalah berikutnya
    // tidak pernah muncul sampai halaman dimuat ulang.
    for (const interval of [
      unknownInterval,
      healthyInterval,
      degradedInterval,
      failingInterval,
    ]) {
      expect(interval).toBeGreaterThan(0)
    }
  })
})

describe("ringkasan strip kesehatan", () => {
  it("belum ada percobaan bukan berarti sehat", () => {
    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.verdict).toBe("unknown")
    expect(summary.tone).toBe("muted")
    expect(summary.verdictLabel).toContain("Belum ada data")
    expect(summary.headline).toContain("Belum ada kartu")
  })

  it("menandai foto yang hilang sebagai bahaya, bukan peringatan biasa", async () => {
    await driveFailure("satu.png")
    await driveFailure("dua.png")

    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.verdict).toBe("failing")
    expect(summary.tone).toBe("destructive")
    expect(summary.headline).toContain("tanpa foto")
    expect(summary.headline).toContain("2 dari 2 percobaan gagal")
  })

  it("memisahkan \"sempat gagal\" dari \"sedang gagal\"", async () => {
    await driveFailure("satu.png")
    await driveSuccess("dua.png")

    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.verdict).toBe("degraded")
    expect(summary.tone).toBe("warning")
    expect(summary.headline).toContain("Percobaan terakhir berhasil")
  })

  it("selalu menampilkan ketiga alasan, termasuk yang bernilai nol", async () => {
    await driveFailure("satu.png")

    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.reasons.map((reason) => reason.reason)).toEqual([
      "http",
      "timeout",
      "network",
    ])
    expect(summary.reasons.map((reason) => reason.count)).toEqual([1, 0, 0])
    expect(summary.reasons[0].label).toBe("CDN menolak")
  })

  it("menyebut alert yang sedang berjalan dan host teratas", async () => {
    fetchMock.mockResolvedValue(rejectedResponse(503))
    await isImageReachable("https://cdn-bermasalah.example/a.png", now)
    await isImageReachable("https://cdn-bermasalah.example/b.png", now)

    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.alertLabel).toContain("ALERT aktif sejak")
    expect(summary.alertLabel).toContain("2 kegagalan berurutan")
    expect(summary.topHost).toBe("cdn-bermasalah.example — 2×")
  })

  it("tidak menampilkan alert saat tidak ada episode", async () => {
    await driveSuccess("satu.png")

    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.alertLabel).toBeNull()
    expect(summary.topHost).toBeNull()
    expect(summary.headline).toContain("1 percobaan berhasil")
  })

  it("meringkas jendela dari beberapa instance", () => {
    const summary = summarizeOgPhotoHealth(healthResponse())

    expect(summary.windowLabel).toBe("1h")
    expect(summary.windowSummaryLabel).toBe(
      "12 snapshot dari 2 instance · 40 percobaan · 2 gagal"
    )
    expect(summary.windowError).toBeNull()
  })

  it("membedakan riwayat kosong dari riwayat yang gagal dibaca", () => {
    const emptyHistory = summarizeOgPhotoHealth(
      healthResponse({
        aggregate: { ...EMPTY_WINDOW, instances: 0, snapshots: 0 },
      })
    )
    expect(emptyHistory.windowSummaryLabel).toContain("Belum ada riwayat")

    const brokenHistory = summarizeOgPhotoHealth(
      healthResponse({ aggregate: null, aggregateError: "Mongo tidak terjangkau" })
    )
    expect(brokenHistory.windowLabel).toBeNull()
    expect(brokenHistory.windowSummaryLabel).toBeNull()
    expect(brokenHistory.windowError).toBe("Mongo tidak terjangkau")
  })
})

describe("tautan laporan strip kesehatan", () => {
  it("memakai jendela yang sama untuk ringkasan dan laporan teks", () => {
    expect(OG_PHOTO_HEALTH_QUERY_PATH).toContain(
      `window=${OG_PHOTO_HEALTH_WINDOW_LABEL}`
    )
    expect(OG_PHOTO_HEALTH_DETAIL_PATH).toContain(
      `window=${OG_PHOTO_HEALTH_WINDOW_LABEL}`
    )
    expect(OG_PHOTO_HEALTH_DETAIL_PATH).toContain("format=text")
  })
})
