import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

/** Tandai satu notifikasi sudah dibaca (dipakai saat item inbox diklik). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params
    const notification = await prisma.notification.findUnique({
      where: { id: prismaId(id) },
      select: { id: true, userId: true, readAt: true },
    })

    // Kepemilikan diperiksa: notifikasi milik pengguna lain tidak boleh
    // ditandai dibaca hanya karena id-nya diketahui.
    if (!notification || !sameId(notification.userId, session.user.id)) {
      return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 })
    }

    if (notification.readAt === null) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { readAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[notifications/:id] PATCH error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
