import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import sharp from "sharp"

/**
 * Guard "kartu OG tidak kehilangan foto".
 *
 * Kartu share punya dua mode: panel foto berisi `<img>` (foto jasa / avatar
 * penyedia) atau fallback monogram. Keduanya mengembalikan HTTP 200 berisi PNG
 * yang sah — jadi status respons tidak pernah bisa membedakannya. Kegagalan
 * preflight foto (CDN menolak HEAD, host mati, URL rusak) karena itu pernah
 * lolos tanpa jejak: kartu tetap "berhasil" tapi tanpa foto, dan yang terlihat
 * orang di WhatsApp adalah monogram.
 *
 * Test ini menutup celah itu dengan mengukur piksel panelnya, bukan status:
 * pangsa warna dominan, lewat `tests/helpers/og-card-panel.ts`. Alat ukurnya
 * dipakai bersama — berikut alasan metriknya, ambangnya, dan crop-nya — supaya
 * test kartu yang berbeda tidak menyalin angka dan berakhir dengan ambang yang
 * berbeda-beda.
 *
 * Ada dua foto uji. Yang pertama berpola kotak-kotak 8px sehingga tidak ada satu
 * warna pun yang mendominasi. Yang kedua justru berlatar rata, karena itulah
 * bentuk paling dekat dengan panel monogram: angkanya di-assert supaya ambang
 * monogram tidak pernah diturunkan sampai menyentuh foto berlatar rata.
 *
 * Bagian terakhir membandingkan seluruh 1200×630 kartu dengan baseline PNG
 * (`tests/baselines/`, bandingkan lewat `tests/helpers/og-card-visual.ts`).
 * Pengukuran panel hanya melihat satu crop, jadi kolom teks yang bergeser,
 * judul yang tumpah, atau badge yang melebar lolos dari semua angka di atas —
 * hanya perbandingan penuh inilah yang menangkapnya.
 *
 * Bagian preflight menjaga sisi sebaliknya: kegagalan foto harus terlihat.
 * `isImageReachable` tidak boleh menelan error tanpa jejak (satu baris log per
 * percobaan), tidak boleh mengulang HEAD untuk URL yang sama selama cache-nya
 * masih segar, dan tidak boleh menghukum host yang gagal selamanya. Ketiganya
 * dibuktikan lewat server foto yang mencatat setiap permintaan — hasil balik
 * "true/false" saja tidak bisa membedakan cache bekerja dari kebetulan.
 *
 * Hermetis: Prisma diganti klien palsu dan foto disajikan server HTTP lokal di
 * port acak — tanpa database, tanpa jaringan luar. Dekode PNG memakai `sharp`,
 * yang sudah pasti terpasang sebagai optionalDependency `next` (dipakai Next
 * sendiri untuk optimasi gambar), jadi test ini tidak menambah dependensi baru.
 */

// Klien Prisma palsu. Argumen tiap query tetap diterima route, tapi nilainya
// ditentukan per kasus di bawah.
const fakePrisma = vi.hoisted(() => ({
  service: { findUnique: vi.fn(), count: vi.fn() },
  user: { findUnique: vi.fn() },
  review: { count: vi.fn(), aggregate: vi.fn() },
  // Sinyal kepercayaan di kartu dihitung dari pesanan COMPLETED; angka itu
  // harus berasal dari fake juga, kalau tidak kartunya jatuh ke jalur kegagalan
  // data dan test ini mengukur kartu fallback tanpa disadari.
  order: { count: vi.fn() },
  // Route kartu ikut menuliskan delta hitungan preflight ke penyimpanan; tanpa
  // model ini setiap render uji akan berakhir sebagai kegagalan penyimpanan di
  // log dan menutupi kegagalan yang benar-benar berarti.
  ogPhotoPreflightSnapshot: {
    create: vi.fn(async () => ({ id: "snapshot-uji" })),
    findMany: vi.fn(async () => []),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  },
}))

vi.mock("@/lib/prisma", () => ({ prisma: fakePrisma, default: fakePrisma }))

