import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole } from "@/lib/roles"

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { role: true },
  })
  if (!isAdminRole(user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const limited = enforceRateLimit(
    request,
    "admin-stats",
    RATE_LIMITS.adminRead,
    session.user.id
  )
  if (limited) return limited

  const since = new Date(Date.now() - 13 * DAY_MS)
  // Awal bulan berjalan untuk memisahkan komisi bulan ini dari total
  // sepanjang masa. Memakai `completedAt`, bukan `createdAt`: komisi baru
  // menjadi milik platform saat pesanan selesai, bukan saat dipesan.
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  try {
  const [
    totalUsers,
    totalProviders,
    totalCustomers,
    totalServices,
    activeServices,
    draftServices,
    totalOrders,
    completedAgg,
    commissionMonthAgg,
    ratingAgg,
    recentOrders,
    statusGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "PROVIDER" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.service.count(),
    prisma.service.count({ where: { status: "ACTIVE" } }),
    prisma.service.findMany({
      where: { status: "DRAFT" },
      include: {
        provider: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalPrice: true, platformFee: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: {
        status: "COMPLETED",
        completedAt: { gte: monthStart },
      },
      _sum: { platformFee: true },
    }),
    prisma.service.aggregate({
      where: { status: "ACTIVE" },
      _avg: { ratingAvg: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: since } },
      include: {
        customer: { select: { name: true } },
        service: {
          select: {
            title: true,
            provider: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ])

  // Pesanan per hari — 14 hari terakhir
  const ordersByDay = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * DAY_MS)
    return {
      date: day.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      count: 0,
    }
  })
  const dayMap = new Map(ordersByDay.map((o) => [o.date, o]))
  const allRecent = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  })
  for (const o of allRecent) {
    const key = o.createdAt.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })
    const entry = dayMap.get(key)
    if (entry) entry.count++
  }

  // Pendapatan per kategori & provider — aggregasi di DB (groupBy serviceId)
  // Sebelumnya: findMany semua COMPLETED + loop JS (P0 perf). Sekarang:
  // 1) groupBy serviceId di DB untuk _sum totalPrice & _count
  // 2) fetch services terkait sekali (unique serviceIds) untuk mapping kategori/provider
  // 3) agregasi kategori/provider di JS tapi hanya sebanyak unique services, bukan ribuan orders
  const completedByService = await prisma.order.groupBy({
    by: ["serviceId"],
    where: { status: "COMPLETED" },
    _sum: { totalPrice: true, platformFee: true },
    _count: { _all: true },
  })

  const categoryRevenue = new Map<string, number>()
  const categoryCommission = new Map<string, number>()
  const providerStats = new Map<
    string | number,
    { name: string; revenue: number; orders: number }
  >()
  if (completedByService.length > 0) {
    const serviceIds = completedByService.map((g) => g.serviceId)
    const servicesForAgg = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        category: { select: { name: true } },
        provider: { select: { id: true, name: true } },
      },
    })
    const serviceMap = new Map(
      servicesForAgg.map((s) => [String(s.id), s])
    )
    for (const g of completedByService) {
      const svc = serviceMap.get(String(g.serviceId))
      if (!svc) continue
      const revenue = g._sum.totalPrice ?? 0
      const commission = g._sum.platformFee ?? 0
      const cat = svc.category.name
      categoryRevenue.set(cat, (categoryRevenue.get(cat) ?? 0) + revenue)
      categoryCommission.set(
        cat,
        (categoryCommission.get(cat) ?? 0) + commission
      )

      const pid = svc.provider.id as unknown as string | number
      const prev = providerStats.get(pid) ?? {
        name: svc.provider.name ?? "Provider",
        revenue: 0,
        orders: 0,
      }
      prev.revenue += revenue
      prev.orders += g._count._all
      providerStats.set(pid, prev)
    }
  }

  const statusBreakdown = {
    PENDING: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }
  for (const g of statusGroups) {
    statusBreakdown[g.status as keyof typeof statusBreakdown] = g._count._all
  }

  return NextResponse.json({
    totalUsers,
    totalProviders,
    totalCustomers,
    totalServices,
    activeServices,
    draftServices,
    totalOrders,
    // `revenue` tetap GMV (nilai transaksi selesai) agar kompatibel dengan
    // pemanggil lama. Komisi platform dilaporkan terpisah — inilah uang yang
    // benar-benar menjadi pendapatan JASAKITE.
    revenue: completedAgg._sum.totalPrice ?? 0,
    commissionRevenue: completedAgg._sum.platformFee ?? 0,
    commissionThisMonth: commissionMonthAgg._sum.platformFee ?? 0,
    completedOrders: completedAgg._count._all ?? 0,
    avgRating: ratingAgg._avg.ratingAvg ?? 0,
    recentOrders,
    ordersByDay,
    categoryRevenue: Array.from(categoryRevenue.entries()).map(
      ([name, value]) => ({ name, value })
    ),
    commissionByCategory: Array.from(categoryCommission.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
    topProviders: Array.from(providerStats.entries())
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    statusBreakdown,
  })
  } catch (error) {
    console.error("[admin/stats] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
