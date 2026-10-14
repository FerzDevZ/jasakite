import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Checkout — Pesan Jasa",
  description:
    "Konfirmasi pesanan jasa Anda. Pilih metode pembayaran dan isi alamat pelaksanaan.",
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