import ServiceOgImage from "@/app/service/[slug]/opengraph-image"
import ProviderOgImage from "@/app/provider/[id]/opengraph-image"
import { SHARE_CARD_SIZE } from "@/components/og/share-card"
import {
  __resetOgPhotoPreflight,
  isImageReachable,
  PHOTO_REACHABLE_TTL_MS,
  PHOTO_UNREACHABLE_TTL_MS,
} from "@/lib/og-photo-preflight"
import { SHARE_CARD_QR_PLATE_HEIGHT } from "@/lib/og-card"
import {
  dominantColorShare,
  measurePhotoPanelFlatShare,
  MONOGRAM_PANEL_MIN_FLAT_SHARE,
  PHOTO_PANEL_MAX_FLAT_SHARE,
  SHARE_CARD_PANEL_PROBE_CROP,
  SHARE_CARD_PHOTO_PANEL_CROP,
  verdictForPhotoPanelFlatShare,
} from "./helpers/og-card-panel"
import { expectCardMatchesBaseline } from "./helpers/og-card-visual"
import { locateQrPlate, readQrModules } from "./helpers/og-card-qr"
import { SITE_URL } from "@/lib/site-url"
import { buildQrMatrix } from "@/lib/qr-matrix"

/**
 * Ukuran foto uji. 640×512 = ukuran natural `<img>` di kartu, jadi satori
 * menggambarnya nyaris skala 1:1 dan tekstur kotaknya tidak hilang di-downscale.
 */
const PHOTO_WIDTH = 640
const PHOTO_HEIGHT = 512
const BLOCK_SIZE = 8
const PNG_MAGIC_HEX = "89504e470d0a1a0a"

const PHOTO_PATH = "/foto-uji.png"

/**
 * Foto uji kedua: 88 baris teratas satu bidang datar, sisanya bergradasi —
 * bentuk potret/avatar berlatar studio polos. Pangsa bidang datarnya tepat
 * 88/512 = 0,171875, angka yang sama seperti terukur pada avatar dunia nyata.
 */
const FLAT_BACKDROP_PHOTO_PATH = "/foto-latar-rata.png"
const BACKDROP_BAND_HEIGHT = 88
/** Varian lambat: jedanya membuat permintaan bersamaan benar-benar bersamaan. */
const SLOW_PHOTO_PATH = "/foto-lambat.png"
const SLOW_PHOTO_DELAY_MS = 60

/**
 * Catatan permintaan yang benar-benar sampai ke server foto. Inilah bukti
 * cache bekerja: jumlah HEAD dihitung langsung, bukan disimpulkan dari nilai
 * balik yang kebetulan sama.
 */
const requestLog: string[] = []

function countHeadRequests(path: string): number {
  return requestLog.filter((entry) => entry === `HEAD ${path}`).length
}

/** PRNG deterministik — foto uji harus sama di setiap run dan setiap mesin. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let scrambled = Math.imul(state ^ (state >>> 15), state | 1)
    scrambled ^= scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61)
    return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4_294_967_296
  }
}

/**
 * Foto uji: kotak-kotak 8px dengan tingkat abu acak. Sengaja berpola (bukan
 * derau per piksel) supaya tetap kontras setelah crop/scale, dan sengaja tidak
 * rata — bidang abu polos justru akan salah dibaca sebagai panel monogram.
 */
async function buildNoisyPhotoPng(): Promise<Buffer> {
  const random = createSeededRandom(20_261_007)
  const rgb = Buffer.alloc(PHOTO_WIDTH * PHOTO_HEIGHT * 3)

  for (let blockTop = 0; blockTop < PHOTO_HEIGHT; blockTop += BLOCK_SIZE) {
    for (let blockLeft = 0; blockLeft < PHOTO_WIDTH; blockLeft += BLOCK_SIZE) {
      const level = Math.floor(random() * 256)
      const blockBottom = Math.min(blockTop + BLOCK_SIZE, PHOTO_HEIGHT)
      const blockRight = Math.min(blockLeft + BLOCK_SIZE, PHOTO_WIDTH)

      for (let y = blockTop; y < blockBottom; y++) {
        for (let x = blockLeft; x < blockRight; x++) {
          const offset = (y * PHOTO_WIDTH + x) * 3
          rgb[offset] = level
          rgb[offset + 1] = level
          rgb[offset + 2] = level
        }
      }
    }
  }

  return sharp(rgb, {
    raw: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, channels: 3 },
  })
    .png()
    .toBuffer()
}

