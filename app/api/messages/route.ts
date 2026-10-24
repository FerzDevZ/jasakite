import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

const MESSAGE_MAX = 500

const sendMessageSchema = z.object({
  recipientId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "recipientId tidak valid"),
  content: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(MESSAGE_MAX, `Pesan maksimal ${MESSAGE_MAX} karakter`),
})

/**
 * GET ?peer=<userId> — thread chat lepas-pesanan (tanpa pesanan) dengan satu
 * pengguna. Mengembalikan { peer, messages } sehingga nama lawan bicara ikut
 * terbawa untuk deep-link langsung dari tombol Chat di halaman jasa.
 * Membuka thread menandai pesan masuk sebagai sudah dibaca — dasar badge unread.
 */
export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const peerRaw = (searchParams.get("peer") ?? "").trim()
    if (!/^[0-9a-fA-F]{24}$/.test(peerRaw)) {
      return NextResponse.json({ error: "peer tidak valid" }, { status: 400 })
    }

    const me = prismaId(session.user.id)
    const peerId = prismaId(peerRaw)
    if (sameId(me, peerId)) {
      return NextResponse.json(
        { error: "Tidak bisa mengobrol dengan diri sendiri" },
        { status: 400 }
      )
    }

    const peer = await prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true, name: true, avatarUrl: true },
    })
    if (!peer) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 404 }
      )
    }

    const messages = await prisma.message.findMany({
      where: {
        // PERHATIAN: `orderId: null` pada Prisma+MongoDB TIDAK match dokumen
        // bernilai null (field relasi optional) — filter relasi `is: null`
        // yang bekerja. Terbukti empiris: 0 hasil vs5 hasil untuk kasus sama.
        order: { is: null },
        OR: [
          { senderId: me, recipientId: peerId },
          { senderId: peerId, recipientId: me },
        ],
      },
      include: { sender: { select: { id: true, name: true } } },
      // Ambil 200 TERBARU lalu balik urutan — dulu asc+200 mengambil 200
      // TERPUCUK, sehingga begitu thread melewati 200 pesan, pesan baru
      // tidak pernah sampai ke UI (tidak ada parameter "muat lebih lama").
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    // Tandai sudah dibaca — side-effect lepas setelah baca sukses. Kegagalan
    // di sini tidak menggagalkan GET: badge hanya tertunda satu siklus
    // polling, thread tetap tampil.
    //
    // Filter `readAt: null` Prisma+Mongo tidak andal (dokumen null eksplisit
    // tidak pernah cocok — terbukti count=0), jadi: baca kandidat, saring di
    // JS, update per-id — waktu baca pertama pun tidak tertimpa.
    try {
      const unreadIds = (
        await prisma.message.findMany({
          where: { order: { is: null }, senderId: peerId, recipientId: me },
          select: { id: true, readAt: true },
        })
      )
        .filter((m) => m.readAt == null)
        .map((m) => m.id)
      if (unreadIds.length > 0) {
        await prisma.message.updateMany({
          where: { id: { in: unreadIds } },
          data: { readAt: new Date() },
        })
      }
    } catch {
      // polling badge berikutnya akan menghitung ulang
    }

    // Klien merender terlama→terbaru; kembalikan dalam urutan itu.
    return NextResponse.json({ peer, messages: messages.reverse() })
  } catch (error) {
    console.error("[messages-direct] GET error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}

/** POST — kirim pesan lepas-pesanan ke satu penerima. */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
    const validated = sendMessageSchema.parse(body)

    const me = prismaId(session.user.id)
    const recipientId = prismaId(validated.recipientId)
    if (sameId(me, recipientId)) {
      return NextResponse.json(
        { error: "Tidak bisa mengirim pesan ke diri sendiri" },
        { status: 400 }
      )
    }

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    })
    if (!recipient) {
      return NextResponse.json(
        { error: "Penerima tidak ditemukan" },
        { status: 404 }
      )
    }

    const message = await prisma.message.create({
      data: {
        senderId: me,
        recipientId,
        content: validated.content,
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
    console.error("[messages-direct] POST error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
