/**
 * Primitif kartu Open Graph yang dipakai bersama oleh semua kartu share
 * (`/service/[slug]` dan `/provider/[id]`).
 *
 * Semua fungsi di sini murni — tidak menyentuh Prisma maupun satori — supaya
 * bisa diuji tanpa merender PNG, dan supaya kedua kartu memakai aturan yang
 * sama persis: URL foto yang aman untuk satori, potong judul, dan skala font.
 * Kartu yang berbeda aturan akan tampak berbeda di WhatsApp.
 */

/** Judul dipotong di sini agar kartu maksimal 3 baris pada lebar kolom 640px. */
export const MAX_OG_TITLE_LENGTH = 76

/**
 * Foto karier/penyedia disimpan sebagai URL remote atau path relatif unggahan
 * lama. Satori hanya boleh menerima http(s) absolut: data-URI membebani bundel
 * PNG dan protokol lain (javascript:, blob:) tidak bisa digambar.
 */
export function resolveOgImageUrl(
  raw: string | null,
  siteUrl: string
): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("/")) return `${siteUrl}${trimmed}`
  return null
}

/** Semakin panjang judul, semakin kecil font agar muat dalam 2–3 baris. */
export function ogTitleFontSize(titleLength: number): number {
  if (titleLength <= 30) return 64
  if (titleLength <= 48) return 54
  if (titleLength <= 68) return 44
  return 36
}

/**
 * Keterangan di bawah QR kartu share. Sengaja satu frasa pendek: piring QR di
 * panel hanya selebar ~176 px, dan kalimat yang lebih panjang akan memaksa
 * QR-nya mengecil — menukar hal yang membuat orang memindai dengan kalimat yang
 * tidak dibaca siapa pun.
 */
export const SHARE_QR_LABEL = "Pindai untuk buka"

/**
 * Geometri piring QR di kartu share, dipakai bersama komponen kartu dan alat
 * ukur piksel (`tests/helpers/og-card-qr.ts`).
 *
 * Diekspor karena uji QR di lapisan piksel harus menebak posisi dari angka yang
 * sama dengan yang dipakai menggambar: kalau ukurannya berubah dan angka di test
 * tidak ikut berubah, pembacaannya berpindah ke modul sebelah dan test-nya
 * gagal karena alasan yang salah.
 */
export const SHARE_CARD_QR_RENDER_SIZE = 148
export const SHARE_CARD_QR_PLATE_PADDING = 14

/**
 * Tinggi total blok QR di dalam panel: padding atas+bawah, tinggi QR, jarak ke
 * keterangan, teks keterangan, plus margin kecil.
 *
 * Dipakai alat ukur panel untuk MENGECUALIKAN blok ini. Piring QR memang satu
 * bidang datar, jadi kalau ikut diukur ia akan menutupi sinyal foto/monogram
 * yang justru mau dibaca dari panel.
 */
export const SHARE_CARD_QR_LABEL_BLOCK_HEIGHT = 30
export const SHARE_CARD_QR_PLATE_HEIGHT =
  SHARE_CARD_QR_PLATE_PADDING * 2 +
  SHARE_CARD_QR_RENDER_SIZE +
  SHARE_CARD_QR_LABEL_BLOCK_HEIGHT

/**
 * Label sinyal kepercayaan dari angka yang benar-benar ada di basis data.
 *
 * Nol pesanan selesai berarti labelnya disembunyikan, bukan ditulis "0 pesanan
 * selesai": angka nol bukan bukti kepercayaan, dan badge kosong di kartu share
 * justru melemahkan yang lain.
 */
export function completedOrdersLabel(completedOrders: number): string | null {
  if (!Number.isFinite(completedOrders) || completedOrders <= 0) return null
  return `${Math.floor(completedOrders).toLocaleString("id-ID")} pesanan selesai`
}

/**
 * Judul kartu: dipangkas, diberi fallback saat kosong, dan dipotong dengan
 * elipsis agar <img> satori tidak menabrak tepi kartu.
 */
export function truncateOgTitle(raw: string, fallback: string): string {
  const trimmed = raw.trim() || fallback
  return trimmed.length > MAX_OG_TITLE_LENGTH
    ? `${trimmed.slice(0, MAX_OG_TITLE_LENGTH - 1)}…`
    : trimmed
}
