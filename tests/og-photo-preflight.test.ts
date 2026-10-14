import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  __resetOgPhotoPreflight,
  ALERT_CONSECUTIVE_FAILURES,
  DEGRADED_WINDOW_MS,
  formatOgPhotoPreflightReportText,
  isImageReachable,
  MAX_RECENT_FAILURES,
  ogPhotoPreflightReport,
} from "@/lib/og-photo-preflight"

/**
 * Hitungan kegagalan preflight foto kartu OG.
 *
 * Kenapa ada: kartu dengan foto yang gagal diambil tetap membalas HTTP 200
 * berisi PNG sah — panelnya cuma berisi monogram. Tidak ada error rate, tidak
 * ada halaman rusak, tidak ada satu pun metrik yang bergerak; kehilangan foto
 * hanya terlihat kalau ada yang membaca log. Hitungan inilah yang membuatnya
 * terbaca sebagai angka.
 *
 * `fetch` diganti stub supaya setiap jenis kegagalan (CDN menolak, timeout,
 * DNS mati) bisa dipaksa deterministik tanpa jaringan — termasuk timeout, yang
 * kalau diuji sungguhan berarti menunggu 8 detik per kasus.
 */

const PHOTO_URL = "https://images.unsplash.com/foto-penyedia.jpg"
const AVATAR_URL = "https://i.pravatar.cc/300?img=12"
const OTHER_URL = "https://cdn-contoh.example/foto-hilang.png"

function okResponse(status = 200): Response {
  return new Response(null, { status })
}

function rejectedResponse(status: number): Response {
  return new Response(null, { status })
}

/** `AbortSignal.timeout` melempar DOMException bernama TimeoutError. */
function timeoutError(): Error {
  return Object.assign(
    new Error("The operation was aborted due to timeout"),
    { name: "TimeoutError" }
  )
}

/** Kegagalan jaringan asli: pesannya "fetch failed", kodenya ada di `cause`. */
function networkError(code: string): Error {
  return new Error("fetch failed", {
    cause: Object.assign(new Error(`getaddrinfo ${code}`), { code }),
  })
}

let fetchMock: ReturnType<typeof vi.fn>
let warn: ReturnType<typeof vi.spyOn>
let info: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  __resetOgPhotoPreflight()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  // Kegagalan sengaja dipicu di sini; log per kegagalan sudah diuji di
  // og-card-photo — yang diuji di sini adalah baris ALERT/ALERT-CLEARED.
  warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  info = vi.spyOn(console, "info").mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
  info.mockRestore()
  vi.unstubAllGlobals()
})