/**
 * Foto berlatar rata: satu bidang datar di atas, gradien dua arah di bawahnya.
 * Gradiennya membuat tiap warna subjek muncul paling banyak ~90 piksel (0,03%),
 * jadi tidak ada warna yang bisa menyaingi pangsa bidang datarnya.
 */
async function buildFlatBackdropPhotoPng(): Promise<Buffer> {
  const rgb = Buffer.alloc(PHOTO_WIDTH * PHOTO_HEIGHT * 3)
  const backdropChannels = [58, 74, 88] as const

  for (let y = 0; y < PHOTO_HEIGHT; y++) {
    for (let x = 0; x < PHOTO_WIDTH; x++) {
      const offset = (y * PHOTO_WIDTH + x) * 3

      if (y < BACKDROP_BAND_HEIGHT) {
        rgb[offset] = backdropChannels[0]
        rgb[offset + 1] = backdropChannels[1]
        rgb[offset + 2] = backdropChannels[2]
        continue
      }

      rgb[offset] = 90 + ((y * 3) % 150)
      rgb[offset + 1] = 60 + ((x * 2) % 120)
      rgb[offset + 2] = 45 + ((x + y) % 100)
    }
  }

  return sharp(rgb, {
    raw: { width: PHOTO_WIDTH, height: PHOTO_HEIGHT, channels: 3 },
  })
    .png()
    .toBuffer()
}

async function expectValidCardPng(cardPng: Buffer): Promise<void> {
  expect(cardPng.subarray(0, 8).toString("hex")).toBe(PNG_MAGIC_HEX)

  const metadata = await sharp(cardPng).metadata()
  expect(metadata.width).toBe(SHARE_CARD_SIZE.width)
  expect(metadata.height).toBe(SHARE_CARD_SIZE.height)
}

async function renderServiceCard(): Promise<Buffer> {
  const response = await ServiceOgImage({
    params: Promise.resolve({ slug: "uji-foto-jasa" }),
  })
  return Buffer.from(await response.arrayBuffer())
}

async function renderProviderCard(): Promise<Buffer> {
  const response = await ProviderOgImage({
    params: Promise.resolve({ id: "6a93d7956120198330469705" }),
  })
  return Buffer.from(await response.arrayBuffer())
}

const SERVICE_ROW_WITH_PHOTO = {
  id: "6a93d7956120198330469705",
  title: "Antar Paket Dokumen Pangkal Pinang",
  price: 150_000,
  ratingAvg: 5,
  totalReviews: 1,
  category: { name: "Jasa Antar" },
  provider: { name: "Budi Santoso", city: "pangkal pinang" },
}

const PROVIDER_ROW_WITH_AVATAR = {
  name: "Budi Santoso",
  role: "PROVIDER",
  location: "Jl. Melati No.12, Pangkal Pinang",
}

let photoServer: Server
let photoOrigin = ""
let photoUrl = ""
let slowPhotoUrl = ""
let flatBackdropPhotoUrl = ""

/**
 * Server yang memutus soket sebelum membalas, plus URL-nya.
 *
 * Sengaja BUKAN "port yang baru dibebaskan" dan bukan `:1`: fetch menolak port
 * 1 sebagai `bad port` sebelum menyentuh jaringan, dan port yang baru
 * dibebaskan bisa direbut worker test lain sehingga kegagalannya tidak
 * deterministik. Memutus soket selalu menghasilkan kegagalan jaringan yang
 * sama (cause `UND_ERR_SOCKET`) tanpa bergantung pada port mana pun.
 */
let brokenPhotoServer: Server
let brokenPhotoUrl = ""

let servicePhotoPanelFlatShare = 0
let serviceMonogramPanelFlatShare = 0
let serviceFlatBackdropPanelFlatShare = 0
let providerAvatarPanelFlatShare = 0
let providerMonogramPanelFlatShare = 0

// Kartu yang dirender di `beforeAll` ditahan utuh, bukan hanya angkanya:
// perbandingan baseline di bawah membandingkan PNG yang sama dengan yang diukur
// panelnya, jadi tidak ada render kedua yang bisa membuat keduanya berbeda
// sumbernya.
let serviceCardWithPhoto: Buffer
let serviceMonogramCard: Buffer
let providerAvatarCard: Buffer
let providerMonogramCard: Buffer

