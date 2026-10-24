import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

const MESSAGE_MAX = 500

const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(MESSAGE_MAX, `Pesan maksimal ${MESSAGE_MAX} karakter`),
})

// `number & string` = hasil prismaId(). Dipakai apa adanya di klausa `where`,
// yang tidak menerima gabungan `string | number` dari toPrismaId().
async function getOrderParticipant(orderId: number & string, userId: number & string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { service: { select: { providerId: true } } },
  })
  if (!order) return { error: "Pesanan tidak ditemukan", status: 404 }
  if (!sameId(order.customerId, userId) && !sameId(order.service.providerId, userId)) {
    return { error: "Forbidden: bukan peserta pesanan ini", status: 403 }
  }
  return { order }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "messages-read",
    RATE_LIMITS.read,
    session.user.id
  )
  if (limited) return limited

  try {
    const { id } = await params
    const orderId = prismaId(id)
    if (!String(orderId).trim()) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }

    const userId = prismaId(session.user.id)
    const check = await getOrderParticipant(orderId, userId)
    if (!check.order) {
      return NextResponse.json({ error: check.error }, { status: check.status })
    }

    const messages = await prisma.message.findMany({
      where: { orderId },
      include: { sender: { select: { id: true, name: true } } },
      // Ambil 200 TERBARU lalu balik urutan — dulu asc+200 mengambil 200
      // TERPUCUK, sehingga begitu thread melewati 200 pesan, pesan baru
      // tidak pernah sampai ke UI (tidak ada parameter "muat lebih lama").
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    // Tandai balasan sebagai sudah dibaca oleh saya — dasar badge unread
    // inbox. Side-effect lepas: kegagalan tidak menggagalkan GET (badge
    // hanya tertunda satu siklus polling).
    //
    // Filter `readAt: null` Prisma+Mongo tidak andal (dokumen null eksplisit
    // tidak pernah cocok — terbukti count=0), jadi baca kandidat dulu, saring
    // di JS, lalu update per-id — waktu baca pertama tidak tertimpa.
    try {
      const unreadIds = (
        await prisma.message.findMany({
          where: { orderId },
          select: { id: true, senderId: true, readAt: true },
        })
      )
        .filter((m) => m.readAt == null && !sameId(m.senderId, userId))
        .map((m) => m.id)
      if (unreadIds.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: unreadIds } },
          data: { readAt: new Date() },
        })
      }
    } catch {
      // sengaja diabaikan — baca pesan lebih penting daripada badge
    }

    // Klien merender terlama→terbaru; kembalikan dalam urutan itu.
    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error("[messages] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orderId = prismaId(id)
  if (!String(orderId).trim()) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  const userId = prismaId(session.user.id)
  const check = await getOrderParticipant(orderId, userId)
  if (!check.order) {
    return NextResponse.json({ error: check.error }, { status: check.status })
  }

  const limited = await enforceRateLimit(
    request,
    "message",
    RATE_LIMITS.message,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const { content } = createMessageSchema.parse(body)

    const message = await prisma.message.create({
      data: {
        orderId,
        senderId: userId,
        content,
      },
      include: { sender: { select: { id: true, name: true } } },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