describe("hitungan preflight foto OG", () => {
  it("menghitung percobaan, bukan pemakaian cache", async () => {
    fetchMock.mockResolvedValue(okResponse())
    const now = Date.now()

    await isImageReachable(PHOTO_URL, now)
    await isImageReachable(PHOTO_URL, now + 1)
    await isImageReachable(PHOTO_URL, now + 2)

    const report = ogPhotoPreflightReport(now + 3)

    // Tiga render, satu HEAD: angka "percobaan" harus mencerminkan beban nyata
    // ke CDN, bukan jumlah permintaan kartu.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(report.attempts).toEqual({ total: 1, reachable: 1, unreachable: 0 })
    expect(report.cache.servedFromCache).toBe(2)
    expect(report.verdict).toBe("healthy")
    expect(report.failures.total).toBe(0)
  })

  it("tidak mengubah percobaan saat permintaan bersamaan berbagi satu HEAD", async () => {
    let releaseFetch: (response: Response) => void = () => {}
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          releaseFetch = resolve
        })
    )

    const pending = [
      isImageReachable(AVATAR_URL),
      isImageReachable(AVATAR_URL),
      isImageReachable(AVATAR_URL),
    ]
    releaseFetch(okResponse())
    await expect(Promise.all(pending)).resolves.toEqual([true, true, true])

    const report = ogPhotoPreflightReport()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(report.cache.dedupedInFlight).toBe(2)
    expect(report.attempts.total).toBe(1)
  })

  it("memisahkan alasan http, timeout, dan network beserta status HTTP-nya", async () => {
    fetchMock.mockResolvedValueOnce(rejectedResponse(404))
    await expect(isImageReachable(PHOTO_URL)).resolves.toBe(false)

    fetchMock.mockRejectedValueOnce(networkError("ENOTFOUND"))
    await expect(isImageReachable(AVATAR_URL)).resolves.toBe(false)

    fetchMock.mockRejectedValueOnce(timeoutError())
    await expect(isImageReachable(OTHER_URL)).resolves.toBe(false)

    const report = ogPhotoPreflightReport()

    // Tiga alasan berbeda dengan penanganan berbeda: 404 berarti URL-nya yang
    // salah, timeout berarti CDN lambat, network berarti host tidak ada.
    expect(report.failures.byReason).toEqual({
      http: 1,
      timeout: 1,
      network: 1,
    })
    expect(report.failures.byStatus).toEqual({ "404": 1 })
    expect(report.attempts).toEqual({ total: 3, reachable: 0, unreachable: 3 })
    expect(report.verdict).toBe("failing")
    expect(report.lifetime.lastFailureAt).not.toBeNull()

    // Kode penyebab asli ikut tersimpan, bukan hanya "fetch failed".
    const networkFailure = report.recentFailures.find(
      (failure) => failure.reason === "network"
    )
    expect(networkFailure?.error).toMatch(/ENOTFOUND/)
    expect(networkFailure?.host).toBe("i.pravatar.cc")
  })

  it("merangkum per host dan membatasi kegagalan yang disimpan", async () => {
    const failuresForFirstHost = MAX_RECENT_FAILURES + 3

    // URL berbeda tiap kali: cache kegagalan per URL tidak boleh menyerap
    // percobaan berikutnya, jika tidak hitungannya mengukur hal lain.
    for (let i = 0; i < failuresForFirstHost; i++) {
      fetchMock.mockResolvedValueOnce(rejectedResponse(500))
      await isImageReachable(`https://cdn-a.example/foto-${i}.png`)
    }

    fetchMock.mockResolvedValueOnce(rejectedResponse(503))
    await isImageReachable(AVATAR_URL)

    const report = ogPhotoPreflightReport()

    expect(report.failures.total).toBe(failuresForFirstHost + 1)
    expect(report.failures.byStatus).toEqual({
      "500": failuresForFirstHost,
      "503": 1,
    })
    expect(report.failingHosts).toEqual([
      expect.objectContaining({
        host: "cdn-a.example",
        failures: failuresForFirstHost,
      }),
      expect.objectContaining({ host: "i.pravatar.cc", failures: 1 }),
    ])

    // Hanya kegagalan terakhir yang disimpan utuh; totalnya tetap utuh.
    expect(report.recentFailures).toHaveLength(MAX_RECENT_FAILURES)
    expect(report.recentFailures[0].host).toBe("i.pravatar.cc")
  })

  it("memulihkan verdict setelah jendela degradasi lewat", async () => {
    fetchMock.mockResolvedValueOnce(rejectedResponse(500))
    await isImageReachable(PHOTO_URL)

    fetchMock.mockResolvedValueOnce(okResponse())
    await isImageReachable(AVATAR_URL)

    const now = Date.now()

    // Terakhir berhasil, tapi kegagalannya baru saja: layak dilihat.
    expect(ogPhotoPreflightReport(now).verdict).toBe("degraded")
    // Kegagalan itu sudah lewat jendela: tidak lagi menahan status.
    expect(ogPhotoPreflightReport(now + DEGRADED_WINDOW_MS + 1).verdict).toBe(
      "healthy"
    )
  })

  it("melaporkan unknown sebelum ada percobaan sama sekali", () => {
    const report = ogPhotoPreflightReport()

    expect(report.verdict).toBe("unknown")
    expect(report.attempts.total).toBe(0)
    expect(report.lifetime.lastFailureAt).toBeNull()
    expect(report.lifetime.msSinceLastFailure).toBeNull()
  })

  it("hanya memuat keadaan satu proses dan bisa di-serialisasi JSON", async () => {
    fetchMock.mockResolvedValueOnce(rejectedResponse(403))
    await isImageReachable(PHOTO_URL)

    const report = ogPhotoPreflightReport()

    // Tanpa scope yang jujur, angka satu instance mudah dibaca sebagai total
    // platform.
    expect(report.scope).toBe("process")
    // Map yang lolos ke laporan akan hilang saat di-serialisasi — endpoint
    // mengembalikan JSON, jadi bentuknya harus bertahan lewat JSON.
    expect(JSON.parse(JSON.stringify(report))).toEqual(report)
  })
})

