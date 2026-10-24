/**
 * View-model kartu Open Graph halaman daftar jasa (`/services`).
 *
 * Halaman ini yang paling sering orang sebar ke grup WhatsApp — "cek di sini,
 * banyak jasanya" — tapi sebelumnya ia hanya memakai kartu merek statis, sama
 * seperti halaman lain yang tidak punya kartu sendiri. Kartu ini menggantinya
 * dengan angka yang benar-benar ada: berapa jasa aktif sekarang, dan kategori
 * apa yang paling banyak.
 *
 * Dipisah dari route dan dari komponennya karena tiga hal di sini menentukan
 * apa yang dibaca orang, dan tidak ada satu pun yang boleh "kira-kira":
 * pemotongan jumlah kategori, penyusunan label angka, dan apa yang dikatakan
 * ketika datanya belum ada.
 */

import { SHARE_QR_LABEL } from "@/lib/og-card"

export interface ServicesOgCategoryInput {
  name: string
  /** Jumlah jasa ACTIVE di kategori ini. */
  count: number
}

export interface ServicesOgInput {
  /** Jasa ACTIVE di seluruh platform. */
  activeServiceCount: number
  /** Kategori beserta jumlah jasa aktifnya; jumlahnya bisa berapa saja. */
  categories: ServicesOgCategoryInput[]
  /** Label wilayah untuk baris bawah kartu. */
  regionLabel: string
  /** URL halaman daftar — inilah yang dikodekan jadi QR. */
  shareUrl: string
}

export interface ServicesOgChip {
  /** Nama kategori, sudah dikapitalkan (satori tidak punya text-transform). */
  label: string
  countLabel: string
}

export interface ServicesOgViewModel {
  badgeLabel: string
  /** Judul kartu saat belum ada angka yang bisa dibanggakan. */
  headlineLabel: string
  /** Angka besar di kartu; null saat belum ada jasa aktif. */
  metricLabel: string | null
  metricCaption: string | null
  supportLabel: string
  /** Maksimal 3 kategori, sudah terurut dari yang paling banyak. */
  chips: ServicesOgChip[]
  /** Sisa kategori di luar `chips`; null saat tidak ada sisa. */
  moreLabel: string | null
  /** Kalimat pengganti saat sebuah petak kategori tidak bisa diisi. */
  placeholderNote: string
  qrValue: string
  qrLabel: string
}

/** Petak di kolom kanan hanya muat tiga nama kategori sebelum jadi tidak terbaca. */
export const MAX_LISTING_CATEGORY_CHIPS = 3

const PLACEHOLDER_NOTE =
  "Jasa antar barang, belanja harian, bayar tagihan, dan titip paket di seluruh wilayah."

/**
 * Susun kartu daftar dari angka yang sudah dihitung route.
 *
 * Kategori diurutkan di sini, bukan di route: urutan yang menentukan petak mana
 * yang besar adalah keputusan tampilan, dan route tidak boleh ikut tahu petak.
 */
export function buildServicesOgViewModel(
  input: ServicesOgInput
): ServicesOgViewModel {
  const sortedCategories = [...input.categories].sort(
    (left, right) => right.count - left.count
  )

  const chips: ServicesOgChip[] = sortedCategories
    .slice(0, MAX_LISTING_CATEGORY_CHIPS)
    .map((category) => ({
      label: category.name.trim().toLocaleUpperCase("id-ID"),
      countLabel: `${category.count.toLocaleString("id-ID")} jasa`,
    }))

  const remainingCount = Math.max(0, sortedCategories.length - chips.length)
  const hasActiveServices = input.activeServiceCount > 0

  return {
    badgeLabel: "KATEGORI JASA LOKAL",
    headlineLabel: "Jasa terpercaya, di sekitar Anda.",
    metricLabel: hasActiveServices
      ? input.activeServiceCount.toLocaleString("id-ID")
      : null,
    metricCaption: hasActiveServices ? "jasa aktif siap dipesan" : null,
    supportLabel: `${sortedCategories.length.toLocaleString("id-ID")} kategori · ${input.regionLabel}`,
    chips,
    moreLabel:
      remainingCount > 0
        ? `+${remainingCount.toLocaleString("id-ID")} kategori lain`
        : null,
    placeholderNote: PLACEHOLDER_NOTE,
    // Kartu ini selalu mewakili halaman yang benar-benar ada, jadi QR-nya tidak
    // pernah kosong — berbeda dari kartu entitas yang bisa jatuh ke kartu merek.
    qrValue: input.shareUrl,
    qrLabel: SHARE_QR_LABEL,
  }
}

/**
 * Kartu saat agregasi gagal (DB tidak terbaca, mis. resolusi DNS Atlas):
 * kartu merek yang jujur — tanpa angka, tanpa kategori, tapi tetap punya QR ke
 * halaman yang memang ada.
 */
export function buildFallbackServicesOgViewModel(
  input: Pick<ServicesOgInput, "regionLabel" | "shareUrl">
): ServicesOgViewModel {
  return {
    badgeLabel: "KATEGORI JASA LOKAL",
    headlineLabel: "Jasa terpercaya, di sekitar Anda.",
    metricLabel: null,
    metricCaption: null,
    supportLabel: input.regionLabel,
    chips: [],
    moreLabel: null,
    placeholderNote: PLACEHOLDER_NOTE,
    qrValue: input.shareUrl,
    qrLabel: SHARE_QR_LABEL,
  }
}
