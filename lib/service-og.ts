import {
  completedOrdersLabel,
  ogTitleFontSize,
  resolveOgImageUrl,
  SHARE_QR_LABEL,
  truncateOgTitle,
} from "@/lib/og-card"
import { formatIDR } from "@/lib/utils"

/**
 * View-model kartu Open Graph per jasa (`app/service/[slug]/opengraph-image.tsx`).
 *
 * Dipisah dari route agar logika yang menentukan tampilan kartu — validasi URL
 * foto, potong judul, skala font, format harga/rating — bisa diuji tanpa
 * merender PNG lewat satori (satori hanya hidup di dalam ImageResponse).
 * Primitif yang sama dipakai kartu penyedia lewat `@/lib/og-card`.
 */

export interface ServiceOgInput {
  title: string
  categoryName: string
  price: number
  ratingAvg: number
  totalReviews: number
  imageUrl: string | null
  providerName: string | null
  providerCity: string | null
  /** Pesanan COMPLETED untuk jasa ini; 0 = label kepercayaan disembunyikan. */
  completedOrders: number
  /** URL halaman publik jasa — inilah yang dikodekan jadi QR di kartu. */
  shareUrl: string
}

export interface ServiceOgViewModel {
  title: string
  titleFontSize: number
  categoryLabel: string
  /** null saat tidak ada harga (kartu fallback) — baris harga tidak dirender. */
  priceLabel: string | null
  /** null saat belum ada ulasan — baris rating tidak dirender. */
  ratingLabel: string | null
  providerLabel: string | null
  /** Sinyal kepercayaan; null saat belum ada pesanan selesai. */
  trustLabel: string | null
  /** URL http(s) siap muat untuk <img>, atau null jika tidak aman/tersedia. */
  imageSrc: string | null
  /** Nilai QR kartu; null hanya pada kartu fallback. */
  qrValue: string | null
  qrLabel: string | null
}

export function buildServiceOgViewModel(
  input: ServiceOgInput,
  siteUrl: string
): ServiceOgViewModel {
  const title = truncateOgTitle(input.title, "Jasa lokal")

  // Nama penyedia bisa null di skema; tanpa nama, kota saja jadi label yang
  // janggal — sembunyikan barisnya sepenuhnya.
  const providerName = input.providerName?.trim() ?? ""
  const providerParts = providerName
    ? [providerName, input.providerCity?.trim() ?? ""].filter(Boolean)
    : []

  return {
    title,
    titleFontSize: ogTitleFontSize(title.length),
    // Satori tidak mendukung text-transform — kapitalisasi dilakukan di sini.
    categoryLabel: input.categoryName.trim().toLocaleUpperCase("id-ID"),
    priceLabel: formatIDR(Math.max(0, input.price)),
    ratingLabel:
      input.totalReviews > 0
        ? `${input.ratingAvg.toFixed(1).replace(".", ",")} · ${input.totalReviews.toLocaleString("id-ID")} ulasan`
        : null,
    providerLabel: providerParts.length > 0 ? providerParts.join(" · ") : null,
    trustLabel: completedOrdersLabel(input.completedOrders),
    imageSrc: resolveOgImageUrl(input.imageUrl, siteUrl),
    qrValue: input.shareUrl,
    qrLabel: SHARE_QR_LABEL,
  }
}

/** Kartu saat slug tidak ditemukan / jasa berstatus non-ACTIVE. */
export function buildFallbackOgViewModel(): ServiceOgViewModel {
  return {
    title: "Jasa terpercaya, di sekitar Anda.",
    titleFontSize: 54,
    categoryLabel: "MARKETPLACE JASA LOKAL",
    priceLabel: null,
    ratingLabel: null,
    providerLabel: "jasakite.id · Kepulauan Bangka Belitung",
    // Kartu fallback tidak mewakili entitas apa pun: tidak ada angka kepercayaan
    // yang boleh diklaim, dan QR ke halaman yang tidak ada hanya menyesatkan.
    trustLabel: null,
    imageSrc: null,
    qrValue: null,
    qrLabel: null,
  }
}