beforeAll(async () => {
  const photoPng = await buildNoisyPhotoPng()
  const flatBackdropPhotoPng = await buildFlatBackdropPhotoPng()

  // Satu server melayani semua fixture foto; hanya path yang terdaftar di sini
  // yang dibalas 200 — sisanya 404, dipakai test preflight.
  const photoBodies = new Map<string, Buffer>([
    [PHOTO_PATH, photoPng],
    [FLAT_BACKDROP_PHOTO_PATH, flatBackdropPhotoPng],
  ])

  photoServer = createServer((request, response) => {
    const path = request.url ?? ""
    requestLog.push(`${request.method} ${path}`)

    const sendPhoto = (body: Buffer) => {
      response.writeHead(200, {
        "content-type": "image/png",
        "content-length": body.length,
      })
      response.end(request.method === "HEAD" ? undefined : body)
    }

    if (path === SLOW_PHOTO_PATH) {
      setTimeout(() => sendPhoto(photoPng), SLOW_PHOTO_DELAY_MS)
      return
    }

    const photoBody = photoBodies.get(path)
    if (!photoBody) {
      response.writeHead(404).end()
      return
    }

    sendPhoto(photoBody)
  })

  await new Promise<void>((resolve) => {
    photoServer.listen(0, "127.0.0.1", resolve)
  })
  const { port } = photoServer.address() as AddressInfo
  photoOrigin = `http://127.0.0.1:${port}`
  photoUrl = `${photoOrigin}${PHOTO_PATH}`
  slowPhotoUrl = `${photoOrigin}${SLOW_PHOTO_PATH}`
  flatBackdropPhotoUrl = `${photoOrigin}${FLAT_BACKDROP_PHOTO_PATH}`

  brokenPhotoServer = createServer((request) => {
    request.socket.destroy()
  })
  await new Promise<void>((resolve) => {
    brokenPhotoServer.listen(0, "127.0.0.1", resolve)
  })
  const { port: brokenPort } = brokenPhotoServer.address() as AddressInfo
  brokenPhotoUrl = `http://127.0.0.1:${brokenPort}${PHOTO_PATH}`

  // Kartu jasa berfoto, lalu kartu fallback (jasa tidak ditemukan) sebagai
  // baseline monogram — jalur fallback memang tidak boleh menyentuh foto.
  fakePrisma.order.count.mockResolvedValue(12)
  fakePrisma.service.findUnique.mockResolvedValue({
    ...SERVICE_ROW_WITH_PHOTO,
    imageUrl: photoUrl,
  })
  serviceCardWithPhoto = await renderServiceCard()
  servicePhotoPanelFlatShare = await measurePhotoPanelFlatShare(serviceCardWithPhoto)

  fakePrisma.service.findUnique.mockResolvedValue(null)
  serviceMonogramCard = await renderServiceCard()
  serviceMonogramPanelFlatShare = await measurePhotoPanelFlatShare(serviceMonogramCard)

  // Foto berlatar rata pada kartu jasa: kasus yang paling dekat dengan panel
  // monogram, jadi diukur di sini lalu di-assert sebagai pita tersendiri.
  fakePrisma.service.findUnique.mockResolvedValue({
    ...SERVICE_ROW_WITH_PHOTO,
    imageUrl: flatBackdropPhotoUrl,
  })
  serviceFlatBackdropPanelFlatShare = await measurePhotoPanelFlatShare(
    await renderServiceCard()
  )

  fakePrisma.service.findUnique.mockResolvedValue(null)

  // Kartu penyedia beravatar, lalu baseline monogram lewat penyedia yang tidak
  // ditemukan.
  fakePrisma.user.findUnique.mockResolvedValue({
    ...PROVIDER_ROW_WITH_AVATAR,
    avatarUrl: photoUrl,
  })
  fakePrisma.service.count.mockResolvedValue(5)
  fakePrisma.review.count.mockResolvedValue(18)
  fakePrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.722222 } })
  providerAvatarCard = await renderProviderCard()
  providerAvatarPanelFlatShare = await measurePhotoPanelFlatShare(providerAvatarCard)

  fakePrisma.user.findUnique.mockResolvedValue(null)
  providerMonogramCard = await renderProviderCard()
  providerMonogramPanelFlatShare = await measurePhotoPanelFlatShare(
    providerMonogramCard
  )

  // Angka mentah ikut dicetak: saat guard ini gagal, penyebabnya biasanya
  // perubahan tata letak kartu, dan nilai-nilai ini yang menunjukkannya.
  console.log(
    "[og-card-photo] pangsa warna dominan panel — jasa foto:",
    servicePhotoPanelFlatShare.toFixed(4),
    "jasa monogram:",
    serviceMonogramPanelFlatShare.toFixed(4),
    "jasa latar rata:",
    serviceFlatBackdropPanelFlatShare.toFixed(4),
    "penyedia avatar:",
    providerAvatarPanelFlatShare.toFixed(4),
    "penyedia monogram:",
    providerMonogramPanelFlatShare.toFixed(4)
  )
}, 120_000)

