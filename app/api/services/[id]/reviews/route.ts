import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = enforceRateLimit(
    request,
    "service-reviews",
    RATE_LIMITS.read
  )
  if (limited) return limited

  try {
    const { id } = await params
    if (!id || String(id).trim() === "") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }
    const serviceId = prismaId(String(id).trim())
    if (!String(serviceId).trim() || !/^[0-9a-f]{24}$|^\d+$/.test(String(serviceId))) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }

    const reviews = await prisma.review.findMany({
      where: { order: { serviceId } },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
        order: { select: { createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error("[services/[id]/reviews] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
