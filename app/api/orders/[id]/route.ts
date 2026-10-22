import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { computeRatingAggregate } from "@/lib/rating"
import {
  ORDER_STATUSES,
  canTransition,
  isOrderStatus,
  transitionError,
  type OrderStatus,
} from "@/lib/order-status"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId, sameId } from "@/lib/ids"
import { notify } from "@/lib/notifications"
import { canProviderStart, resolveOrderSplit } from "@/lib/payments"

export const dynamic = "force-dynamic"

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "order-read",
    RATE_LIMITS.read,
    session.user.id
  )
  if (limited) return limited

  try {
    const { id } = await params
    if (!id || String(id).trim() === "") {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }
    const orderId = prismaId(String(id).trim())
    if (!/^[0-9a-f]{24}$|^\d+$/.test(String(orderId))) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, avatarUrl: true } },
        service: {
          include: {
            provider: { select: { id: true, name: true, avatarUrl: true } },
            category: { select: { name: true } },
          },
        },
        reviews: {
          include: { reviewer: { select: { id: true, name: true } } },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 })
    }

    const userId = prismaId(session.user.id)
    const isCustomer = sameId(order.customerId, userId)
    const isProvider = sameId(order.service.providerId, userId)
    if (!isCustomer && !isProvider) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[orders/[id]] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

type AnnounceInput = {
  status: OrderStatus
  orderId: string
  code: string | null
  actorIsProvider: boolean
  customerId: string
  providerId: string
}

/**
 * Beri tahu pihak yang TIDAK melakukan aksi.
 *
 * Pihak yang menekan tombol sudah melihat hasilnya di layar; yang butuh kabar
 * adalah sisi lain — pelanggan yang menunggu penyedia bergerak, atau penyedia
 * yang pesanannya dibatalkan sepihak.
 */
