import { beforeEach, describe, expect, it, vi } from "vitest"
import sharp from "sharp"

/**
 * Kartu OG halaman daftar jasa, diuji lewat render sungguhan.
 *
 * Hermetis: Prisma diganti klien palsu, jadi test ini tidak menyentuh database
 * maupun jaringan. Yang diperiksa bukan "fungsinya tidak melempar", melainkan
 * tiga hal yang menentukan kartu ini berguna: ukurannya tetap kartu share,
 * angkanya benar-benar dari agregat, dan QR di dalamnya terbaca utuh saat
 * dibaca kembali dari PNG.
 */

const fakePrisma = vi.hoisted(() => ({
  service: { count: vi.fn(), groupBy: vi.fn() },
  category: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma, default: fakePrisma }))

import ServicesOpengraphImage, * as listingRouteSegment from "@/app/services/opengraph-image"
import { SHARE_CARD_SIZE } from "@/components/og/share-card"
import { buildQrMatrix } from "@/lib/qr-matrix"
import { SITE_URL } from "@/lib/site-url"
import { readQrModules } from "./helpers/og-card-qr"
import { expectCardMatchesBaseline } from "./helpers/og-card-visual"

const PNG_MAGIC_HEX = "89504e470d0a1a0a"

const CATEGORY_GROUPS = [
  { categoryId: "cat-perbaikan", _count: { _all: 96 } },
  { categoryId: "cat-instalasi", _count: { _all: 58 } },
  { categoryId: "cat-kebersihan", _count: { _all: 41 } },
  { categoryId: "cat-les", _count: { _all: 22 } },
  { categoryId: "cat-pindahan", _count: { _all: 18 } },
]

const CATEGORY_ROWS = [
  { id: "cat-perbaikan", name: "Perbaikan Rumah" },
  { id: "cat-instalasi", name: "Instalasi" },
  { id: "cat-kebersihan", name: "Kebersihan" },
  { id: "cat-les", name: "Les Privat" },
  { id: "cat-pindahan", name: "Pindahan" },
]

async function renderListingCard(): Promise<Buffer> {
  const response = await ServicesOpengraphImage()
  return Buffer.from(await response.arrayBuffer())
}

beforeEach(() => {
  fakePrisma.service.count.mockReset()
  fakePrisma.service.groupBy.mockReset()
  fakePrisma.category.findMany.mockReset()

  fakePrisma.service.count.mockResolvedValue(247)
  fakePrisma.service.groupBy.mockResolvedValue(CATEGORY_GROUPS)
  fakePrisma.category.findMany.mockResolvedValue(CATEGORY_ROWS)
})

/**
 * Konfigurasi segmen rute seperti yang dibaca Next saat membangun: inilah yang
 * menentukan prerender, bukan komentar mana pun di berkas rutenya.
 */
type RouteSegmentConfig = { dynamic?: string; revalidate?: number | false }

describe("segmen rute kartu daftar jasa", () => {
  it("tidak boleh dipanggang statis oleh build", () => {
    const segment = listingRouteSegment as RouteSegmentConfig
    const selaluSegar = segment.dynamic === "force-dynamic"
    const punyaJendelaRevalidate =
      typeof segment.revalidate === "number" && segment.revalidate > 0

    // Terukur pada build produksi sebelum ini: PNG kartu tertulis ke
    // `.next/server/app/services/opengraph-image.body` dengan
    // `initialRevalidateSeconds: false`. Akibatnya angka jasa aktif di kartu
    // beku sampai deploy berikutnya, dan build yang berjalan tanpa database
    // membekukan kartu fallback (tanpa angka) secara permanen — tanpa error,
    // tanpa halaman rusak, dan tanpa satu pun permintaan runtime yang bisa
    // melaporkannya.
    expect(
      selaluSegar || punyaJendelaRevalidate,
      "Kartu /services kembali dipanggang statis: rutenya tidak punya `dynamic = \"force-dynamic\"` maupun `revalidate` berhingga, jadi Next mem-prerender angka jasa aktif saat build dan membekukannya. Setel salah satu di app/services/opengraph-image.tsx."
    ).toBe(true)
  })
})