describe("alert preflight foto OG", () => {
  /** Baris `[og/foto][ALERT]` — marker yang dipakai monitoring untuk memicu. */
  function alertCalls(): unknown[][] {
    return warn.mock.calls.filter(([message]) =>
      String(message).includes("[og/foto][ALERT]")
    )
  }

  /** Baris pemulihan; dipisah karena channel-nya berbeda dari peringatan. */
  function clearedCalls(): unknown[][] {
    return info.mock.calls.filter(([message]) =>
      String(message).includes("[og/foto][ALERT-CLEARED]")
    )
  }

  it("menaikkan satu alert setelah dua kegagalan berurutan, bukan tiap kegagalan", async () => {
    fetchMock.mockResolvedValue(rejectedResponse(503))

    for (let i = 0; i < 5; i++) {
      await isImageReachable(`https://cdn-bermasalah.example/foto-${i}.png`)
    }

    // Lima kartu tanpa foto, tapi monitoring hanya dipicu sekali: alarm yang
    // berdentang lima kali untuk satu penyebab akan diabaikan.
    expect(alertCalls()).toHaveLength(1)
    expect(clearedCalls()).toHaveLength(0)

    // Payload-nya adalah potret saat alert dinaikkan — tepat di ambang. Kalau
    // angkanya 5 di sini, berarti alert-nya cuma menumpang pembacaan laporan
    // terakhir dan bukan sinyal tersendiri saat masalahnya mulai.
    const [, payload] = alertCalls()[0] as [string, Record<string, unknown>]
    expect(payload).toMatchObject({
      consecutiveFailures: ALERT_CONSECUTIVE_FAILURES,
      topFailingHost: {
        host: "cdn-bermasalah.example",
        failures: ALERT_CONSECUTIVE_FAILURES,
      },
      failures: { http: ALERT_CONSECUTIVE_FAILURES, timeout: 0, network: 0 },
    })

    const report = ogPhotoPreflightReport()
    expect(report.alerts).toMatchObject({
      raised: 1,
      cleared: 0,
      consecutiveFailures: 5,
      threshold: ALERT_CONSECUTIVE_FAILURES,
    })
    expect(report.alerts.activeSince).not.toBeNull()
    // Hitungan tetap utuh sampai kelima kegagalan; yang dibatasi hanya
    // frekuensi alert-nya.
    expect(report.failingHosts[0]).toEqual(
      expect.objectContaining({ host: "cdn-bermasalah.example", failures: 5 })
    )
  })

  it("tidak bereaksi pada kegagalan terisolasi dan melaporkan pemulihan sekali", async () => {
    fetchMock.mockResolvedValueOnce(rejectedResponse(500))
    await isImageReachable("https://cdn-uji.example/satu.png")
    fetchMock.mockResolvedValueOnce(okResponse())
    await isImageReachable("https://cdn-uji.example/dua.png")

    // Satu kegagalan lalu sukses: tidak ada episode, jadi tidak ada satu pun
    // baris alert — termasuk tidak ada baris "pulih" palsu.
    expect(alertCalls()).toHaveLength(0)
    expect(clearedCalls()).toHaveLength(0)

    fetchMock.mockResolvedValue(rejectedResponse(500))
    await isImageReachable("https://cdn-uji.example/tiga.png")
    await isImageReachable("https://cdn-uji.example/empat.png")
    expect(alertCalls()).toHaveLength(1)

    fetchMock.mockResolvedValueOnce(okResponse())
    await isImageReachable("https://cdn-uji.example/lima.png")

    expect(clearedCalls()).toHaveLength(1)
    const [, payload] = clearedCalls()[0] as [string, Record<string, unknown>]
    expect(payload).toMatchObject({ failuresInStreak: 2 })
    expect(Number(payload.alertDurationMs)).toBeGreaterThanOrEqual(0)

    expect(ogPhotoPreflightReport().alerts).toEqual({
      raised: 1,
      cleared: 1,
      activeSince: null,
      consecutiveFailures: 0,
      threshold: ALERT_CONSECUTIVE_FAILURES,
    })
  })

  it("memakai kegagalan sebagai bukti, bukan pemakaian cache", async () => {
    const url = "https://cdn-cache.example/satu.png"
    fetchMock.mockResolvedValue(rejectedResponse(500))

    await isImageReachable(url)
    // Dua render berikutnya dilayani cache: tidak ada HEAD baru, jadi tidak ada
    // bukti baru. Kalau pemakaian cache ikut menaikkan rentetan, alert akan
    // menyala hanya karena ramai.
    await isImageReachable(url)
    await isImageReachable(url)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(alertCalls()).toHaveLength(0)
  })

  it("menaikkan episode baru setelah pemulihan", async () => {
    fetchMock.mockResolvedValue(rejectedResponse(502))
    await isImageReachable("https://cdn-berulang.example/a.png")
    await isImageReachable("https://cdn-berulang.example/b.png")

    fetchMock.mockResolvedValueOnce(okResponse())
    await isImageReachable("https://cdn-berulang.example/c.png")

    fetchMock.mockResolvedValue(rejectedResponse(502))
    await isImageReachable("https://cdn-berulang.example/d.png")
    await isImageReachable("https://cdn-berulang.example/e.png")

    expect(alertCalls()).toHaveLength(2)
    expect(clearedCalls()).toHaveLength(1)
    expect(ogPhotoPreflightReport().alerts).toMatchObject({
      raised: 2,
      cleared: 1,
    })
  })
})

