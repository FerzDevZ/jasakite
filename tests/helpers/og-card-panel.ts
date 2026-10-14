/**
 * Alat ukur panel foto kartu share Open Graph.
 *
 * Dipakai oleh guard "kartu OG tidak kehilangan foto" (`tests/og-card-photo.test.ts`)
 * dan tersedia untuk kartu lain yang panelnya juga menampilkan gambar: kartu
 * `/service/[slug]` dan `/provider/[id]` berbagi `@/components/og/share-card`,
 * dan kartu situs (`app/opengraph-image.tsx` / `app/icon.tsx`) memakai tata
 * letak yang sama saat kelak punya foto. Metrik yang disalin ke beberapa test
 * pasti berakhir dengan ambang yang berbeda-beda, dan ambang berbeda berarti
 * satu test hijau sementara test lain merah untuk kartu yang sama.
 *
 * Metriknya pangsa warna dominan: panel monogram hampir seluruhnya satu warna
 * datar (`#1C1917`, latar panel yang menutup gradien kartu), jadi warna
 * terbesarnya menguasai >50% piksel. Foto bertekstur tidak punya satu warna
 * yang mendominasi. Simpangan baku sengaja TIDAK dipakai: huruf monogram
 * berukuran 150px sudah cukup besar untuk menaikkan simpangan baku panel sampai
 * ~35/255 — terlalu dekat dengan nilai foto untuk jadi pembeda yang aman.
 *
 * Yang ikut di-assert, bukan sekadar dicatat: foto berlatar rata (potret studio,
 * avatar berpola polos) TIDAK memenuhi ambang foto bertekstur 0,05 — nilainya
 * jatuh di pita antara 0,05 dan 0,5. Invariant yang harus tetap benar adalah
 * foto seperti itu tidak pernah dibaca sebagai monogram, jadi ambang monogram
 * tidak boleh diturunkan sampai menyentuh pita tersebut.
 *
 * Crop pengukuran diturunkan dari geometri kartu (`SHARE_CARD_PADDING`,
 * `SHARE_CARD_TEXT_COLUMN_WIDTH`, `SHARE_CARD_SIZE`), bukan dari angka yang
 * diketik ulang: kalau tata letak kartu bergeser, crop ikut bergeser — bukan
 * jadi area usang yang tetap "lulus" sambil mengukur tempat lain.
 *
 * Sejak kartu memuat piring QR di sudut kanan-bawah panel, wilayah ukur
 * dipendekkan agar blok QR TIDAK ikut terukur: piringnya memang satu bidang
 * datar berwarna terang, dan setelah diukur ia menaikkan pangsa warna dominan
 * panel berfoto dari 0,0064 menjadi 0,13 — cukup untuk membuat metrik ini
 * berhenti membedakan foto dari monogram. Isi QR tetap diperiksa, tapi di
 * tempat yang benar: `./og-card-qr` membaca modulnya dari piksel.
 */

import sharp from "sharp"
import {
  SHARE_CARD_PADDING,
  SHARE_CARD_SIZE,
  SHARE_CARD_TEXT_COLUMN_WIDTH,
} from "@/components/og/share-card"
import { SHARE_CARD_QR_PLATE_HEIGHT } from "@/lib/og-card"

export type PixelCrop = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Tepi panel digambar dengan border oranye 2px; dua belas piksel pertama
 * dibuang supaya garis border dan peredaman sudutnya tidak ikut terhitung
 * sebagai warna dominan panel.
 */
const PANEL_EDGE_INSET = 12

/** Wilayah piksel yang benar-benar berisi foto/avatar, bukan border panel. */
export const SHARE_CARD_PHOTO_PANEL_CROP: PixelCrop = {
  left: SHARE_CARD_PADDING + SHARE_CARD_TEXT_COLUMN_WIDTH + PANEL_EDGE_INSET,
  top: SHARE_CARD_PADDING + PANEL_EDGE_INSET,
  width:
    SHARE_CARD_SIZE.width -
    SHARE_CARD_PADDING * 2 -
    SHARE_CARD_TEXT_COLUMN_WIDTH -
    PANEL_EDGE_INSET * 2,
  height: SHARE_CARD_SIZE.height - SHARE_CARD_PADDING * 2 - PANEL_EDGE_INSET * 2,
}

