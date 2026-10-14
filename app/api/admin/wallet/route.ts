import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

/**
 * GET — antrean verifikasi dompet untuk admin.
 * Hanya pengajuan PENDING (top-up menunggu persetujuan + withdraw menunggu
 * transfer). Riwayat yang sudah diputus tidak dimuat di sini — halaman
 * keuangan admin bisa menambah tab arsip belakangan tanpa mengubah kontrak
 * antrean ini.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { role: true },
  })
  if (admin?.role !== "ADMIN") {
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
    const [pending, counts] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { status: "PENDING", type: { in: ["TOPUP", "WITHDRAW"] } },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
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
      ]),
    ])

    return NextResponse.json({
      pending,
      pendingTopups: counts[0],
      pendingWithdraws: counts[1],
    })
  } catch (error) {
    console.error("[admin/wallet] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