describe("ringkasan teks preflight foto OG", () => {
  it("menyebut status, alasan, host, dan kegagalan terakhir", async () => {
    fetchMock.mockResolvedValueOnce(rejectedResponse(404))
    await isImageReachable(PHOTO_URL)

    fetchMock.mockRejectedValueOnce(networkError("ECONNREFUSED"))
    await isImageReachable(AVATAR_URL)

    const text = formatOgPhotoPreflightReportText(ogPhotoPreflightReport())

    expect(text).toContain("status: failing")
    expect(text).toContain("cakupan: satu proses")
    expect(text).toContain("percobaan: 2 (0 berhasil, 2 gagal)")
    expect(text).toContain("alert: AKTIF sejak")
    expect(text).toContain("alasan: http 1 · timeout 0 · network 1")
    expect(text).toContain("status HTTP: 404 ×1")
    expect(text).toContain("host yang gagal:")
    expect(text).toContain("2 kegagalan terakhir:")

    const failureLines = text
      .split("\n")
      .filter((line) => /^\s{4}\d{4}-/.test(line))
    expect(failureLines).toHaveLength(2)
    expect(failureLines[0]).toMatch(
      /i\.pravatar\.cc fetch failed \(ECONNREFUSED\)$/
    )
    expect(failureLines[1]).toMatch(/404 \d+ms images\.unsplash\.com$/)
  })
})