afterAll(async () => {
  await new Promise<void>((resolve) => photoServer.close(() => resolve()))
  await new Promise<void>((resolve) => brokenPhotoServer.close(() => resolve()))
})

describe("panel foto kartu OG jasa", () => {
  it("menggambar foto jasa, bukan monogram", async () => {
    fakePrisma.service.findUnique.mockResolvedValue({
      ...SERVICE_ROW_WITH_PHOTO,
      imageUrl: photoUrl,
    })

    await expectValidCardPng(await renderServiceCard())

    expect(servicePhotoPanelFlatShare).toBeLessThan(PHOTO_PANEL_MAX_FLAT_SHARE)
    expect(serviceMonogramPanelFlatShare).toBeGreaterThan(
      MONOGRAM_PANEL_MIN_FLAT_SHARE
    )
    expect(verdictForPhotoPanelFlatShare(servicePhotoPanelFlatShare)).toBe("photo")
    expect(verdictForPhotoPanelFlatShare(serviceMonogramPanelFlatShare)).toBe(
      "monogram"
    )
    expect(servicePhotoPanelFlatShare).toBeLessThan(
      serviceMonogramPanelFlatShare / 8
    )
  }, 60_000)

  it("jatuh ke monogram saat jasa tidak ditemukan", async () => {
    fakePrisma.service.findUnique.mockResolvedValue(null)

    await expectValidCardPng(await renderServiceCard())

    expect(serviceMonogramPanelFlatShare).toBeGreaterThan(
      MONOGRAM_PANEL_MIN_FLAT_SHARE
    )
    expect(serviceMonogramPanelFlatShare).toBeGreaterThan(
      servicePhotoPanelFlatShare * 8
    )
  }, 60_000)
})

describe("panel foto kartu OG penyedia", () => {
  it("menggambar avatar penyedia, bukan monogram", async () => {
    fakePrisma.user.findUnique.mockResolvedValue({
      ...PROVIDER_ROW_WITH_AVATAR,
      avatarUrl: photoUrl,
    })
    fakePrisma.service.count.mockResolvedValue(5)
    fakePrisma.review.count.mockResolvedValue(18)
    fakePrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.722222 } })

    await expectValidCardPng(await renderProviderCard())

    expect(providerAvatarPanelFlatShare).toBeLessThan(PHOTO_PANEL_MAX_FLAT_SHARE)
    expect(providerMonogramPanelFlatShare).toBeGreaterThan(
      MONOGRAM_PANEL_MIN_FLAT_SHARE
    )
    expect(verdictForPhotoPanelFlatShare(providerAvatarPanelFlatShare)).toBe("photo")
    expect(verdictForPhotoPanelFlatShare(providerMonogramPanelFlatShare)).toBe(
      "monogram"
    )
    expect(providerAvatarPanelFlatShare).toBeLessThan(
      providerMonogramPanelFlatShare / 8
    )
  }, 60_000)

  it("jatuh ke monogram saat penyedia tidak ditemukan", async () => {
    fakePrisma.user.findUnique.mockResolvedValue(null)

    await expectValidCardPng(await renderProviderCard())

    expect(providerMonogramPanelFlatShare).toBeGreaterThan(
      MONOGRAM_PANEL_MIN_FLAT_SHARE
    )
    expect(providerMonogramPanelFlatShare).toBeGreaterThan(
      providerAvatarPanelFlatShare * 8
    )
  }, 60_000)
})

