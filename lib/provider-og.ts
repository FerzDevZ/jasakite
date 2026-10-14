import {
  completedOrdersLabel,
  ogTitleFontSize,
  resolveOgImageUrl,
  SHARE_QR_LABEL,
  truncateOgTitle,
} from "@/lib/og-card"

/**
 * View-model kartu Open Graph per penyedia
 * (`app/provider/[id]/opengraph-image.tsx`).
 *
 * Dipisah dari route agar aturan tampilan — monogram dari inisial nama, hitungan
 * jasa aktif, rating dari agregat ulasan, dan pemotongan alamat — bisa diuji
 * tanpa merender PNG lewat satori.
 */

export interface ProviderOgInput {
  /** Nama bisa null di skema; kartu memakai "Penyedia Jasa" sebagai gantinya. */
  name: string | null
  /** Alamat/domisili bebas teks dari profil; bisa panjang, jadi dipotong. */
  location: string | null
  avatarUrl: string | null
  /** Rata-rata rating seluruh ulasan jasa ACTIVE milik penyedia. */
  ratingAvg: number
  totalReviews: number
  /** Jumlah jasa ACTIVE — bukan panjang daftar yang dibatasi `take`. */
  serviceCount: number
  /** Pesanan COMPLETED dari jasa milik penyedia ini; 0 = label disembunyikan. */
  completedOrders: number
  /** URL halaman publik penyedia — inilah yang dikodekan jadi QR di kartu. */
  shareUrl: string
}

export interface ProviderOgViewModel {
  title: string
  titleFontSize: number
  badgeLabel: string
  /** null saat penyedia belum punya jasa aktif — pill angka tidak dirender. */
  highlightLabel: string | null
  /** null saat belum ada ulasan — baris rating tidak dirender. */
  ratingLabel: string | null
  locationLabel: string | null
  /** Sinyal kepercayaan; null saat belum ada pesanan selesai. */
  trustLabel: string | null
  /** Inisial untuk panel foto saat avatar tidak bisa dimuat. */
  monogram: string
  /** URL http(s) siap muat untuk <img>, atau null jika tidak aman/tersedia. */
  imageSrc: string | null
  /** Nilai QR kartu; null hanya pada kartu fallback. */
  qrValue: string | null
  qrLabel: string | null
}

/**
 * Alamat di profil bebas teks ("Jl. Melati No.12, Pangkal Pinang" = 33 char).
 * Baris bawah kartu juga memuat pill "jasakite.id", jadi alamat panjang harus
 * dipotong sebelum menabrak tepi kolom teks.
 */
const MAX_LOCATION_LENGTH = 40

export function buildProviderOgViewModel(
  input: ProviderOgInput,
  siteUrl: string
): ProviderOgViewModel {
  const title = truncateOgTitle(input.name ?? "", "Penyedia Jasa")

  const location = input.location?.trim() ?? ""
  const locationLabel = location
    ? location.length > MAX_LOCATION_LENGTH
      ? `${location.slice(0, MAX_LOCATION_LENGTH - 1)}…`
      : location
    : null

  return {
    title,
    titleFontSize: ogTitleFontSize(title.length),
    // Satori tidak mendukung text-transform — kapitalisasi dilakukan di sini.
    badgeLabel: "PENYEDIA JASA".toLocaleUpperCase("id-ID"),
    highlightLabel:
      input.serviceCount > 0 ? `${input.serviceCount} jasa aktif` : null,
    ratingLabel:
      input.totalReviews > 0
        ? `${input.ratingAvg.toFixed(1).replace(".", ",")} · ${input.totalReviews.toLocaleString("id-ID")} ulasan`
        : null,
    locationLabel,
    trustLabel: completedOrdersLabel(input.completedOrders),
    // Seperti avatar di halaman profil: inisial nama, bukan huruf merek.
    monogram: (title.charAt(0) || "P").toLocaleUpperCase("id-ID"),
    imageSrc: resolveOgImageUrl(input.avatarUrl, siteUrl),
    qrValue: input.shareUrl,
    qrLabel: SHARE_QR_LABEL,
  }
}

/** Kartu saat id penyedia tidak valid / tidak ada / bukan penyedia. */
export function buildFallbackProviderOgViewModel(): ProviderOgViewModel {
  const fallbackTitle = "Penyedia jasa terpercaya, di sekitar Anda."

  return {
    title: fallbackTitle,
    titleFontSize: ogTitleFontSize(fallbackTitle.length),
    badgeLabel: "PENYEDIA JASA",
    highlightLabel: null,
    ratingLabel: null,
    locationLabel: "Kepulauan Bangka Belitung",
    // Sama seperti kartu jasa fallback: tanpa entitas, tidak ada angka
    // kepercayaan yang boleh diklaim dan tidak ada halaman yang layak di-QR.
    trustLabel: null,
    monogram: "P",
    imageSrc: null,
    qrValue: null,
    qrLabel: null,
  }
}
