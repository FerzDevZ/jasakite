/**
 * Visual regression kartu Open Graph: bandingkan PNG kartu hasil render dengan
 * baseline yang di-commit, piksel demi piksel.
 *
 * Kenapa perlu, padahal sudah ada pengukuran pangsa warna dominan panel
 * (`./og-card-panel`): metrik itu hanya melihat satu crop. Pergeseran kolom
 * teks, judul yang tumpah, badge yang melebar, atau padding bawah yang berubah
 * terjadi di luar crop tersebut — kartunya rusak untuk crawler tetapi semua
 * angka panelnya tetap sama persis.
 *
 * Baseline disimpan sebagai PNG di `tests/baselines/` dan dibandingkan dengan
 * toleransi per kanal (derau antialias/kompresi) plus ambang pangsa piksel yang
 * boleh berbeda. Saat gagal, dua artefak ditulis ke
 * `tests/baselines/__actual__/`: kartu yang baru dirender dan peta piksel yang
 * berbeda — jadi tidak perlu menebak bagian mana yang bergeser.
 *
 * Baseline diperbarui sengaja, bukan otomatis: `UPDATE_OG_BASELINE=1 npm test`.
 * Perubahan tata letak yang disengaja wajib melewati langkah itu, sehingga
 * pergeseran tak sengaja tidak pernah lolos hanya karena baseline ikut
 * tertimpa.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

// Mode pembaruan baseline tidak boleh jalan di CI: kalau ia aktif di sana,
// seluruh perbandingan visual berubah jadi no-op tanpa ada yang gagal — guard
// yang paling berbahaya justru yang diam-diam tidak memeriksa apa pun.

const BASELINE_DIR = path.join(process.cwd(), "tests", "baselines")
const ARTIFACT_DIR = path.join(BASELINE_DIR, "__actual__")
const UPDATE_BASELINE_ENV = "UPDATE_OG_BASELINE"

/** Selisih per kanal yang masih dianggap warna yang sama (derau antialias). */
const CHANNEL_TOLERANCE = 8

/**
 * Pangsa piksel yang boleh berbeda. 0,0005 dari 1200×630 = 378 piksel: cukup
 * longgar untuk pembulatan satori antar-versi, tapi tetap menangkap pergeseran
 * satu garis tepi (2 × 416 px = 0,11% — dua ratus kali ambang ini).
 */
export const MAX_CHANGED_PIXEL_SHARE = 0.0005

/** Piksel yang berbeda digambar magenta di peta diff; sisanya diredupkan. */
const DIFF_PIXEL_COLOR = { red: 255, green: 0, blue: 255 } as const
const CONTEXT_DIM_FACTOR = 0.35

export type CardVisualDiff = {
  baselinePath: string
  width: number
  height: number
  totalPixels: number
  changedPixels: number
  changedShare: number
  /** Selisih kanal terbesar — memisahkan "bergeser" dari "warna berubah tipis". */
  maxChannelDelta: number
}

type RgbRaster = {
  /** Tiga kanal per piksel, tanpa alfa, agar langkah baca kedua gambar sama. */
  pixels: Buffer
  width: number
  height: number
}

async function decodeRgb(png: Buffer): Promise<RgbRaster> {
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return { pixels: data, width: info.width, height: info.height }
}

/**
 * Baseline ditulis sebagai PNG lossless berkompresi maksimum. Keluaran satori
 * ~276 KB per kartu; zlib level 9 memotongnya ~45% tanpa satu piksel pun
 * berubah.
 *
 * `palette: false` wajib: pada level 9 sharp mengaktifkan PNG berpalet secara
 * diam-diam, dan kuantisasinya terukur mengubah 49.599 byte sampai 27/255 pada
 * kartu monogram — baseline baru akan langsung tidak cocok dengan dirinya
 * sendiri. Perbandingan tetap dihitung dari piksel hasil dekode, jadi encoder
 * tidak mempengaruhi verdict.
 */
async function encodeBaselinePng(cardPng: Buffer): Promise<Buffer> {
  return sharp(cardPng).png({ compressionLevel: 9, palette: false }).toBuffer()
}

/** Simpan kartu yang baru dirender supaya kegagalan bisa dilihat, bukan ditebak. */
async function writeActualCard(baselineName: string, actualPng: Buffer): Promise<string> {
  await mkdir(ARTIFACT_DIR, { recursive: true })
  const actualPath = path.join(ARTIFACT_DIR, baselineName)
  await writeFile(actualPath, actualPng)
  return actualPath
}

/** Peta selisih: piksel yang berbeda menyala magenta di atas kartu yang diredupkan. */
async function writeDiffMap(baselineName: string, diffMask: RgbRaster): Promise<string> {
  await mkdir(ARTIFACT_DIR, { recursive: true })
  const diffPath = path.join(
    ARTIFACT_DIR,
    `${baselineName.replace(/\.png$/, "")}.diff.png`
  )
  await sharp(diffMask.pixels, {
    raw: { width: diffMask.width, height: diffMask.height, channels: 3 },
  })
    .png()
    .toFile(diffPath)
  return diffPath
}

