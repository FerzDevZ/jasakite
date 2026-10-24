import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { loadNotificationFeed } from "@/lib/notifications-feed"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

/**
 * Notifikasi tersimpan.
 *
 * Sebelumnya endpoint ini menurunkan daftar notifikasi langsung dari kueri
 * pesanan, dan tidak punya handler PATCH sama sekali — tombol "tandai dibaca"
 * di lonceng karena itu menembak route yang tidak ada (405), menghitung nol di
 * layar, lalu angka lamanya kembali lagi pada polling 60 detik berikutnya.
 * Sekarang status baca benar-benar tersimpan di database.
 *
 * CATATAN MongoDB: filter `readAt: null` TIDAK bekerja di Prisma+Mongo (nol
 * baris cocok — bug yang sama seperti di app/api/messages/route.ts). Karena itu
 * penyaringan "belum dibaca" dilakukan di JS setelah pengambilan, bukan di
 * klausa `where`.
 */
const UNREAD_SCAN_LIMIT = 200

async function unreadIds(userId: string): Promise<string[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    select: { id: true, readAt: true },
    orderBy: { createdAt: "desc" },
    take: UNREAD_SCAN_LIMIT,
  })
  return rows.filter((row) => row.readAt === null).map((row) => row.id)
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(
    request,
    "notifications",
    RATE_LIMITS.notifications,
    session.user.id
  )
  if (limited) return limited

  try {
    const userId = prismaId(session.user.id)
    const onlyUnread = new URL(request.url).searchParams.get("unread") === "1"

    // Bentuk item berasal dari satu tempat (`lib/notifications-feed.ts`) yang
    // juga dipakai stream SSE, jadi lonceng tidak berganti format tergantung
    // jalur mana yang menang.
    const feed = await loadNotificationFeed(userId, { onlyUnread })

    // `count` dipertahankan karena klien lama sudah memakainya; bentuk respons
    // (`count` + `items`) tidak diubah supaya tidak ada konsumen yang perlu
    // diperbarui bersamaan.
    return NextResponse.json({
      count: feed.unreadCount,
      unreadCount: feed.unreadCount,
      items: feed.items,
    })
  } catch (error) {
    console.error("[notifications] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

/** Tandai SEMUA notifikasi sudah dibaca. */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(
    request,
    "notifications",
    RATE_LIMITS.notifications,
    session.user.id
  )
  if (limited) return limited

  try {
    const userId = prismaId(session.user.id)
    const ids = await unreadIds(userId)

    if (ids.length > 0) {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { readAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true, marked: ids.length })
  } catch (error) {
    console.error("[notifications] PATCH error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

