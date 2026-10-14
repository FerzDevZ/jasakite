import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Penyimpanan delta hitungan preflight foto OG.
 *
 * Kenapa diuji: hitungan di memori satu proses belum berguna sebagai angka
 * produksi — setiap redeploy mengembalikannya ke `unknown`, dan di
 * multi-instance tiap instance hanya melaporkan bagiannya. Yang diuji di sini
 * adalah sifat-sifat yang membuat lapisan penyimpanan itu layak dipercaya:
 * delta tidak boleh dilaporkan dua kali, kegagalan menulis tidak boleh
 * menghapus bukti, trafik sehat tidak boleh menulis tiap render, dan jendela
 * yang diminta tidak boleh diam-diam diganti jendela lain.
 *
 * Waktu selalu disuntik (`now`), jadi throttle dan retensi diuji tanpa menunggu
 * menit nyata berlalu.
 */

const fakePrisma = vi.hoisted(() => ({
  ogPhotoPreflightSnapshot: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma, default: fakePrisma }))

import {
  __resetOgPhotoPreflight,
  ALERT_CONSECUTIVE_FAILURES,
  isImageReachable,
  ogPhotoPreflightDelta,
} from "@/lib/og-photo-preflight"
import {
  __resetOgPhotoPreflightSnapshotStore,
  formatOgPhotoPreflightWindowText,
  OG_PREFLIGHT_WINDOW_LABELS,
  readOgPhotoPreflightWindow,
  resolveOgPhotoPreflightWindow,
  SNAPSHOT_FLUSH_INTERVAL_MS,
  SNAPSHOT_RETENTION_MS,
  flushOgPhotoPreflightSnapshot,
} from "@/lib/og-photo-preflight-snapshot"

const PHOTO_URL = "https://images.unsplash.com/foto-layanan.jpg"
const now = Date.UTC(2026, 9, 12, 3, 0, 0)

function okResponse(): Response {
  return new Response(null, { status: 200 })
}

function rejectedResponse(status: number): Response {
  return new Response(null, { status })
}

let fetchMock: ReturnType<typeof vi.fn>
let warn: ReturnType<typeof vi.spyOn>
let error: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  __resetOgPhotoPreflight()
  __resetOgPhotoPreflightSnapshotStore()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  error = vi.spyOn(console, "error").mockImplementation(() => {})

  fakePrisma.ogPhotoPreflightSnapshot.create.mockReset()
  fakePrisma.ogPhotoPreflightSnapshot.create.mockResolvedValue({
    id: "snapshot-1",
  })
  fakePrisma.ogPhotoPreflightSnapshot.findMany.mockReset()
  fakePrisma.ogPhotoPreflightSnapshot.findMany.mockResolvedValue([])
  fakePrisma.ogPhotoPreflightSnapshot.deleteMany.mockReset()
  fakePrisma.ogPhotoPreflightSnapshot.deleteMany.mockResolvedValue({ count: 0 })
})

afterEach(() => {
  warn.mockRestore()
  error.mockRestore()
  vi.unstubAllGlobals()
})

/** Satu percobaan preflight yang gagal, di URL yang belum pernah dilihat. */
async function failOnePreflight(path: string): Promise<void> {
  fetchMock.mockResolvedValueOnce(rejectedResponse(503))
  await isImageReachable(`https://cdn-uji.example/${path}`)
}

/** Satu percobaan preflight yang berhasil. */
async function succeedOnePreflight(path: string): Promise<void> {
  fetchMock.mockResolvedValueOnce(okResponse())
  await isImageReachable(`https://cdn-uji.example/${path}`)
}