async function announceStatusChange(input: AnnounceInput): Promise<void> {
  const label = input.code ? `Pesanan #${input.code}` : "Pesanan Anda"
  const target = input.actorIsProvider ? input.customerId : input.providerId
  const href = `/orders/${input.orderId}`

  const message: { title: string; body: string } | null =
    input.status === "IN_PROGRESS"
      ? {
          title: `${label} mulai dikerjakan`,
          body: "Penyedia sudah menerima dan mulai mengerjakan pesananmu.",
        }
      : input.status === "COMPLETED"
        ? {
            title: `${label} selesai`,
            body: "Terima kasih! Berikan ulasan supaya penyedia lain tahu kualitas kerjanya.",
          }
        : input.status === "CANCELLED"
          ? {
              title: `${label} dibatalkan`,
              body: input.actorIsProvider
                ? "Penyedia membatalkan pesanan ini. Kamu bisa mencari jasa lain yang setara."
                : "Pelanggan membatalkan pesanan ini.",
            }
          : null

  if (!message) return

  await notify({
    userId: target,
    type: "ORDER",
    title: message.title,
    body: message.body,
    href,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  if (!id || String(id).trim() === "") {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }
  const orderId = prismaId(String(id).trim())
  if (!/^[0-9a-f]{24}$|^\d+$/.test(String(orderId))) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  const limited = enforceRateLimit(
    request,
    "order-mutate",
    RATE_LIMITS.orderMutate,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const { status } = statusSchema.parse(body)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { service: { select: { providerId: true } } },
    })

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 })
    }

    const userId = prismaId(session.user.id)
    const isProvider = sameId(order.service.providerId, userId)
    const isCustomer = sameId(order.customerId, userId)

    if (!isProvider && !isCustomer) {
      return NextResponse.json(
        { error: "Forbidden: bukan pihak dalam pesanan ini" },
        { status: 403 }
      )
    }

    // Pelanggan hanya boleh membatalkan pesanan yang belum dikonfirmasi.
    if (!isProvider && status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Pelanggan hanya dapat membatalkan pesanan" },
        { status: 403 }
      )
    }

    // Jangan biarkan pelanggan membatalkan saat bukti transfer sedang
    // diperiksa: uangnya mungkin sudah dikirim, dan pembatalan akan membuat
    // verifikasi jatuh ke pesanan yang sudah batal (dana menggantung).
    if (
      isCustomer &&
      status === "CANCELLED" &&
      order.paymentStatus === "WAITING_VERIFICATION"
    ) {
      return NextResponse.json(
        {
          error:
            "Bukti pembayaran sedang diverifikasi. Tunggu keputusan SUPER_ADMIN sebelum membatalkan.",
        },
        { status: 409 }
      )
    }

    // Gerbang escrow: penyedia baru boleh mulai setelah SUPER_ADMIN
    // memverifikasi pembayaran. Diperiksa di server, bukan hanya tombol UI —
    // PATCH bisa dipanggil langsung tanpa melewati halaman.
    if (
      isProvider &&
      status === "IN_PROGRESS" &&
      !canProviderStart(order.paymentStatus)
    ) {
      return NextResponse.json(
        {
          error:
            "Pembayaran belum terverifikasi. Tunggu SUPER_ADMIN memeriksa bukti transfer pelanggan.",
        },
        { status: 409 }
      )
    }

    if (!isOrderStatus(order.status)) {
      return NextResponse.json(
        { error: "Status pesanan tersimpan tidak dikenal" },
        { status: 500 }
      )
    }

    const current: OrderStatus = order.status
    if (!canTransition(current, status)) {
      return NextResponse.json(
        { error: transitionError(current, status) },
        { status: 409 }
      )
    }

    // Cap waktu per tahap. Tanpa ini, halaman pelacakan hanya bisa bilang
    // "sedang dikerjakan" tanpa pernah bisa menjawab "sejak kapan" — dan
    // pertanyaan itu yang pertama ditanyakan pelanggan saat pesanannya sepi.
    const now = new Date()
    const stamped: Record<string, Date> =
      status === "IN_PROGRESS"
        ? { acceptedAt: now }
        : status === "COMPLETED"
          ? { completedAt: now }
          : status === "CANCELLED"
            ? { cancelledAt: now }
            : {}

    // Update + agregat dalam transaksi untuk mencegah race (P0-3)
    // Menggunakan updateMany dengan where status:current untuk optimistic locking; jika count 0 berarti race.
    const updated = await prisma.$transaction(async (tx) => {
      // @ts-ignore - handle string|number id for mongo/sqlite
      const res = await (tx.order as unknown as { updateMany: (args: unknown) => Promise<{ count: number }> }).updateMany({
        where: { id: orderId, status: current },
        data: { status, ...stamped },
      })
      if (res.count === 0) {
        throw Object.assign(new Error("Conflict: status sudah berubah"), { code: "CONFLICT" })
      }
      const ord = await tx.order.findUnique({
        where: { id: orderId },
      })
      if (!ord) throw new Error("Pesanan tidak ditemukan setelah update")
      if (status === "COMPLETED") {
        const service = await tx.service.findUnique({
          where: { id: ord.serviceId },
          include: {
            orders: {
              where: { status: "COMPLETED" },
              include: { reviews: true },
            },
          },
        })
        if (service) {
          const reviews = service.orders.flatMap((o) => o.reviews)
          const agg = computeRatingAggregate(reviews)
          await tx.service.update({
            where: { id: service.id },
            data: agg,
          })

          // Escrow dilepas DI SINI: uang pelanggan sudah diterima platform
          // (paymentStatus PAID) dan baru sekarang berpindah ke penyedia,
          // dipotong komisi. Pembagian yang tersimpan di pesanan menang atas
          // env saat ini supaya pesanan lama tidak berubah nilainya.
          if (ord.paymentStatus === "PAID") {
            const split = resolveOrderSplit(
              ord.totalPrice,
              ord.platformFee,
              ord.providerPayout
            )
            await tx.order.update({
              where: { id: ord.id },
              data: {
                platformFee: split.platformFee,
                providerPayout: split.providerPayout,
              },
            })
            if (split.providerPayout > 0) {
              const credited = await tx.user.updateMany({
                where: { id: service.providerId },
                data: { balance: { increment: split.providerPayout } },
              })
              if (credited.count === 0) {
                throw new Error("Penyedia tidak ditemukan saat menerbitkan earning")
              }
              const providerRow = await tx.user.findUnique({
                where: { id: service.providerId },
                select: { balance: true },
              })
              if (!providerRow) throw new Error("Penyedia tidak ditemukan setelah kredit")
              await tx.walletTransaction.create({
                data: {
                  userId: service.providerId,
                  type: "EARNING",
                  status: "VERIFIED",
                  amount: split.providerPayout,
                  balanceAfter: providerRow.balance,
                  orderId: ord.id,
                  providerId: service.providerId,
                },
              })
            }
          }
        }
      }

      // Pesanan yang sudah dibayar lalu dibatalkan: dana escrow — baik dari
      // saldo maupun QRIS yang sudah diverifikasi — kembali ke saldo
      // pelanggan. Ini keuntungan escrow: refund tidak perlu transfer manual
      // ke rekening luar dan tidak bisa gagal karena rekening salah.
      if (status === "CANCELLED" && ord.paymentStatus === "PAID") {
        const refunded = await tx.user.updateMany({
          where: { id: ord.customerId },
          data: { balance: { increment: ord.totalPrice } },
        })
        if (refunded.count === 0) {
          throw new Error("Pelanggan tidak ditemukan saat refund saldo")
        }
        const customerRow = await tx.user.findUnique({
          where: { id: ord.customerId },
          select: { balance: true },
        })
        if (!customerRow) throw new Error("Pelanggan tidak ditemukan setelah refund")
        await tx.walletTransaction.create({
          data: {
            userId: ord.customerId,
            type: "REFUND",
            status: "VERIFIED",
            amount: ord.totalPrice,
            balanceAfter: customerRow.balance,
            orderId: ord.id,
          },
        })
        await tx.order.update({
          where: { id: ord.id },
          data: { paymentStatus: "REFUNDED", refundedAt: now },
        })
      }
      return ord
    })

    // Notifikasi ditulis SETELAH transaksi commit: `notify` menelan error-nya
    // sendiri, jadi status pesanan yang sudah sah tidak boleh ikut batal hanya
    // karena kotak masuk gagal ditulis (tanpa replica set, tidak ada transaksi
    // yang bisa melindungi keduanya sekaligus).
    await announceStatusChange({
      status,
      orderId: String(orderId),
      code: updated.code,
      actorIsProvider: isProvider,
      customerId: order.customerId,
      providerId: order.service.providerId,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    if ((error as unknown as { code?: string })?.code === "CONFLICT") {
      return NextResponse.json(
        { error: "Conflict: status pesanan sudah berubah, silakan muat ulang" },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
