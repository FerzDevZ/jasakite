/**
 * Matriks QR untuk kartu Open Graph, plus jalur SVG-nya.
 *
 * Kenapa dihitung sendiri, bukan diserahkan ke `<img src="data:image/png">`:
 * kartu dirender satori, dan satori menggambar subset SVG (`<svg><path/></svg>`
 * sudah dipakai kartu ini untuk ikon bintang) — bukan PNG yang di-encode lalu
 * di-decode ulang. Menggambar modul sebagai satu `<path>` juga jauh lebih murah
 * daripada ratusan `<div>` absolut di dalam mesin tata letak.
 *
 * Yang penting di sini bukan "ada kotak-kotak di kartu", tapi bahwa kotak itu
 * **bisa dipindai**:
 *
 * - Quiet zone 4 modul ikut masuk ke matriks, bukan diserahkan ke padding CSS.
 *   Kalau marginnya bergantung pada padding, satu perubahan tata letak bisa
 *   membuat QR yang tampak benar tapi tidak terbaca.
 * - Jalur SVG memakai run-length per baris (`h{n}v1h-{n}z`), jadi panjang
 *   stringnya separuh dan tetap tepat menutup modul yang sama.
 * - Nilai yang tidak bisa di-encode mengembalikan `null`, bukan melempar:
 *   kartu tanpa QR jauh lebih baik daripada route 500 yang menghapus og:image
 *   sama sekali.
 */

import QRCode from "qrcode"

/** Margin wajib di sekeliling QR (ISO/IEC 18004: 4 modul). */
export const QR_QUIET_ZONE_MODULES = 4

/**
 * Tingkat koreksi galat. "M" (±15%) adalah titik tengah: cukup tahan terhadap
 * kompresi ulang WhatsApp/Facebook yang sering mengotori QR di kartu share,
 * tanpa membengkakkan jumlah modul seperti "Q"/"H".
 */
export const QR_ERROR_CORRECTION_LEVEL = "M" as const

export type QrMatrix = {
  /** Jumlah modul per sisi, SUDAH termasuk quiet zone. */
  size: number
  /** `true` = modul gelap, urutan baris-major (`y * size + x`). */
  modules: boolean[]
}

/**
 * Bangun matriks QR (termasuk quiet zone) untuk sebuah nilai.
 *
 * Mengembalikan `null` saat nilai kosong atau tidak bisa di-encode — pemanggil
 * yang memutuskan untuk tidak menampilkan QR, bukan menerima pengecualian di
 * tengah render kartu.
 */
export function buildQrMatrix(value: string): QrMatrix | null {
  const normalized = value.trim()
  if (!normalized) return null

  try {
    const created = QRCode.create(normalized, {
      errorCorrectionLevel: QR_ERROR_CORRECTION_LEVEL,
    })

    const rawSize = created.modules.size
    const size = rawSize + QR_QUIET_ZONE_MODULES * 2
    const modules = new Array<boolean>(size * size).fill(false)

    for (let y = 0; y < rawSize; y++) {
      for (let x = 0; x < rawSize; x++) {
        modules[
          (y + QR_QUIET_ZONE_MODULES) * size + (x + QR_QUIET_ZONE_MODULES)
        ] = created.modules.data[y * rawSize + x] === 1
      }
    }

    return { size, modules }
  } catch (error) {
    console.warn(
      "[og/qr] nilai tidak bisa di-encode, kartu dirender tanpa QR:",
      {
        value: normalized.slice(0, 120),
        error: error instanceof Error ? error.message : String(error),
      }
    )
    return null
  }
}

/**
 * Jumlah modul gelap. Dipakai test untuk memastikan jalur SVG benar-benar
 * menggambar seluruh matriks — jalur yang "kelihatan penuh" tapi kehilangan
 * modul akan menghasilkan QR yang tidak terbaca, dan itu tidak terlihat dari
 * panjang stringnya.
 */
export function qrDarkModuleCount(matrix: QrMatrix): number {
  let dark = 0
  for (const module of matrix.modules) {
    if (module) dark++
  }
  return dark
}

/**
 * Jalur SVG untuk seluruh modul gelap, dalam satuan modul (viewBox = size×size).
 *
 * Setiap baris dijalankan sebagai potongan horizontal, bukan satu persegi per
 * modul: QR 33×33 punya ~590 modul gelap, dan 590 perintah `h1v1h-1z` menghasilkan
 * string empat kali lebih panjang daripada versi run-length ini.
 */
export function qrPathData(matrix: QrMatrix): string {
  const { size, modules } = matrix
  const parts: string[] = []

  for (let y = 0; y < size; y++) {
    let runStart = -1

    // Satu langkah ekstra di akhir baris menutup potongan yang mencapai tepi.
    for (let x = 0; x <= size; x++) {
      const isDark = x < size && modules[y * size + x]

      if (isDark && runStart === -1) {
        runStart = x
        continue
      }

      if (!isDark && runStart !== -1) {
        const length = x - runStart
        parts.push(`M${runStart} ${y}h${length}v1h-${length}z`)
        runStart = -1
      }
    }
  }

  return parts.join("")
}