describe("flush snapshot preflight foto OG", () => {
  it("tidak menyentuh database saat tidak ada trafik baru", async () => {
    // Kartu sehat yang dilayani cache tidak menghasilkan percobaan baru: tidak
    // ada yang perlu ditulis, dan menulis baris nol hanya menumbuhkan koleksi.
    await expect(flushOgPhotoPreflightSnapshot(now)).resolves.toEqual({
      status: "skipped",
    })
    expect(fakePrisma.ogPhotoPreflightSnapshot.create).not.toHaveBeenCalled()
  })

  it("menulis delta lengkap dan menandainya sudah dilaporkan", async () => {
    await failOnePreflight("satu.png")

    await expect(flushOgPhotoPreflightSnapshot(now)).resolves.toEqual({
      status: "written",
      snapshotId: "snapshot-1",
    })

    expect(fakePrisma.ogPhotoPreflightSnapshot.create).toHaveBeenCalledTimes(1)
    const [{ data }] = fakePrisma.ogPhotoPreflightSnapshot.create.mock.calls[0]

    expect(data).toMatchObject({
      attempts: 1,
      reachable: 0,
      unreachable: 1,
      failuresHttp: 1,
      failuresTimeout: 0,
      failuresNetwork: 0,
      servedFromCache: 0,
      dedupedInFlight: 0,
      alertsRaised: 0,
      alertsCleared: 0,
      capturedAt: new Date(now),
    })
    expect(typeof data.instanceId).toBe("string")
    expect(data.instanceId.length).toBeGreaterThan(0)

    // Bagian yang sudah dilaporkan tidak boleh terangkat lagi pada flush
    // berikutnya — kalau tidak, angka jendela jadi lipat dua setiap menit.
    expect(ogPhotoPreflightDelta().attempts).toBe(0)
    await expect(flushOgPhotoPreflightSnapshot(now + 1_000)).resolves.toEqual({
      status: "skipped",
    })
  })

  it("menahan trafik sehat sampai satu menit, tapi menulis segera saat ada kegagalan", async () => {
    await succeedOnePreflight("satu.png")
    await expect(flushOgPhotoPreflightSnapshot(now)).resolves.toMatchObject({
      status: "written",
    })

    await succeedOnePreflight("dua.png")
    await expect(
      flushOgPhotoPreflightSnapshot(now + SNAPSHOT_FLUSH_INTERVAL_MS - 1)
    ).resolves.toEqual({ status: "throttled" })
    expect(fakePrisma.ogPhotoPreflightSnapshot.create).toHaveBeenCalledTimes(1)

    // Delta yang tertahan tidak hilang: kegagalan berikutnya menulisnya
    // sekaligus, bukan menghapusnya.
    await failOnePreflight("tiga.png")
    await expect(
      flushOgPhotoPreflightSnapshot(now + SNAPSHOT_FLUSH_INTERVAL_MS - 1)
    ).resolves.toMatchObject({ status: "written" })

    const [{ data }] = fakePrisma.ogPhotoPreflightSnapshot.create.mock.calls[1]
    expect(data).toMatchObject({
      attempts: 2,
      reachable: 1,
      unreachable: 1,
      failuresHttp: 1,
    })

    // Setelah satu menit penuh sejak tulisan terakhir, trafik sehat pun ditulis.
    await succeedOnePreflight("empat.png")
    await expect(
      flushOgPhotoPreflightSnapshot(now + 2 * SNAPSHOT_FLUSH_INTERVAL_MS + 1)
    ).resolves.toMatchObject({ status: "written" })
  })

  it("mengembalikan delta yang gagal ditulis supaya tidak hilang", async () => {
    fakePrisma.ogPhotoPreflightSnapshot.create.mockRejectedValueOnce(
      new Error("Mongo tidak terjangkau")
    )

    await failOnePreflight("satu.png")
    await expect(flushOgPhotoPreflightSnapshot(now)).resolves.toEqual({
      status: "failed",
      error: "Mongo tidak terjangkau",
    })

    // Delta masih tertahan di memori: percobaan berikutnya membawanya lagi.
    expect(ogPhotoPreflightDelta()).toMatchObject({ attempts: 1, unreachable: 1 })

    await succeedOnePreflight("dua.png")
    await expect(flushOgPhotoPreflightSnapshot(now + 1)).resolves.toMatchObject({
      status: "written",
    })

    const [{ data }] = fakePrisma.ogPhotoPreflightSnapshot.create.mock.calls[1]
    expect(data).toMatchObject({
      attempts: 2,
      reachable: 1,
      unreachable: 1,
    })
  })

  it("membawa episode alert ke dalam snapshot", async () => {
    fetchMock.mockResolvedValue(rejectedResponse(500))

    for (let i = 0; i < ALERT_CONSECUTIVE_FAILURES; i++) {
      await isImageReachable(`https://cdn-alert.example/${i}.png`)
    }

    await flushOgPhotoPreflightSnapshot(now)

    const [{ data }] = fakePrisma.ogPhotoPreflightSnapshot.create.mock.calls[0]
    expect(data).toMatchObject({
      attempts: ALERT_CONSECUTIVE_FAILURES,
      unreachable: ALERT_CONSECUTIVE_FAILURES,
      alertsRaised: 1,
    })
  })

  it("membersihkan snapshot yang lebih tua dari masa retensi tanpa menggagalkan flush", async () => {
    await failOnePreflight("satu.png")
    const flushAt = now + SNAPSHOT_RETENTION_MS + 1

    await expect(flushOgPhotoPreflightSnapshot(flushAt)).resolves.toMatchObject({
      status: "written",
    })

    expect(
      fakePrisma.ogPhotoPreflightSnapshot.deleteMany
    ).toHaveBeenCalledTimes(1)
    const [{ where }] = fakePrisma.ogPhotoPreflightSnapshot.deleteMany.mock
      .calls[0]
    expect(where).toEqual({
      capturedAt: { lt: new Date(flushAt - SNAPSHOT_RETENTION_MS) },
    })

    // Pembersihan hanya sesekali: flush berikutnya tidak menghapus lagi.
    await failOnePreflight("dua.png")
    await flushOgPhotoPreflightSnapshot(flushAt + 1_000)
    expect(fakePrisma.ogPhotoPreflightSnapshot.deleteMany).toHaveBeenCalledTimes(
      1
    )

    // Kegagalan pembersihan bukan kegagalan penyimpanan data.
    fakePrisma.ogPhotoPreflightSnapshot.deleteMany.mockRejectedValueOnce(
      new Error("hapus gagal")
    )
    await failOnePreflight("tiga.png")
    await expect(
      flushOgPhotoPreflightSnapshot(flushAt + 2 * 60 * 60 * 1_000)
    ).resolves.toMatchObject({ status: "written" })
    expect(error).toHaveBeenCalled()
  })
})

