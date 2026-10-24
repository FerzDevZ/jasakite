import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { setTyping, clearTyping } from "@/lib/typing"

export const dynamic = "force-dynamic"

/**
 * POST — ping "sedang mengetik" dari klien.
 *
 * Fire-and-forget: klien mengirim tiap ~3 detik SELAGI mengetik, berhenti
 * mengirim saat berhenti; entri mati sendiri lewat TTL 8 detik. Tidak ada
 * anti-pattern "stop typing" yang rapuh — kegagalan jaringan hanya berarti
 * indikator padam lebih cepat.
 *
 * Validasi peserta sama ketatnya dengan pengiriman pesan:
 * - order thread: hanya customer/provider pesanan itu;
 * - direct chat: hanya kepada user yang ada, bukan diri sendiri.
 * State disimpan sesaat di memori (lib/typing), bukan database — kehilangan
 * saat restart hanya berarti indikator tidak menyala sekali.
 */

const typingSchema = z.object({
  threadId: z
    .string()
    .regex(/^(order|peer)-[0-9a-fA-F]{24}$/, "threadId tidak valid"),
  done: z.boolean().optional().default(false),
})

async function getParticipant(
  threadId: string,
  userId: string
): Promise<{ ok: true; thread: { kind: "order"; orderId: string } | { kind: "direct"; peerId: string } } | { ok: false; status: number; error: string }> {
  const sep = threadId.indexOf("-")
  const kind = threadId.slice(0, sep)
  const rawId = threadId.slice(sep + 1)

  if (kind === "order") {
    const orderId = prismaId(rawId)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, service: { select: { providerId: true } } },
    })
    if (!order) return { ok: false, status: 404, error: "Pesanan tidak ditemukan" }
    if (
      !sameId(order.customerId, userId) &&
      !sameId(order.service.providerId, userId)
    ) {
      return { ok: false, status: 403, error: "Forbidden: bukan peserta pesanan ini" }
    }
    return { ok: true, thread: { kind: "order", orderId: String(order.id) } }
  }

  // Chat langsung: ping hanya sah dari penerima yang dituju.
  const peerId = prismaId(rawId)
  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true },
  })
  if (!peer) return { ok: false, status: 404, error: "Pengguna tidak ditemukan" }
  if (sameId(peer.id, userId)) {
    return { ok: false, status: 400, error: "Tidak bisa mengetik ke diri sendiri" }
  }
  return { ok: true, thread: { kind: "direct", peerId: String(peer.id) } }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "typing",
    RATE_LIMITS.typing,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = typingSchema.parse(body)

    const me = prismaId(session.user.id)
    const check = await getParticipant(validated.threadId, String(me))
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status })
    }

    if (validated.done) {
      clearTyping(String(me), check.thread)
    } else {
      setTyping(String(me), session.user.name ?? null, check.thread)
    }

    // Body kecil dan tidak menarik untuk di-cache — 204 tanpa konten.
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[typing] POST error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
