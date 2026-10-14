/**
 * Pembaca QR dari PNG kartu share.
 *
 * Kenapa perlu, padahal QR-nya sudah digambar oleh kode kita sendiri: "ada
 * kotak-kotak di sudut kartu" bukan bukti apa pun. Yang menentukan QR berguna
 * adalah modulnya berada di tempat yang benar dan bisa dibaca pemindai. Karena
 * itu helper ini **memisahkan diri dari kode yang menggambar**: ia menemukan
 * piring QR dari pikselnya, lalu membaca modul satu per satu dari PNG hasil
 * render, lalu membandingkannya dengan matriks yang seharusnya.
 *
 * Posisi piring SENGAJA tidak diketik sebagai angka: piringnya ditemukan dengan
 * mencari warna terangnya di wilayah panel. Kalau tata letak kartu bergeser,
 * pembacaan ikut bergeser; dan kalau piringnya hilang sama sekali, tidak ada
 * yang ditemukan — kegagalan yang benar, bukan `undefined` yang lama-lama jadi
 * pembacaan acak di koordinat 0,0.
 *
 * Warna piring `#FAF7F2` dipilih juga karena mudah dipisahkan: salurannya tidak
 * sama (r > g > b), sedangkan foto uji bertekstur maupun monogram kartu memakai
 * abu-abu netral (r = g = b) — jadi tidak ada piksel foto yang bisa menyamar
 * sebagai piring.
 */

import sharp from "sharp"
import {
  SHARE_CARD_QR_PLATE_PADDING,
  SHARE_CARD_QR_RENDER_SIZE,
} from "@/lib/og-card"

export type QrPlateLocation = {
  /** Sudut kiri-atas area QR di dalam piring (bukan tepi piring), dalam piksel kartu. */
  left: number
  top: number
  /** Sisi area QR dalam piksel kartu. */
  size: number
}

export type QrModuleReading = {
  /** Modul yang terbaca sesuai matriks yang diharapkan. */
  matched: number
  total: number
  /** Modul yang terbaca berlawanan dengan matriks — 0 berarti QR utuh. */
  mismatched: number
}

const PLATE_COLOR = { red: 250, green: 247, blue: 242 } as const

/**
 * Toleransi ketat: piringnya warna yang kita gambar sendiri, jadi tidak perlu
 * longgar — dan toleransi longgar justru membuat piksel terang di foto ikut
 * terbaca sebagai piring.
 */
const PLATE_CHANNEL_TOLERANCE = 3

/**
 * Sebuah baris hanya dianggap bagian piring kalau punya rentetan warna piring
 * sepanjang ini — RENTETAN, bukan jumlah piksel senada.
 *
 * Bedanya bukan detail: judul kartu juga berwarna #FAF7F2 yang sama dengan
 * piring, jadi menghitung jumlah piksel per baris akan menemukan "piring" di
 * baris judul. Rentetan 80 px menyambung hanya bisa datang dari bidang padat
 * sepiring, bukan dari huruf.
 */
const MIN_PLATE_RUN_PIXELS = 80

/** Kolom dihitung hanya di dalam baris piring, dan harus terisi sebagian besar baris itu. */
const MIN_PLATE_COLUMN_SHARE = 0.5

/** Luminance di bawah ini = modul gelap. */
const DARK_MODULE_LUMINANCE = 128

async function decodePixels(
  cardPng: Buffer
): Promise<{ pixels: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(cardPng)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return { pixels: data, width: info.width, height: info.height }
}

function isPlatePixel(red: number, green: number, blue: number): boolean {
  return (
    Math.abs(red - PLATE_COLOR.red) <= PLATE_CHANNEL_TOLERANCE &&
    Math.abs(green - PLATE_COLOR.green) <= PLATE_CHANNEL_TOLERANCE &&
    Math.abs(blue - PLATE_COLOR.blue) <= PLATE_CHANNEL_TOLERANCE
  )
}

/**
 * Temukan area QR dari warna piringnya, lalu kembalikan kotak QR di dalamnya.
 *
 * Dua langkah (baris dulu, baru kolom) sengaja dipakai agar derau beberapa
 * piksel tidak melebarkan kotaknya: baris piring punya ratusan piksel senada,
 * sedangkan piksel nyasar paling banyak segelintir.
 */
