import { Bike, CreditCard, Package, ShoppingCart, type LucideIcon } from "lucide-react"

/**
 * Ikon per kategori.
 *
 * Peta ini sengaja hanya memuat kategori yang benar-benar ditawarkan. Daftar
 * lama (perbaikan rumah, kebersihan, listrik, pengecatan, pindahan, tukang)
 * ikut dihapus bersama kategorinya: ikon yang tidak pernah dirender tetap
 * menyiratkan kategori yang seolah masih ada, dan muncul lagi begitu ada yang
 * menyalin peta ini.
 *
 * Kategori baru tanpa ikon memakai ikon `Package` sebagai cadangan — masih
 * terbaca sebagai "barang/jasa" dan tidak menunjuk layanan tertentu.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "jasa-antar": Bike,
  "jasa-belanja": ShoppingCart,
  "jasa-pembayaran": CreditCard,
  "jasa-titip": Package,
}

export function getCategoryIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return Package
  return CATEGORY_ICONS[slug] ?? Package
}
