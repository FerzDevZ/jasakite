import prisma from "@/lib/prisma"

/**
 * Pembentuk feed notifikasi — satu sumber untuk dua konsumen.
 *
 * `/api/notifications` (HTTP) dan `/api/messages/stream` (SSE) menampilkan
 * daftar yang sama di lonceng navbar. Kalau keduanya menyusun bentuk respons
 * sendiri-sendiri, cepat atau lambat salah satunya ketinggalan saat field
 * berubah: yang satu mengirim `time`, yang lain lupa, dan UI berganti-ganti
 * format tergantung jalur mana yang menang.
 *
 * CATATAN MongoDB: filter `readAt: null` TIDAK bekerja di Prisma+Mongo (nol
 * baris cocok). Karena itu "belum dibaca" disaring di JS setelah pengambilan.
 */
const NOTIFICATION_TYPES = ["ORDER", "MESSAGE", "PROMO", "SYSTEM"] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/**
 * Prisma menyimpan `type` sebagai String, bukan enum, jadi nilainya harus
 * dipersempit di sini. Nilai tak dikenal jatuh ke SYSTEM — klien memakai tipe
 * untuk memilih ikon, dan tipe asing akan membuat `TYPE_ICON[type]` undefined.
 */
function toNotificationType(value: string): NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value)
    ? (value as NotificationType)
    : "SYSTEM"
}

export type NotificationFeedItem = {
  id: string
  type: NotificationType
  title: string
  body: string | null
  href: string | null
  read: boolean
  createdAt: string
  time: string
}

export type NotificationFeed = {
  unreadCount: number
  items: NotificationFeedItem[]
}

const TAKE = 50
const UNREAD_SCAN_LIMIT = 200
/** Lonceng hanya menampilkan beberapa baris; payload SSE ikut dibatasi. */
export const BELL_ITEM_LIMIT = 6

export function relativeNotificationTime(date: Date, now = Date.now()): string {
  const minutes = Math.round((now - new Date(date).getTime()) / 60_000)
  if (minutes < 1) return "baru saja"
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
    new Date(date)
  )
}

export async function loadNotificationFeed(
  userId: string,
  options: { onlyUnread?: boolean; limit?: number } = {}
): Promise<NotificationFeed> {
  const limit = options.limit ?? TAKE

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: options.onlyUnread ? UNREAD_SCAN_LIMIT : limit,
  })

  const visible = options.onlyUnread
    ? rows.filter((row) => row.readAt === null).slice(0, limit)
    : rows

  // Jumlah belum dibaca dihitung terpisah: daftar di atas dibatasi `limit`,
  // jadi menghitung dari situ akan melaporkan 0 saat semua baris terbaru sudah
  // dibaca padahal ada notifikasi lama yang belum.
  const unreadRows = options.onlyUnread
    ? []
    : await prisma.notification.findMany({
        where: { userId },
        select: { readAt: true },
        orderBy: { createdAt: "desc" },
        take: UNREAD_SCAN_LIMIT,
      })

  const unreadCount = options.onlyUnread
    ? rows.filter((row) => row.readAt === null).length
    : unreadRows.filter((row) => row.readAt === null).length

  return {
    unreadCount,
    items: visible.map((row) => ({
      id: String(row.id),
      type: toNotificationType(row.type),
      title: row.title,
      body: row.body,
      href: row.href,
      // `read` dipakai klien untuk membedakan gaya baris; `readAt` tidak perlu
      // dikirim karena tidak ada konsumen yang memakainya.
      read: row.readAt !== null,
      createdAt: row.createdAt.toISOString(),
      time: relativeNotificationTime(row.createdAt),
    })),
  }
}