/**
 * Wilayah yang benar-benar dipakai menilai foto vs monogram: bagian ATAS panel,
 * berhenti sebelum blok QR di sudut kanan-bawah.
 *
 * Dipotong dari atas, bukan dari bawah: bagian bawah panel punya piring QR yang
 * bidangnya datar dan akan terbaca sebagai "panel datar" — persis sinyal yang
 * kita pakai untuk mengenali monogram.
 *
 * Tingginya diturunkan dari `SHARE_CARD_QR_PLATE_HEIGHT` (geometri kartu yang
 * sama dengan yang dipakai menggambar piringnya), jadi perubahan ukuran QR ikut
 * menggeser wilayah ukur ini alih-alih membuatnya diam-diam menutupi piring.
 */
export const SHARE_CARD_PANEL_PROBE_CROP: PixelCrop = {
  ...SHARE_CARD_PHOTO_PANEL_CROP,
  height: SHARE_CARD_PHOTO_PANEL_CROP.height - SHARE_CARD_QR_PLATE_HEIGHT,
}

/**
 * Ambang verdict panel, hasil kalibrasi pada kartu sungguhan. Angkanya
 * diukur pada `SHARE_CARD_PANEL_PROBE_CROP` (wilayah panel tanpa blok QR),
 * bukan pada panel utuh:
 * - foto uji bertekstur: 0,0098 / 0,0121 / 0,0198
 * - foto berlatar rata (satu bidang datar di bagian atas frame): ~0,30
 * - monogram: 0,9890
 */
export const PHOTO_PANEL_MAX_FLAT_SHARE = 0.05
export const MONOGRAM_PANEL_MIN_FLAT_SHARE = 0.5

/** Jumlah kanal minimum yang dibutuhkan metrik ini (RGB tanpa alfa). */
export const PANEL_PROBE_CHANNELS = 3

export type RawPanelPixels = {
  /** Piksel mentah keluaran `sharp().raw()`, berurutan R,G,B per piksel. */
  pixels: Uint8Array
  width: number
  height: number
  channels: number
}

/**
 * Pangsa piksel dari warna yang paling sering muncul di satu bidang.
 *
 * Dipisah dari pembacaan PNG supaya aritmetikanya bisa diuji langsung tanpa
 * merender kartu — dan supaya kartu yang memakai format piksel lain (mis.
 * output `pngjs`) tidak perlu menyalin ulang perhitungannya.
 */
export function dominantColorShare(probe: RawPanelPixels): number {
  const { pixels, width, height, channels } = probe
  if (width <= 0 || height <= 0) {
    throw new Error("[og/panel] bidang piksel kosong: tidak ada yang bisa diukur")
  }
  if (channels < PANEL_PROBE_CHANNELS) {
    throw new Error(
      `[og/panel] butuh minimal ${PANEL_PROBE_CHANNELS} kanal warna, diterima ${channels}`
    )
  }

  const colorCounts = new Map<number, number>()
  let dominantCount = 0

  for (let offset = 0; offset < pixels.length; offset += channels) {
    const packed =
      (pixels[offset] << 16) | (pixels[offset + 1] << 8) | pixels[offset + 2]
    const seen = (colorCounts.get(packed) ?? 0) + 1
    colorCounts.set(packed, seen)
    if (seen > dominantCount) dominantCount = seen
  }

  return dominantCount / (width * height)
}

/**
 * Ukur pangsa warna dominan panel foto sebuah kartu OG yang sudah dirender.
 * `crop` bisa diganti untuk kartu dengan tata letak panel berbeda.
 */
export async function measurePhotoPanelFlatShare(
  cardPng: Buffer,
  crop: PixelCrop = SHARE_CARD_PANEL_PROBE_CROP
): Promise<number> {
  const { data, info } = await sharp(cardPng)
    .extract(crop)
    .raw()
    .toBuffer({ resolveWithObject: true })

  return dominantColorShare({
    pixels: data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  })
}

export type PhotoPanelVerdict = "photo" | "monogram" | "inconclusive"

/**
 * Verdict satu panel dari pangsa warna dominannya, diukur pada wilayah tanpa
 * blok QR.
 *
 * "inconclusive" bukan kegagalan: di situlah foto berlatar rata mendarat, dan
 * satu angka tidak boleh dipakai untuk mengklaimnya foto maupun monogram. Kartu
 * tetap dinilai lewat fixture bertekstur, yang memang punya pinggiran lebar.
 */
export function verdictForPhotoPanelFlatShare(
  dominantShare: number
): PhotoPanelVerdict {
  if (dominantShare < PHOTO_PANEL_MAX_FLAT_SHARE) return "photo"
  if (dominantShare > MONOGRAM_PANEL_MIN_FLAT_SHARE) return "monogram"
  return "inconclusive"
}
