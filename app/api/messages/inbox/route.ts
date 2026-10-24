import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

type Conversation = {
  type: "direct" | "order"
  id: string
  name: string
  avatarUrl: string | null
  serviceTitle: string | null
  orderStatus: string | null
  lastContent: string | null
  lastAt: string
  unread: number
}

/**
 * GET — kotak masuk pesan: seluruh percakapan (chat lepas-pesanan + thread
 * pesanan yang punya pesan) milik user login, diurutkan dari yang terbaru,
 * beserta jumlah belum-dibaca per percakapan dan totalnya.
 *
 * Unread dihitung dari kueri terpisah (presisi penuh), bukan dari jendela
 * 100/150 pesan ringkasan — jendela hanya menentukan "pesan terakhir" yang
 * ditampilkan, bukan angka badge.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "inbox",
    RATE_LIMITS.read,
    session.user.id
  )
  if (limited) return limited

  try {
    const me = prismaId(session.user.id)

    // ── 1. Chat lepas-pesanan ──────────────────────────────────────────
    const [directMsgs, directIncoming] = await Promise.all([
      prisma.message.findMany({
        where: {
          // Lihat catatan di app/api/messages/route.ts: `orderId: null`
          // tidak match di Prisma+MongoDB — wajib `order: { is: null }`.
          order: { is: null },
          OR: [{ senderId: me }, { recipientId: me }],
        },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
          recipient: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      // Unread per-pengirim: sama seperti thread pesanan — `readAt: null`
      // tidak bisa difilter di Prisma+Mongo, jadi saring di JS.
      prisma.message.findMany({
        where: { order: { is: null }, recipientId: me },
        select: { senderId: true, readAt: true },
      }),
    ])

    const directUnreadMap = new Map<string, number>()
    for (const row of directIncoming) {
      if (row.readAt != null) continue
      const key = String(row.senderId)
      directUnreadMap.set(key, (directUnreadMap.get(key) ?? 0) + 1)
    }

    // Elemen pertama per peer = pesan terbaru (list sudah desc).
    const directByPeer = new Map<string, Conversation>()
    for (const m of directMsgs) {
      const peer = sameId(m.senderId, me) ? m.recipient : m.sender
      if (!peer || sameId(peer.id, me)) continue
      const key = String(peer.id)
      if (directByPeer.has(key)) continue
      directByPeer.set(key, {
        type: "direct",
        id: key,
        name: peer.name ?? "Pengguna",
        avatarUrl: peer.avatarUrl ?? null,
        serviceTitle: null,
        orderStatus: null,
        lastContent: m.content,
        lastAt: m.createdAt.toISOString(),
        unread: directUnreadMap.get(key) ?? 0,
      })
    }

    // ── 2. Percakapan berbasis pesanan ─────────────────────────────────
    const myOrders = await prisma.order.findMany({
      where: { OR: [{ customerId: me }, { service: { providerId: me } }] },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        customer: { select: { id: true, name: true, avatarUrl: true } },
        service: {
          select: {
            title: true,
            provider: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    })
    const orderIds = myOrders.map((o) => o.id)

    const [orderMsgs, orderIncoming] = await Promise.all([
      orderIds.length > 0
        ? prisma.message.findMany({
            where: { orderId: { in: orderIds } },
            orderBy: { createdAt: "desc" },
            take: 150,
            select: {
              orderId: true,
              content: true,
              createdAt: true,
            },
          })
        : Promise.resolve([]),
      // Unread per-pesanan: baca pesan thread lalu saring `readAt`/pengirim
      // di JS — filter `readAt: null` Prisma+Mongo tidak andal (catatan di atas).
      orderIds.length > 0
        ? prisma.message.findMany({
            where: { orderId: { in: orderIds } },
            select: { orderId: true, senderId: true, readAt: true },
          })
        : Promise.resolve([]),
    ])

    const orderLastMap = new Map<
      string,
      { content: string; createdAt: Date }
    >()
    for (const m of orderMsgs) {
      const key = String(m.orderId)
      if (!orderLastMap.has(key)) {
        orderLastMap.set(key, { content: m.content, createdAt: m.createdAt })
      }
    }
    const orderUnreadMap = new Map<string, number>()
    for (const row of orderIncoming) {
      if (row.readAt != null || sameId(row.senderId, me)) continue
      const key = String(row.orderId)
      orderUnreadMap.set(key, (orderUnreadMap.get(key) ?? 0) + 1)
    }

    // Pesanan tanpa satu pesan pun bukan "percakapan" — threadnya masih
    // kosong dan pintunya ada di halaman pesanan, bukan di inbox.
    const orderConversations: Conversation[] = []
    for (const order of myOrders) {
      const key = String(order.id)
      const last = orderLastMap.get(key)
      if (!last) continue
      const counterpart = sameId(order.customer.id, me)
        ? order.service.provider
        : order.customer
      orderConversations.push({
        type: "order",
        id: key,
        name: counterpart.name ?? "Pengguna",
        avatarUrl: counterpart.avatarUrl ?? null,
        serviceTitle: order.service.title,
        orderStatus: order.status,
        lastContent: last.content,
        lastAt: last.createdAt.toISOString(),
        unread: orderUnreadMap.get(key) ?? 0,
      })
    }

    // ── 3. Gabung, urutkan terbaru dulu ────────────────────────────────
    const conversations = [
      ...directByPeer.values(),
      ...orderConversations,
    ].sort((a, b) => (a.lastAt < b.lastAt ? 1 : a.lastAt > b.lastAt ? -1 : 0))

    const unreadTotal =
      [...directUnreadMap.values()].reduce((sum, n) => sum + n, 0) +
      [...orderUnreadMap.values()].reduce((sum, n) => sum + n, 0)

    return NextResponse.json({ unreadTotal, conversations })
  } catch (error) {
    console.error("[inbox] GET error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