describe("tampilan kartu OG (baseline piksel)", () => {
  /**
   * Perbandingan penuh kartu dengan PNG baseline di `tests/baselines/`.
   *
   * Yang dibandingkan adalah PNG yang sama dengan yang diukur panelnya di atas,
   * jadi kegagalan di sini berarti gambar kartunya benar-benar berubah — bukan
   * gambar kedua yang dirender ulang dengan kondisi berbeda.
   *
   * Baseline sengaja tidak diperbarui otomatis: `UPDATE_OG_BASELINE=1 npm test`
   * (ditolak di CI), lalu PNG barunya diperiksa sebelum di-commit. Tanpa langkah
   * itu, perubahan tata letak yang tidak disengaja akan lolos hanya karena
   * baseline-nya ikut tertimpa.
   */
  it("kartu jasa dengan foto sama seperti baseline", async () => {
    await expectCardMatchesBaseline(serviceCardWithPhoto, "kartu-jasa-foto.png")
  })

  it("kartu jasa tanpa foto sama seperti baseline", async () => {
    await expectCardMatchesBaseline(serviceMonogramCard, "kartu-jasa-monogram.png")
  })

  it("kartu penyedia dengan avatar sama seperti baseline", async () => {
    await expectCardMatchesBaseline(providerAvatarCard, "kartu-penyedia-avatar.png")
  })

  it("kartu penyedia tanpa avatar sama seperti baseline", async () => {
    await expectCardMatchesBaseline(
      providerMonogramCard,
      "kartu-penyedia-monogram.png"
    )
  })
})

describe("pengukuran panel kartu OG", () => {
  it("menghitung pangsa warna dominan dari piksel mentah", () => {
    // Tiga dari empat piksel berwarna sama: 0,75. Kanal alfa ikut dikirim
    // supaya kehadirannya tidak menggeser perhitungan.
    const probe = {
      pixels: new Uint8Array([
        10, 20, 30, 255, 10, 20, 30, 255, 10, 20, 30, 255, 40, 50, 60, 255,
      ]),
      width: 2,
      height: 2,
      channels: 4,
    }

    expect(dominantColorShare(probe)).toBe(0.75)

    // Alfa berbeda-beda tapi RGB-nya sama: pangsa tetap 1, karena alfa tidak
    // ikut menentukan warna.
    expect(
      dominantColorShare({
        pixels: new Uint8Array([
          10, 20, 30, 255, 10, 20, 30, 128, 10, 20, 30, 0, 10, 20, 30, 64,
        ]),
        width: 2,
        height: 2,
        channels: 4,
      })
    ).toBe(1)
  })

  it("menolak bidang piksel yang tidak bisa diukur", () => {
    // 0 atau NaN yang dikembalikan diam-diam akan meloloskan setiap ambang di
    // atasnya, jadi metriknya menolak mengukur daripada memberi angka palsu.
    expect(() =>
      dominantColorShare({
        pixels: new Uint8Array([]),
        width: 0,
        height: 0,
        channels: 3,
      })
    ).toThrow(/kosong/)

    expect(() =>
      dominantColorShare({
        pixels: new Uint8Array([1, 2]),
        width: 1,
        height: 1,
        channels: 2,
      })
    ).toThrow(/kanal/)
  })

  it("mengukur crop yang benar-benar ada di dalam kartu", () => {
    // Kalau tata letak kartu bergeser sampai crop keluar batas, `sharp.extract`
    // melempar dengan pesan yang tidak menyebut tata letak sama sekali — jadi
    // batasnya diperiksa di sini, bukan setelah render.
    const { left, top, width, height } = SHARE_CARD_PHOTO_PANEL_CROP

    expect(left).toBeGreaterThan(0)
    expect(top).toBeGreaterThan(0)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(left + width).toBeLessThanOrEqual(SHARE_CARD_SIZE.width)
    expect(top + height).toBeLessThanOrEqual(SHARE_CARD_SIZE.height)
  })

  it("berhenti sebelum blok QR, bukan ikut mengukur piringnya", () => {
    const panel = SHARE_CARD_PHOTO_PANEL_CROP
    const probe = SHARE_CARD_PANEL_PROBE_CROP

    // Wilayah ukur adalah bagian ATAS panel; bagian bawahnya milik piring QR.
    expect(probe.left).toBe(panel.left)
    expect(probe.top).toBe(panel.top)
    expect(probe.width).toBe(panel.width)
    expect(probe.height).toBeLessThan(panel.height)

    // Selisihnya tepat setinggi blok QR: kalau piring QR bertambah tinggi tanpa
    // wilayah ukur ikut dipendekkan, piringnya akan mendarat di dalam wilayah
    // ukur dan pangsa warna dominannya melonjak tanpa foto apa pun berubah.
    expect(panel.height - probe.height).toBe(SHARE_CARD_QR_PLATE_HEIGHT)

    // Dan wilayah ukurnya sendiri harus tetap cukup luas untuk berarti.
    expect(probe.height).toBeGreaterThan(SHARE_CARD_QR_PLATE_HEIGHT)
    expect(probe.top + probe.height).toBeLessThanOrEqual(SHARE_CARD_SIZE.height)
  })

  it("menaruh foto berlatar rata di pita antara ambang foto dan ambang monogram", () => {
    // Metriknya bereaksi terhadap kerataan latar: foto berlatar rata terukur
    // puluhan kali lebih rata daripada foto bertekstur.
    expect(serviceFlatBackdropPanelFlatShare).toBeGreaterThan(
      servicePhotoPanelFlatShare * 8
    )

    // Ambang foto bertekstur 0,05 memang TIDAK dipenuhi foto seperti ini.
    // Itu batas metriknya, bukan tanda fotonya hilang — dan batas itu di-assert
    // supaya tidak ada yang mengira ambang tersebut menangkap semua foto.
    expect(serviceFlatBackdropPanelFlatShare).toBeGreaterThan(
      PHOTO_PANEL_MAX_FLAT_SHARE
    )

    // Yang harus tetap benar: foto berlatar rata tidak pernah dibaca sebagai
    // monogram. Sisa jaraknya masih minimal 2× dari panel monogram.
    expect(serviceFlatBackdropPanelFlatShare).toBeLessThan(
      MONOGRAM_PANEL_MIN_FLAT_SHARE
    )
    expect(verdictForPhotoPanelFlatShare(serviceFlatBackdropPanelFlatShare)).toBe(
      "inconclusive"
    )
    expect(serviceFlatBackdropPanelFlatShare * 2).toBeLessThan(
      serviceMonogramPanelFlatShare
    )
  })
})

