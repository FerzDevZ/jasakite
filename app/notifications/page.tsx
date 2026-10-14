import type { Metadata } from "next"
import { NotificationList } from "@/components/notifications/notification-list"

export const metadata: Metadata = {
  title: "Notifikasi",
  description: "Kabar pesanan, pesan, dan promo JASAKITE dalam satu kotak masuk.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default function NotificationsPage() {
  return <NotificationList />
}
