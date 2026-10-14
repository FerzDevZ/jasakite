import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import { ServiceTile } from "@/components/services/service-tile"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { StatCard } from "@/components/dashboard/stat-card"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { PageHeader } from "@/components/layout/page-shell"
import { OrderKanban } from "@/components/provider/order-kanban"
import { formatIDR } from "@/lib/utils"
import {
  Plus,
  Store,
  Wallet,
  Inbox,
  Star,
  ArrowRight,
  Clock,
  Package,
} from "lucide-react"

export default async function ProviderDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "PROVIDER") redirect("/dashboard")

  const providerIdNum = prismaId(session.user.id) || 0

  const [
    services,
    serviceStats,
    orderStats,
    recentOrders,
    todayOrders,
    revenueStats,
    ratingStats,
  ] = await Promise.all([
    prisma.service.findMany({
      where: { providerId: providerIdNum },
      include: { provider: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.service.aggregate({
      where: { providerId: providerIdNum },
      _count: { id: true },
      _sum: { price: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { service: { providerId: providerIdNum } },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { service: { providerId: providerIdNum } },
      include: {
        service: { select: { title: true, slug: true } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.order.count({
      where: {
        service: { providerId: providerIdNum },
        createdAt: {
          gte: (() => {
            // WIB start-of-day (P1-4): midnight Asia/Jakarta -> UTC
            const wibDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" })
            return new Date(`${wibDate}T00:00:00+07:00`)
          })(),
        },
      },
    }),
    prisma.order.aggregate({
      where: { service: { providerId: providerIdNum }, status: "COMPLETED" },
      _sum: { totalPrice: true },
    }),
    prisma.service.aggregate({
      where: { providerId: providerIdNum, status: "ACTIVE" },
      _avg: { ratingAvg: true },
    }),
  ])

  const totalCount = serviceStats._count?.id ?? 0
  const totalValue = serviceStats._sum?.price ?? 0
  const ratingAvg = ratingStats._avg?.ratingAvg ?? 0
  const revenue = revenueStats._sum?.totalPrice ?? 0
  const orderCountByStatus = Object.fromEntries(
    orderStats.map((o) => [o.status, o._count.id]),
  )
  const incomingCount =
    (orderCountByStatus.PENDING ?? 0) + (orderCountByStatus.IN_PROGRESS ?? 0)

  // Sidebar sudah dirender oleh app/dashboard/layout.tsx — membungkus ulang
  // dengan DashboardShell di sini menghasilkan dua sidebar bertumpuk.
  return (
    <div className="space-y-8 animate-content-in">
      <PageHeader
        title="Dashboard Provider"
        description="Kelola layanan dan pesanan yang masuk ke jasa Anda."
        actions={
          <Button asChild>
            <Link href="/dashboard/provider/buka-jasa">
              <Plus /> Tambah Layanan
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Layanan"
          value={totalCount}
          icon={Store}
          tone="primary"
          href="/dashboard/provider/buka-jasa"
        />
        <StatCard
          label="Nilai Portofolio"
          value={formatIDR(totalValue)}
          icon={Wallet}
          tone="success"
          href="/dashboard/provider/buka-jasa"
        />
        <StatCard
          label="Order Masuk"
          value={incomingCount}
          icon={Inbox}
          tone="warning"
          hint="Menunggu + dikerjakan"
          href="/dashboard/provider"
        />
        <StatCard
          label="Order Hari Ini"
          value={todayOrders}
          icon={Clock}
          tone="info"
          href="/dashboard/provider"
        />
      </div>

      {/* Kanban: aksi paling sering dipakai provider ("Terima & Kerjakan")
          ditempatkan sebelum daftar layanan agar tidak perlu masuk ke detail
          pesanan satu per satu. Client component — statusnya interaktif. */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Pesanan Masuk</h2>
        <OrderKanban />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Layanan Kamu</h2>
          <Link
            href="/dashboard/provider/buka-jasa"
            className="focus-ring inline-flex items-center gap-1 rounded text-sm font-medium text-primary-strong hover:underline"
          >
            Kelola semua <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {services.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceTile key={service.id} service={service} media="sm" />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Store}
            title="Belum ada layanan"
            description="Buka jasa pertama Anda agar mulai menerima pesanan dari pelanggan."
            action={
              <Button asChild>
                <Link href="/dashboard/provider/buka-jasa">
                  <Plus /> Buka Jasa
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Package className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden />{" "}
            Order Terbaru
          </h2>
          {incomingCount > 0 && (
            <Badge variant="warning">{incomingCount} menunggu tindakan</Badge>
          )}
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="focus-ring group flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    Pesanan #{order.id} — {order.service.title}
                    <OrderStatusBadge status={order.status} compact />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Oleh {order.customer.name ?? "Customer"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right text-xs text-muted-foreground">
                    <div>
                      {new Date(order.createdAt).toLocaleDateString("id-ID")}
                    </div>
                    <div className="font-semibold text-primary-strong">
                      {formatIDR(order.totalPrice)}
                    </div>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-base group-hover:translate-x-0.5 group-hover:text-primary-strong"
                    aria-hidden
                  />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Inbox}
            title="Belum ada order"
            description="Order dari pelanggan akan muncul di sini begitu jasa Anda dipesan."
          />
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-1 text-sm font-medium text-muted-foreground">
              Rating Rata-rata
            </p>
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-rating text-rating" aria-hidden />
            <span className="text-2xl font-bold tabular-nums">
              {ratingAvg > 0 ? ratingAvg.toFixed(1) : "—"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Berdasarkan rating agregat seluruh layanan aktif Anda.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="mb-1 text-sm font-medium text-muted-foreground">
              Total Pendapatan (Selesai)
            </p>
          <div className="text-2xl font-bold tabular-nums text-primary-strong">
            {formatIDR(revenue)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Dari {orderCountByStatus.COMPLETED ?? 0} pesanan selesai. Nilai
            portofolio layanan: {formatIDR(totalValue)}
          </p>
        </div>
      </div>
    </div>
  )
}
