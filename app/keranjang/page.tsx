import type { Metadata } from "next"
import { CartView } from "@/components/cart/cart-view"

export const metadata: Metadata = {
  title: "Keranjang",
  description:
    "Keranjang belanja JASAKITE — kumpulkan jasa dari beberapa penyedia lalu checkout sekali jalan.",
  // Halaman pribadi: tidak ada isi yang berguna untuk crawler, dan mengindeks
  // keranjang kosong hanya menghasilkan halaman tipis di hasil pencarian.
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function KeranjangPage() {
  return <CartView />
}
