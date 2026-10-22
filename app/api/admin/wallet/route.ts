import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole, isSuperAdminRole } from "@/lib/roles"

export const dynamic = "force-dynamic"

/**
 * GET — antrean verifikasi uang untuk admin.
 *
 * Dua kelompok ditampilkan berdampingan karena diputus di satu tempat:
 *  - `pending`        : pengajuan dompet (top-up & penarikan) berstatus PENDING.
 *  - `pendingPayments`: pesanan QRIS yang bukti transfernya menunggu keputusan.
 *
 * ADMIN boleh MELIHAT supaya bisa menjawab pertanyaan pengguna, tetapi
 * `canVerify` false — hanya SUPER_ADMIN yang boleh memutuskan.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { role: true, totpEnabledAt: true },
  })
  if (!isAdminRole(admin?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const limited = enforceRateLimit(
    request,
    "admin-wallet",
    RATE_LIMITS.adminRead,
    session.user.id
  )
  if (limited) return limited

  try {
    const [pending, pendingPayments, counts] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { status: "PENDING", type: { in: ["TOPUP", "WITHDRAW"] } },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      prisma.order.findMany({
        where: { paymentStatus: "WAITING_VERIFICATION", status: "PENDING" },
        select: {
          id: true,
          code: true,
          totalPrice: true,
          paymentMethod: true,
          paymentProof: true,
          paymentProofUpdatedAt: true,
          createdAt: true,
          customer: { select: { id: true, name: true, email: true } },
          service: {
            select: {
              title: true,
              provider: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
      }),
      Promise.all([
        prisma.walletTransaction.count({
          where: { status: "PENDING", type: "TOPUP" },
        }),
        prisma.walletTransaction.count({
          where: { status: "PENDING", type: "WITHDRAW" },
        }),
        prisma.order.count({
          where: { paymentStatus: "WAITING_VERIFICATION", status: "PENDING" },
        }),
      ]),
    ])

    return NextResponse.json({
      pending,
      pendingPayments,
      pendingTopups: counts[0],
      pendingWithdraws: counts[1],
      pendingOrderPayments: counts[2],
      canVerify: isSuperAdminRole(admin?.role),
      // Tanpa 2FA aktif, tombol verifikasi memang ditolak server — UI perlu
      // tahu agar bisa menampilkan ajakan mendaftarkan authenticator, bukan
      // membiarkan admin menebak kenapa keputusannya gagal.
      totpEnabled: Boolean(admin?.totpEnabledAt),
    })
  } catch (error) {
    console.error("[admin/wallet] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