describe("QR kartu OG", () => {
  /**
   * QR di kartu share dibaca dari PNG hasil render, modul demi modul, lalu
   * dibandingkan dengan matriks harapannya. Diperiksa dengan membaca piksel —
   * bukan dengan mempercayai kode yang menggambarnya — karena QR yang tergeser
   * beberapa piksel atau kehilangan sebagian modul tetap "terlihat seperti QR"
   * tapi tidak bisa dipindai, dan tidak ada pemeriksaan status yang menangkapnya.
   */
  it("menggambar QR halaman jasa dan modulnya terbaca utuh", async () => {
    const value = `${SITE_URL}/service/uji-foto-jasa`
    fakePrisma.service.findUnique.mockResolvedValue({
      ...SERVICE_ROW_WITH_PHOTO,
      imageUrl: photoUrl,
    })

    const cardPng = await renderServiceCard()
    const matrix = buildQrMatrix(value)
    expect(matrix).not.toBeNull()
    if (!matrix) return

    const reading = await readQrModules(cardPng, matrix)

    // Nol toleransi: QR adalah satu-satunya bagian kartu yang kegunaannya hilang
    // seluruhnya kalau satu modul jatuh di tempat yang salah.
    expect(reading.mismatched).toBe(0)
    expect(reading.matched).toBe(reading.total)
  }, 60_000)

  it("menggambar QR halaman penyedia meski foto panelnya gagal dimuat", async () => {
    // Panel tanpa foto: monogram. QR tetap harus ada dan tetap benar — kalau
    // tidak, kartu fallback-lah yang kehilangan jalur kunjungannya.
    fakePrisma.user.findUnique.mockResolvedValue({
      ...PROVIDER_ROW_WITH_AVATAR,
      avatarUrl: brokenPhotoUrl,
    })
    fakePrisma.service.count.mockResolvedValue(5)
    fakePrisma.review.count.mockResolvedValue(18)
    fakePrisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.722222 } })

    const cardPng = await renderProviderCard()
    const matrix = buildQrMatrix(`${SITE_URL}/provider/6a93d7956120198330469705`)
    expect(matrix).not.toBeNull()
    if (!matrix) return

    expect((await readQrModules(cardPng, matrix)).mismatched).toBe(0)
  }, 60_000)

  it("tidak menggambar QR di kartu fallback yang tidak mewakili entitas", async () => {
    fakePrisma.service.findUnique.mockResolvedValue(null)

    const cardPng = await renderServiceCard()

    await expect(locateQrPlate(cardPng)).rejects.toThrow(/piring QR/)
  }, 60_000)
})