describe("kebijakan cache kartu daftar jasa", () => {
  it("ditulis eksplisit, bukan bawaan kartu abadi milik Next", async () => {
    const cacheControl =
      (await ServicesOpengraphImage()).headers.get("cache-control") ?? ""

    // Bawaan Next untuk rute `opengraph-image` adalah
    // `public, immutable, no-transform, max-age=31536000` (terukur di
    // `next start`) — satu tahun untuk kartu yang isinya berubah setiap ada
    // jasa baru. Tanpa s-maxage, CDN Vercel juga tidak punya dasar untuk
    // menyimpan, jadi crawler yang datang bersamaan menembak agregat ke
    // database satu per satu.
    expect(cacheControl).not.toContain("immutable")

    const sMaxAgeSeconds = /s-maxage=(\d+)/.exec(cacheControl)?.[1]
    expect(
      sMaxAgeSeconds,
      `Tidak ada s-maxage di cache-control kartu ("${cacheControl}") — CDN Vercel menyimpan fungsi berdasarkan direktif ini, jadi tanpa itu setiap permintaan crawler menjadi kueri agregat ke MongoDB.`
    ).toBeDefined()
    expect(Number(sMaxAgeSeconds)).toBeGreaterThan(0)
    expect(Number(sMaxAgeSeconds)).toBeLessThanOrEqual(3600)

    // max-age=0: yang menahan kartu lama cukup CDN, bukan browser pengguna yang
    // tidak bisa dibersihkan dari sisi server.
    expect(/(?:^|[,\s])max-age=(\d+)/.exec(cacheControl)?.[1]).toBe("0")
  })
})

describe("kartu OG halaman daftar jasa", () => {
  it("dirender pada ukuran kartu share dengan angka dari agregat", async () => {
    const cardPng = await renderListingCard()

    expect(cardPng.subarray(0, 8).toString("hex")).toBe(PNG_MAGIC_HEX)
    const metadata = await sharp(cardPng).metadata()
    expect(metadata.width).toBe(SHARE_CARD_SIZE.width)
    expect(metadata.height).toBe(SHARE_CARD_SIZE.height)

    // Angka dihitung dari count/groupBy, bukan dari daftar yang dibatasi `take`
    // di halamannya.
    expect(fakePrisma.service.count).toHaveBeenCalledWith({
      where: { status: "ACTIVE" },
    })
    expect(fakePrisma.service.groupBy).toHaveBeenCalledWith({
      by: ["categoryId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    })
  })

  it("memuat QR halaman daftar yang modulnya terbaca utuh", async () => {
    const cardPng = await renderListingCard()
    const matrix = buildQrMatrix(`${SITE_URL}/services`)
    expect(matrix).not.toBeNull()
    if (!matrix) return

    const reading = await readQrModules(cardPng, matrix)

    expect(reading.mismatched).toBe(0)
    expect(reading.matched).toBe(reading.total)
  })

  it("tetap merender kartu sah saat agregasi gagal, dan tetap ber-QR", async () => {
    fakePrisma.service.count.mockRejectedValue(
      new Error("Mongo tidak terjangkau")
    )

    const cardPng = await renderListingCard()

    const metadata = await sharp(cardPng).metadata()
    expect(metadata.width).toBe(SHARE_CARD_SIZE.width)

    const matrix = buildQrMatrix(`${SITE_URL}/services`)
    if (!matrix) throw new Error("[og-listing] matriks QR uji tidak terbentuk")
    expect((await readQrModules(cardPng, matrix)).mismatched).toBe(0)
  })

  it("memakai kalimat merek, bukan angka nol, saat belum ada jasa aktif", async () => {
    fakePrisma.service.count.mockResolvedValue(0)
    fakePrisma.service.groupBy.mockResolvedValue([])
    fakePrisma.category.findMany.mockResolvedValue([])

    // 0 yang dirender besar di kartu share adalah klaim bahwa platform sedang
    // kosong; kalimat merek lebih jujur daripada nol yang menyesatkan.
    await expectCardMatchesBaseline(
      await renderListingCard(),
      "kartu-daftar-jasa-kosong.png"
    )
  }, 120_000)

  it("sama seperti baseline saat data terisi", async () => {
    await expectCardMatchesBaseline(
      await renderListingCard(),
      "kartu-daftar-jasa.png"
    )
  }, 120_000)
})
