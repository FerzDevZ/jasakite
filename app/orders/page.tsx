import type { Metadata } from "next"
import { OrderList } from "@/components/orders/order-list"

export const metadata: Metadata = {
  title: "Pesanan",
  description:
    "Lacak progres pesanan JASAKITE — status tiap tahap beserta waktunya.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function OrdersPage() {
  return <OrderList />
}
