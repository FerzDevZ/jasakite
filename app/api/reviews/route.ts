import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { computeRatingAggregate, REVIEW_WINDOW_DAYS } from "@/lib/rating"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

const reviewSchema = z.object({
  orderId: z.string().min(1).refine((v) => /^[0-9a-fA-F]{24}$/.test(v) || /^\d+$/.test(v), "orderId tidak valid"),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().nullable(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "review",
    RATE_LIMITS.review,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = reviewSchema.parse(body)

    const orderId = prismaId(validated.orderId)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { reviews: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 })
    }

    const customerId = prismaId(session.user.id)
    if (!sameId(order.customerId, customerId)) {
      return NextResponse.json(
        { error: "Forbidden: bukan pemesan jasa ini" },
        { status: 403 }
      )
    }
    if (order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Ulasan hanya bisa diberikan setelah pesanan selesai" },
        { status: 400 }
      )
    }
    if (order.completedAt) {
      const daysSince = (Date.now() - order.completedAt.getTime()) / 86400000
      if (daysSince > REVIEW_WINDOW_DAYS) {
        return NextResponse.json(
          {
            error: `Batas waktu memberi ulasan adalah ${REVIEW_WINDOW_DAYS} hari setelah pesanan selesai`,
          },
          { status: 400 }
        )
      }
    }
    if (order.reviews.length > 0) {
      return NextResponse.json(
        { error: "Pesanan ini sudah pernah diberi ulasan" },
        { status: 400 }
      )
    }

    // Transaksi atomik: buat review + recompute agregat (P0-3)
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          orderId: order.id,
          reviewerId: customerId,
          rating: validated.rating,
          comment: validated.comment ?? null,
        },
      })
      const reviews = await tx.review.findMany({
        where: { order: { serviceId: order.serviceId } },
        select: { rating: true },
      })
      const agg = computeRatingAggregate(reviews)
      await tx.service.update({
        where: { id: order.serviceId },
        data: agg,
      })
      return created
    })

    return NextResponse.json(review, { status: 201 })
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
