/**
 * Bukti transfer sebagai FILE — aturan murni + kompresi browser.
 *
 * Tidak ada SDK storage di proyek ini (deploy Vercel tanpa bucket), jadi
 * gambar dikompres di kanvas hingga muat sebagai data URI di kolom
 * `WalletTransaction.proofImage`. Fungsi murni di sini menghitung dimensi
 * target dan memvalidasi bentuk akhirnya — diuji di tests/wallet.test.ts.
 * `compressProofImage` memakai DOM/Blob dan hanya boleh dipanggil di browser.
 */

// ── Batas proof image (satu sumber kebenaran untuk klien & API) ─────────────

/** Panjang data URI maksimal (≈280KB biner setelah base64) — di bawah cap zod 300.000 char. */
export const MAX_PROOF_IMAGE_CHARS = 300_000
export const MIN_PROOF_IMAGE_CHARS = 32

/** Tipe MIME yang diterima — cocok dengan allowlist zod di app/api/wallet/route.ts. */
export const PROOF_IMAGE_MIME_WHITELIST = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

/** Kualitas encode kanvas awal — diturunkan 0.1 per langkah hingga lantai 0.4. */
export const PROOF_IMAGE_JPEG_QUALITY = 0.8

/** Sisi terpanjang gambar setelah kompresi — 1280px cukup untuk membaca struk. */
export const PROOF_IMAGE_MAX_EDGE = 1280

export type ProofImageValidation =
  | { ok: true; uri: string }
  | { ok: false; reason: string }

/**
 * Bentuk data URI yang sah — full-match, sama persis dengan allowlist zod di
 * app/api/wallet/route.ts. Full-match (bukan startsWith) menolak payload
 * non-base64 dan sampah setelahnya; SVG/text-html gugur di grup mime.
 */
const PROOF_IMAGE_DATA_URI_PATTERN =
  /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/

/**
 * Validasi bentuk akhir proof image (data URI atau URL host terpercaya).
 * Dipakai ulang di klien (pra-kirim) dan sebagai referensi allowlist API.
 */
export function validateProofImage(value: string): ProofImageValidation {
  if (!value || value.length < MIN_PROOF_IMAGE_CHARS) {
    return { ok: false, reason: "Bukti transfer belum dipilih" }
  }
  if (value.length > MAX_PROOF_IMAGE_CHARS) {
    return { ok: false, reason: "Gambar masih terlalu besar setelah kompresi" }
  }
  if (value.startsWith("data:")) {
    return PROOF_IMAGE_DATA_URI_PATTERN.test(value)
      ? { ok: true, uri: value }
      : { ok: false, reason: "Format gambar tidak didukung" }
  }
  if (/^https:\/\//.test(value)) {
    return { ok: true, uri: value }
  }
  return { ok: false, reason: "Bukti harus berupa gambar dari unggahan" }
}

// ── Perhitungan dimensi target (murni, teruji) ──────────────────────────────

export type TargetDimensions = { width: number; height: number }

/**
 * Hitung dimensi target dengan sisi terpanjang dibatasi `maxEdge`, mempertahankan
 * rasio aspek, dan tidak pernah menaikkan resolusi (upscale dibuang — percuma
 * menambah byte tanpa menambah keterbacaan struk).
 */
export function computeTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxEdge: number = PROOF_IMAGE_MAX_EDGE
): TargetDimensions {
  if (!Number.isFinite(originalWidth) || !Number.isFinite(originalHeight)) {
    throw new Error("Dimensi gambar tidak valid")
  }
  if (originalWidth <= 0 || originalHeight <= 0) {
    throw new Error("Dimensi gambar tidak valid")
  }
  const longestEdge = Math.max(originalWidth, originalHeight)
  if (longestEdge <= maxEdge) {
    return { width: Math.round(originalWidth), height: Math.round(originalHeight) }
  }
  const scale = maxEdge / longestEdge
  // Ceil menjaga rasio tetap ≥ sisi asli setelah pembulatan — tidak memotong piksel.
  return {
    width: Math.ceil(originalWidth * scale),
    height: Math.ceil(originalHeight * scale),
  }
}

