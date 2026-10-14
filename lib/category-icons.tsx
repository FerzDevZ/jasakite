import {
  Wrench,
  Sparkles,
  Zap,
  Paintbrush,
  Truck,
  Home,
  Hammer,
  Droplets,
  Scissors,
  Utensils,
  Cpu,
  Camera,
  Package,
  Bike,
  CreditCard,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react"

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "perbaikan-rumah": Wrench,
  kebersihan: Sparkles,
  listrik: Zap,
  pengecatan: Paintbrush,
  pindahan: Truck,
  tukang: Home,
  renovasi: Hammer,
  plumbing: Droplets,
  "potong-rambut": Scissors,
  "jasa-makanan": Utensils,
  elektronik: Cpu,
  fotografi: Camera,
  "jasa-titip": Package,
  "jasa-antar": Bike,
  "jasa-pembayaran": CreditCard,
  "jasa-belanja": ShoppingCart,
}

export function getCategoryIcon(slug: string | null | undefined): LucideIcon {
  if (!slug) return Wrench
  return CATEGORY_ICONS[slug] ?? Wrench
}