describe("preflight foto", () => {
  // Cache preflight bersifat per-proses, jadi tiap test mulai dari kosong dan
  // dari catatan permintaan yang bersih.
  beforeEach(() => {
    __resetOgPhotoPreflight()
    requestLog.length = 0
  })

  it("menerima foto yang bisa diambil", async () => {
    await expect(isImageReachable(photoUrl)).resolves.toBe(true)
  })

  it("tidak mengulang HEAD selama cache masih segar, lalu mengambil ulang setelah TTL habis", async () => {
    const now = Date.now()

    await expect(isImageReachable(photoUrl, now)).resolves.toBe(true)
    await expect(isImageReachable(photoUrl, now + 1)).resolves.toBe(true)
    expect(countHeadRequests(PHOTO_PATH)).toBe(1)

    // Lewat TTL: preflight diulang agar URL yang tetap valid tidak dianggap
    // mati untuk selamanya oleh proses yang sudah lama hidup.
    await expect(
      isImageReachable(photoUrl, now + PHOTO_REACHABLE_TTL_MS + 1)
    ).resolves.toBe(true)
    expect(countHeadRequests(PHOTO_PATH)).toBe(2)
  })

  it("hanya mengirim satu HEAD saat beberapa render meminta foto yang sama bersamaan", async () => {
    const now = Date.now()

    const results = await Promise.all([
      isImageReachable(slowPhotoUrl, now),
      isImageReachable(slowPhotoUrl, now),
      isImageReachable(slowPhotoUrl, now),
    ])

    expect(results).toEqual([true, true, true])
    expect(countHeadRequests(SLOW_PHOTO_PATH)).toBe(1)
  })

  it("mencatat preflight yang ditolak CDN, bukan menelannya", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    try {
      const missingPhotoUrl = `${photoOrigin}/foto-hilang.png`

      await expect(
        isImageReachable(missingPhotoUrl, Date.now())
      ).resolves.toBe(false)

      expect(warn).toHaveBeenCalledTimes(1)
      const [message, details] = warn.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ]
      expect(message).toContain("[og/foto]")
      expect(details).toMatchObject({
        url: missingPhotoUrl,
        reason: "http",
        status: 404,
      })
    } finally {
      warn.mockRestore()
    }
  })

  it("mencoba ulang URL yang gagal setelah cache kegagalannya kedaluwarsa", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})

    // Hanya baris per percobaan yang dihitung di sini. Baris `[og/foto][ALERT]`
    // adalah sinyal tersendiri (satu per episode, diuji di
    // `og-photo-preflight.test.ts`), bukan pengganti catatan per percobaan.
    const attemptLogs = () =>
      warn.mock.calls.filter(([message]) =>
        String(message).includes("[og/foto] preflight gagal")
      )

    try {
      const deadPhotoUrl = brokenPhotoUrl
      const now = Date.now()

      await expect(isImageReachable(deadPhotoUrl, now)).resolves.toBe(false)

      // Masih dalam masa cache kegagalan: tidak ada percobaan baru, jadi tidak
      // ada baris log baru.
      await expect(isImageReachable(deadPhotoUrl, now + 1)).resolves.toBe(false)
      expect(attemptLogs()).toHaveLength(1)

      const [, failure] = warn.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ]
      // "fetch failed" saja tidak cukup untuk membedah log: kode penyebab asli
      // (ENOTFOUND/ECONNREFUSED/UND_ERR_SOCKET/...) harus ikut tercatat.
      expect(failure).toMatchObject({ url: deadPhotoUrl, reason: "network" })
      expect(String(failure.error)).toMatch(/^fetch failed \(.+\)$/)

      // Host mati tidak dihukum selamanya: begitu TTL kegagalan lewat, ia
      // dicoba lagi — dan kegagalan berikutnya tetap tercatat.
      await expect(
        isImageReachable(deadPhotoUrl, now + PHOTO_UNREACHABLE_TTL_MS + 1)
      ).resolves.toBe(false)
      expect(attemptLogs()).toHaveLength(2)
    } finally {
      warn.mockRestore()
    }
  })
})
