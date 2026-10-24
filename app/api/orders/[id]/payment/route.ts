import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { notify } from "@/lib/notifications"
import { isAllowedProofImage } from "@/lib/payments"
import { requireMoneyAccess } from "@/lib/totp-guard"

export const dynamic = "force-dynamic"

const submitProofSchema = z.object({
  proofImage: z
    .string()
    .trim()
    .min(1, "Bukti transfer wajib dilampirkan")
    .max(300_000, "Gambar terlalu besar setelah kompresi (maks ~280KB)"),
})

const decisionSchema = z.object({
  action: z.enum(["verify", "reject"]),
  rejectReason: z
    .string()
    .trim()
    .min(3, "Sebutkan alasan penolakan")
    .max(300)
    .optional(),
  // Kode 2FA saat keputusan diambil — bukan hanya saat login.
  totpCode: z.string().trim().min(1, "Kode 2FA wajib diisi").max(7),
})

const rupiah = new Intl.NumberFormat("id-ID")

/**
 * POST — pelanggan mengunggah bukti transfer QRIS untuk pesanannya.
 *
 * Bukti hanya bisa dikirim selama pesanan masih PENDING dan pembayaran belum
 * diterima. Setelah SUPER_ADMIN memverifikasi (`paymentStatus = PAID`), bukti
 * tidak bisa diganti lagi — kalau bisa, pelanggan yang sudah diterima dananya
 * masih dapat menukar gambar bukti dan menyamarkan jejak audit.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "order-payment",
    RATE_LIMITS.orderPayment,
    session.user.id
  )
  if (limited) return limited

  const { id } = await params
  if (!id || !/^[0-9a-fA-F]{24}$|^\d+$/.test(id.trim())) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  try {
    const { proofImage } = submitProofSchema.parse(await request.json())
    if (!isAllowedProofImage(proofImage)) {
      return NextResponse.json(
        { error: "Bukti harus berupa unggahan gambar (JPG/PNG/WebP) atau URL https" },
        { status: 400 }
      )
    }

    const orderId = prismaId(id.trim())
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        code: true,
        customerId: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        totalPrice: true,
      },
    })
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 })
    }

    const userId = prismaId(session.user.id)
    if (!sameId(order.customerId, userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (order.paymentMethod !== "qris") {
      return NextResponse.json(
        { error: "Pesanan ini tidak dibayar lewat QRIS" },
        { status: 400 }
      )
    }
    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Pesanan sudah diproses — bukti tidak bisa dikirim lagi" },
        { status: 409 }
      )
    }
    if (order.paymentStatus === "PAID") {
      return NextResponse.json(
        { error: "Pembayaran pesanan ini sudah terverifikasi" },
        { status: 409 }
      )
    }
    if (order.paymentStatus === "REFUNDED") {
      return NextResponse.json(
        { error: "Dana pesanan ini sudah dikembalikan" },
        { status: 409 }
      )
    }

    // CAS pada status pembayaran: dua unggahan bersamaan tidak boleh membuat
    // pengajuan ganda, dan bukti yang menang adalah yang terakhir tersimpan.
    const claimed = await prisma.order.updateMany({
      where: {
        id: orderId,
        paymentMethod: "qris",
        status: "PENDING",
        paymentStatus: { in: ["UNPAID", "WAITING_VERIFICATION"] },
      },
      data: {
        paymentStatus: "WAITING_VERIFICATION",
        paymentProof: proofImage,
        paymentProofUpdatedAt: new Date(),
        paymentRejectReason: null,
      },
    })
    if (claimed.count === 0) {
      return NextResponse.json(
        { error: "Status pesanan sudah berubah, muat ulang halaman" },
        { status: 409 }
      )
    }

    // Beri tahu SUPER_ADMIN — merekalah yang bisa memutuskan. Kegagalan
    // notifikasi tidak membatalkan bukti yang sudah tersimpan.
    const superAdmins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true },
      take: 10,
    })
    await Promise.all(
      superAdmins.map((admin) =>
        notify({
          userId: admin.id,
          type: "SYSTEM",
          title: `Bukti pembayaran ${order.code ?? "pesanan"}`,
          body: `Rp${rupiah.format(order.totalPrice)} menunggu verifikasi.`,
          href: "/dashboard/admin/wallet",
        })
      )
    )

    return NextResponse.json({ ok: true, paymentStatus: "WAITING_VERIFICATION" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[orders/payment] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

/**
 * PATCH — keputusan SUPER_ADMIN atas bukti pembayaran.
 *
 * Hanya SUPER_ADMIN, dan hanya dengan kode TOTP yang sah pada permintaan yang
 * sama (`requireMoneyAccess`). ADMIN biasa tidak boleh memindahkan uang, sama
 * seperti verifikasi top-up dan penarikan.
 */
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
    "order-payment-verify",
    RATE_LIMITS.walletVerify,
    session.user.id
  )
  if (limited) return limited

  // Ambang terpisah dan jauh lebih ketat untuk tebakan kode 6 digit.
  const twoFactorLimited = await enforceRateLimit(
    request,
    "order-payment-verify-2fa",
    RATE_LIMITS.totpVerify,
    session.user.id
  )
  if (twoFactorLimited) return twoFactorLimited

  const { id } = await params
  if (!id || !/^[0-9a-fA-F]{24}$|^\d+$/.test(id.trim())) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  try {
    const { action, rejectReason, totpCode } = decisionSchema.parse(
      await request.json()
    )
    if (action === "reject" && !rejectReason) {
      return NextResponse.json(
        { error: "Alasan penolakan wajib diisi" },
        { status: 400 }
      )
    }

    const orderId = prismaId(id.trim())
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        code: true,
        status: true,
        customerId: true,
        paymentStatus: true,
        totalPrice: true,
        service: { select: { providerId: true, title: true } },
      },
    })
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 })
    }
    if (order.status === "CANCELLED" || order.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Pesanan sudah selesai/batal — pembayaran tidak bisa diputus" },
        { status: 409 }
      )
    }
    if (order.paymentStatus !== "WAITING_VERIFICATION") {
      return NextResponse.json(
        { error: "Tidak ada bukti pembayaran yang menunggu verifikasi" },
        { status: 409 }
      )
    }

    // Peran + langkah-kedua. Keputusan uang tidak boleh hanya bergantung pada
    // cookie sesi yang mungkin sudah dibajak. Diletakkan setelah pemeriksaan
    // status agar permintaan yang pasti ditolak tidak menghabiskan kode 2FA.
    const denied = await requireMoneyAccess(session.user.id, totpCode)
    if (denied) return denied

    const now = new Date()
    const claimed = await prisma.order.updateMany({
      where: { id: orderId, paymentStatus: "WAITING_VERIFICATION" },
      data:
        action === "verify"
          ? {
              paymentStatus: "PAID",
              paidAt: now,
              paymentVerifiedById: prismaId(session.user.id),
              paymentVerifiedAt: now,
              paymentRejectReason: null,
            }
          : {
              paymentStatus: "UNPAID",
              paymentVerifiedById: prismaId(session.user.id),
              paymentVerifiedAt: now,
              paymentRejectReason: rejectReason ?? null,
            },
    })
    if (claimed.count === 0) {
      return NextResponse.json(
        { error: "Pembayaran ini sudah diputus admin lain, muat ulang" },
        { status: 409 }
      )
    }

    const label = order.code ? `Pesanan #${order.code}` : "Pesanan Anda"
    if (action === "verify") {
      await Promise.all([
        notify({
          userId: order.customerId,
          type: "ORDER",
          title: `${label} sudah dibayar`,
          body: "Pembayaran terverifikasi. Penyedia sekarang boleh mulai bekerja.",
          href: `/orders/${orderId}`,
        }),
        notify({
          userId: order.service.providerId,
          type: "ORDER",
          title: `Pembayaran ${label} terverifikasi`,
          body: `${order.service.title} — silakan konfirmasi dan mulai kerjakan.`,
          href: `/orders/${orderId}`,
        }),
      ])
    } else {
      await notify({
        userId: order.customerId,
        type: "ORDER",
        title: `Bukti pembayaran ${label} ditolak`,
        body: rejectReason ?? "Bukti transfer tidak dapat diverifikasi.",
        href: `/orders/${orderId}`,
      })
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: action === "verify" ? "PAID" : "UNPAID",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[orders/payment] PATCH error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