export async function locateQrPlate(cardPng: Buffer): Promise<QrPlateLocation> {
  const { pixels, width, height } = await decodePixels(cardPng)

  /** Rentetan warna piring terpanjang di satu baris. */
  function longestPlateRun(y: number): number {
    let longest = 0
    let current = 0

    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3
      if (
        isPlatePixel(pixels[offset], pixels[offset + 1], pixels[offset + 2])
      ) {
        current++
        if (current > longest) longest = current
      } else {
        current = 0
      }
    }

    return longest
  }

  const plateRows: number[] = []
  for (let y = 0; y < height; y++) {
    if (longestPlateRun(y) >= MIN_PLATE_RUN_PIXELS) plateRows.push(y)
  }

  if (plateRows.length === 0) {
    throw new Error(
      "[og/qr] piring QR tidak ditemukan di kartu — QR tidak digambar sama sekali, atau warnanya berubah."
    )
  }

  const plateTop = plateRows[0]
  const plateBottom = plateRows[plateRows.length - 1]

  // Kolom dihitung hanya di dalam rentang baris piring: di luar itu isinya
  // panel gelap, dan mengikutsertakannya membuat tepi kiri/kanan piring jadi
  // piksel apa pun yang kebetulan terang.
  const minimumPlateColumnHits = Math.ceil(
    plateRows.length * MIN_PLATE_COLUMN_SHARE
  )
  const plateColumns: number[] = []

  for (let x = 0; x < width; x++) {
    let hits = 0
    for (const y of plateRows) {
      const offset = (y * width + x) * 3
      if (
        isPlatePixel(pixels[offset], pixels[offset + 1], pixels[offset + 2])
      ) {
        hits++
      }
    }
    if (hits >= minimumPlateColumnHits) plateColumns.push(x)
  }

  if (plateColumns.length === 0) {
    throw new Error(
      "[og/qr] baris piring QR ditemukan tapi kolomnya tidak — piringnya terlalu tipis untuk memuat QR."
    )
  }

  const plateLeft = plateColumns[0]
  const plateRight = plateColumns[plateColumns.length - 1]
  const plateWidth = plateRight - plateLeft + 1

  if (plateWidth < SHARE_CARD_QR_RENDER_SIZE) {
    throw new Error(
      `[og/qr] piring QR hanya ${plateWidth}px, lebih sempit dari QR ${SHARE_CARD_QR_RENDER_SIZE}px — piringnya terpotong atau skalanya berubah.`
    )
  }

  return {
    left: plateLeft + SHARE_CARD_QR_PLATE_PADDING,
    top: plateTop + SHARE_CARD_QR_PLATE_PADDING,
    size: SHARE_CARD_QR_RENDER_SIZE,
  }
}

/**
 * Baca setiap modul QR dari PNG kartu dan bandingkan dengan matriks harapan.
 *
 * Sampel diambil dari titik tengah modul (bukan tepinya) supaya derau antialias
 * di perbatasan tidak ikut diputuskan. Kotak 3×3 di sekitar titik tengah
 * dirata-ratakan: satu piksel nyasar tidak boleh mengubah verdict modul.
 */
export async function readQrModules(
  cardPng: Buffer,
  expected: { size: number; modules: boolean[] }
): Promise<QrModuleReading> {
  const location = await locateQrPlate(cardPng)
  const { pixels, width } = await decodePixels(cardPng)

  const moduleSize = location.size / expected.size
  let matched = 0
  let mismatched = 0

  for (let y = 0; y < expected.size; y++) {
    for (let x = 0; x < expected.size; x++) {
      const centerX = Math.floor(location.left + (x + 0.5) * moduleSize)
      const centerY = Math.floor(location.top + (y + 0.5) * moduleSize)

      let luminanceSum = 0
      let samples = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const sampleX = centerX + dx
          const sampleY = centerY + dy
          if (sampleX < 0 || sampleY < 0 || sampleX >= width) continue
          const offset = (sampleY * width + sampleX) * 3
          luminanceSum +=
            (pixels[offset] * 0.299 +
              pixels[offset + 1] * 0.587 +
              pixels[offset + 2] * 0.114)
          samples++
        }
      }

      const isDark = luminanceSum / samples < DARK_MODULE_LUMINANCE
      const expectedDark = expected.modules[y * expected.size + x]

      if (isDark === expectedDark) matched++
      else mismatched++
    }
  }

  return { matched, total: expected.size * expected.size, mismatched }
}