/**
 * Kualitas encode iteratif untuk memaksa hasil muat di bawah `maxChars`.
 * Turun 0.1 per langkah dari `startQuality` hingga 0.4 — di bawah itu
 * artefak JPEG mulai merusak keterbacaan nominal di struk.
 */
export function computeEncodeQualitySteps(
  startQuality: number = PROOF_IMAGE_JPEG_QUALITY,
  floorQuality: number = 0.4
): number[] {
  const steps: number[] = []
  for (let quality = startQuality; quality >= floorQuality - 0.001; quality -= 0.1) {
    steps.push(Math.round(quality * 10) / 10)
  }
  return steps
}

// ── Kompresi kanvas (hanya browser — memakai Image/Blob/canvas) ─────────────

/**
 * Sumber piksel ter-dekode — `ImageBitmap` (jalur EXIF-aware) atau
 * `HTMLImageElement` (fallback browser tanpa `createImageBitmap` opsi).
 * Keduanya punya width/height dan bisa digambar `drawImage`, jadi sisa
 * pipeline kompresi tidak perlu tahu bedanya.
 */
type DecodedImageSource = {
  width: number
  height: number
  drawTo(context: CanvasRenderingContext2D, width: number, height: number): void
  close(): void
}

/**
 * Decode `file` mengikuti orientasi EXIF-nya.
 *
 * `drawImage(<img>)` ABAI terhadap EXIF orientation — foto struk dari banyak
 * HP (terutama iPhone) tersimpan dengan sensor, bukan orientasi tampilan,
 * sehingga hasil kompresi bisa terputar 90°. Jalur utama memakai
 * `createImageBitmap(file, { imageOrientation: "from-image" })` yang
 * membakar orientasi ke piksel; fallback `<img>` dipakai bila browser tidak
 * mendukung (semua opsi diabaikan → setidaknya perilaku tidak berubah dari
 * sebelumnya, bukan rusak).
 */
async function decodeImageFile(file: File): Promise<DecodedImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      })
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawTo: (context, width, height) => {
          context.drawImage(bitmap, 0, 0, width, height)
        },
        close: () => bitmap.close(),
      }
    } catch {
      // Bitmap gagal (file rusak/browser penuh) — jatuh ke jalur <img>;
      // errornya sendiri muncul dari decode <img> di bawah.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error("Gambar tidak bisa dibaca"))
      img.src = objectUrl
    })
    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      drawTo: (context, width, height) => {
        context.drawImage(image, 0, 0, width, height)
      },
      close: () => {
        // HTMLImageElement tidak punya close() — object URL sudah di-revoke.
      },
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function drawToCanvas(
  source: DecodedImageSource,
  target: TargetDimensions
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = target.width
  canvas.height = target.height
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas tidak didukung browser ini")
  }
  source.drawTo(context, target.width, target.height)
  return canvas
}

/**
 * Kompres gambar terpilih menjadi data URI yang lolos `validateProofImage`.
 * Turunkan kualitas bertahap bila hasil masih melebihi batas karakter.
 * Browser-only: butuh `createImageBitmap`/`Image`, `document`, dan `File`.
 */
export async function compressProofImage(file: File): Promise<string> {
  if (!PROOF_IMAGE_MIME_WHITELIST.includes(file.type as (typeof PROOF_IMAGE_MIME_WHITELIST)[number])) {
    throw new Error("Hanya gambar JPG, PNG, atau WebP yang diterima")
  }
  const source = await decodeImageFile(file)
  try {
    const target = computeTargetDimensions(source.width, source.height)
    const canvas = drawToCanvas(source, target)

    for (const quality of computeEncodeQualitySteps()) {
      const candidate = canvas.toDataURL("image/jpeg", quality)
      if (candidate.length <= MAX_PROOF_IMAGE_CHARS) {
        return candidate
      }
    }
  } finally {
    source.close()
  }
  throw new Error("Gambar terlalu besar — coba tangkapan layar yang lebih kecil")
}