describe("jendela agregat preflight foto OG", () => {
  function snapshotRow(overrides: Record<string, unknown>) {
    return {
      id: "snapshot",
      instanceId: "instance-a",
      capturedAt: new Date(now),
      attempts: 0,
      reachable: 0,
      unreachable: 0,
      failuresHttp: 0,
      failuresTimeout: 0,
      failuresNetwork: 0,
      servedFromCache: 0,
      dedupedInFlight: 0,
      alertsRaised: 0,
      alertsCleared: 0,
      ...overrides,
    }
  }

  it("menjumlahkan seluruh instance di jendela dan menyaring batasnya", async () => {
    fakePrisma.ogPhotoPreflightSnapshot.findMany.mockResolvedValue([
      snapshotRow({
        instanceId: "instance-a",
        attempts: 10,
        reachable: 9,
        unreachable: 1,
        failuresHttp: 1,
        servedFromCache: 4,
        alertsRaised: 1,
      }),
      snapshotRow({
        instanceId: "instance-a",
        attempts: 5,
        reachable: 5,
        servedFromCache: 2,
        dedupedInFlight: 3,
      }),
      snapshotRow({
        instanceId: "instance-b",
        attempts: 3,
        unreachable: 3,
        failuresNetwork: 3,
        alertsRaised: 1,
        alertsCleared: 1,
      }),
    ])

    const window = await readOgPhotoPreflightWindow(
      OG_PREFLIGHT_WINDOW_LABELS["1h"],
      now
    )

    expect(fakePrisma.ogPhotoPreflightSnapshot.findMany).toHaveBeenCalledWith({
      where: { capturedAt: { gte: new Date(now - OG_PREFLIGHT_WINDOW_LABELS["1h"]) } },
    })

    expect(window).toMatchObject({
      windowMs: OG_PREFLIGHT_WINDOW_LABELS["1h"],
      instances: 2,
      snapshots: 3,
      attempts: { total: 18, reachable: 14, unreachable: 4 },
      failures: { total: 4, byReason: { http: 1, timeout: 0, network: 3 } },
      alerts: { raised: 2, cleared: 1 },
      cache: { servedFromCache: 6, dedupedInFlight: 3 },
    })
    expect(window.since).toBe(new Date(now - OG_PREFLIGHT_WINDOW_LABELS["1h"]).toISOString())
  })

  it("melaporkan jendela kosong apa adanya, bukan sebagai sehat", async () => {
    fakePrisma.ogPhotoPreflightSnapshot.findMany.mockResolvedValue([])

    const window = await readOgPhotoPreflightWindow(OG_PREFLIGHT_WINDOW_LABELS["24h"], now)
    const text = formatOgPhotoPreflightWindowText(window)

    expect(window.instances).toBe(0)
    expect(window.attempts.total).toBe(0)
    expect(text).toContain("belum ada snapshot tersimpan")
    expect(text).toContain("Jendela 24 jam terakhir")
  })

  it("menyebut jumlah instance dan ringkasan alasan dalam teks", async () => {
    fakePrisma.ogPhotoPreflightSnapshot.findMany.mockResolvedValue([
      snapshotRow({
        instanceId: "instance-a",
        attempts: 2,
        unreachable: 2,
        failuresTimeout: 2,
        alertsRaised: 1,
      }),
    ])

    const text = formatOgPhotoPreflightWindowText(
      await readOgPhotoPreflightWindow(OG_PREFLIGHT_WINDOW_LABELS["6h"], now)
    )

    expect(text).toContain("1 instance, 1 snapshot tersimpan")
    expect(text).toContain("percobaan: 2 (0 berhasil, 2 gagal)")
    expect(text).toContain("timeout 2")
    expect(text).toContain("episode alert: 1 dinaikkan, 0 pulih")
  })
})

describe("resolusi jendela dari query", () => {
  it("memakai default saat parameter kosong", () => {
    for (const label of [null, "", "   "]) {
      expect(resolveOgPhotoPreflightWindow(label)).toEqual({
        ok: true,
        label: "1h",
        windowMs: OG_PREFLIGHT_WINDOW_LABELS["1h"],
      })
    }
  })

  it("menerima setiap label yang didukung", () => {
    for (const [label, windowMs] of Object.entries(OG_PREFLIGHT_WINDOW_LABELS)) {
      expect(resolveOgPhotoPreflightWindow(label)).toEqual({
        ok: true,
        label,
        windowMs,
      })
    }
  })

  it("menolak label tak dikenal alih-alih diam-diam memakai default", () => {
    const resolution = resolveOgPhotoPreflightWindow("2 jam")

    // Laporan yang menulis "1 jam" padahal pembacanya minta 24 jam adalah
    // laporan yang menyesatkan — lebih baik gagal terang-terangan.
    expect(resolution.ok).toBe(false)
    if (!resolution.ok) {
      expect(resolution.error).toContain("2 jam")
      expect(resolution.error).toContain("24h")
    }
  })
})