/**
 * Bandingkan satu kartu dengan baseline-nya.
 *
 * Mengembalikan selisihnya, atau `null` saat mode pembaruan baseline aktif
 * (tidak ada yang dibandingkan karena baseline-nya baru saja ditulis).
 * Melempar Error saat kartu berbeda melebihi ambang, dengan artefak diff sudah
 * tertulis di disk.
 */
export async function expectCardMatchesBaseline(
  cardPng: Buffer,
  baselineName: string
): Promise<CardVisualDiff | null> {
  const baselinePath = path.join(BASELINE_DIR, baselineName)

  if (process.env[UPDATE_BASELINE_ENV] === "1") {
    if (process.env.CI) {
      throw new Error(
        `[og-visual] ${UPDATE_BASELINE_ENV}=1 ditolak di CI: baseline hanya boleh diperbarui dari mesin pengembang, dan hasilnya wajib diperiksa sebelum di-commit.`
      )
    }

    await mkdir(BASELINE_DIR, { recursive: true })
    const baselineBytes = await encodeBaselinePng(cardPng)
    await writeFile(baselinePath, baselineBytes)
    console.log(
      `[og-visual] baseline ditulis ulang: ${baselinePath} (${(baselineBytes.length / 1024).toFixed(0)} KB)`
    )
    return null
  }

  let baselinePng: Buffer
  try {
    baselinePng = await readFile(baselinePath)
  } catch {
    throw new Error(
      `[og-visual] baseline belum ada: ${baselinePath}. Buat dengan ${UPDATE_BASELINE_ENV}=1 npm test, lalu periksa PNG-nya sebelum di-commit.`
    )
  }

  const [baseline, actual] = await Promise.all([
    decodeRgb(baselinePng),
    decodeRgb(cardPng),
  ])

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    const actualPath = await writeActualCard(baselineName, cardPng)

    throw new Error(
      `[og-visual] ukuran kartu berubah untuk ${baselineName}: baseline ${baseline.width}×${baseline.height}, render ${actual.width}×${actual.height}. Kartu yang di-cache crawler tidak boleh berubah ukuran tanpa sengaja. Kartu baru: ${actualPath} — perbarui baseline hanya kalau perubahan ukuran itu memang dikehendaki.`
    )
  }

  if (baseline.pixels.length !== actual.pixels.length) {
    throw new Error(
      `[og-visual] baseline ${baselineName} tidak sebanding: ${baseline.pixels.length} vs ${actual.pixels.length} byte piksel untuk ukuran yang sama.`
    )
  }

  const totalPixels = actual.width * actual.height
  const diffMask = Buffer.alloc(totalPixels * 3)
  let changedPixels = 0
  let maxChannelDelta = 0

  for (let pixel = 0; pixel < totalPixels; pixel++) {
    const offset = pixel * 3
    let pixelChanged = false
    let contextLuminance = 0

    for (let channel = 0; channel < 3; channel++) {
      const baselineValue = baseline.pixels[offset + channel]
      const actualValue = actual.pixels[offset + channel]
      const delta = Math.abs(baselineValue - actualValue)
      if (delta > maxChannelDelta) maxChannelDelta = delta
      if (delta > CHANNEL_TOLERANCE) pixelChanged = true
      contextLuminance += baselineValue
    }

    if (pixelChanged) {
      changedPixels++
      diffMask[offset] = DIFF_PIXEL_COLOR.red
      diffMask[offset + 1] = DIFF_PIXEL_COLOR.green
      diffMask[offset + 2] = DIFF_PIXEL_COLOR.blue
    } else {
      const dimmed = Math.round((contextLuminance / 3) * CONTEXT_DIM_FACTOR)
      diffMask[offset] = dimmed
      diffMask[offset + 1] = dimmed
      diffMask[offset + 2] = dimmed
    }
  }

  const changedShare = changedPixels / totalPixels
  const diff: CardVisualDiff = {
    baselinePath,
    width: actual.width,
    height: actual.height,
    totalPixels,
    changedPixels,
    changedShare,
    maxChannelDelta,
  }

  if (changedShare <= MAX_CHANGED_PIXEL_SHARE) {
    console.log(
      `[og-visual] ${baselineName}: ${changedPixels}/${totalPixels} piksel berbeda (${(changedShare * 100).toFixed(4)}%), delta kanal maks ${maxChannelDelta}`
    )
    return diff
  }

  const actualPath = await writeActualCard(baselineName, cardPng)
  const diffPath = await writeDiffMap(baselineName, {
    pixels: diffMask,
    width: actual.width,
    height: actual.height,
  })

  throw new Error(
    `[og-visual] ${baselineName} bergeser: ${changedPixels}/${totalPixels} piksel berbeda (${(changedShare * 100).toFixed(3)}% > ambang ${(MAX_CHANGED_PIXEL_SHARE * 100).toFixed(3)}%), delta kanal maks ${maxChannelDelta}. Kartu baru: ${actualPath} · peta selisih: ${diffPath}. Kalau pergeseran ini memang disengaja: ${UPDATE_BASELINE_ENV}=1 npm test, lalu periksa PNG baseline-nya sebelum di-commit.`
  )
}
