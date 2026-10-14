"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Counter } from "@/components/landing/counter"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyState } from "@/components/ui/empty-state"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { PageHeader } from "@/components/layout/page-shell"
import { OgPhotoHealthStrip } from "@/components/dashboard/og-photo-health"
import {
  Users,
  Package,
  Wallet,
  Store,
  Star,
  ArrowRight,
  ShieldCheck,
  Download,
  Inbox,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import { formatIDR } from "@/lib/utils"

// Grafik dimuat terpisah: recharts ~150 kB dan tidak dibutuhkan untuk render
// pertama. Skeleton menahan tinggi kartu agar tidak ada layout shift.
const ChartFallback = () => <Skeleton className="h-full w-full rounded-lg" />

const OrdersAreaChart = dynamic(
  () => import("@/components/dashboard/admin-charts").then((m) => m.OrdersAreaChart),
  { ssr: false, loading: ChartFallback }
)
const CategoryRevenueChart = dynamic(
  () =>
    import("@/components/dashboard/admin-charts").then(
      (m) => m.CategoryRevenueChart
    ),
  { ssr: false, loading: ChartFallback }
)

type AdminStats = {
  totalUsers: number
  totalProviders: number
  totalCustomers: number
  totalServices: number
  activeServices: number
  draftServices: {
    id: string | number
    title: string
    provider: { name: string | null }
    category: { name: string }
  }[]
  totalOrders: number
  revenue: number
  avgRating: number
  recentOrders: {
    id: string | number
    totalPrice: number
    status: string
    customer: { name: string | null }
    service: {
      title: string
      provider: { name: string | null }
      category: { name: string }
    }
  }[]
  ordersByDay: { date: string; count: number }[]
  categoryRevenue: { name: string; value: number }[]
  topProviders: { id: string | number; name: string; revenue: number; orders: number }[]
  statusBreakdown: {
    PENDING: number
    IN_PROGRESS: number
    COMPLETED: number
    CANCELLED: number
  }
}

type Kpi = {
  label: string
  value: number
  sub: string
  icon: LucideIcon
  money?: boolean
  decimals?: number
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
    else if (session.user.role !== "ADMIN") router.push("/dashboard")
  }, [session, status, router])

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Gagal memuat statistik")
      return res.json()
    },
    enabled: session?.user?.role === "ADMIN",
  })

  if (status === "loading" || !session || session.user.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex flex-wrap justify-center gap-4 md:grid md:grid-cols-3 md:justify-items-stretch xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-[calc(50%-0.5rem)] rounded-2xl md:w-auto" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  const kpis = [
    {
      label: "Pengguna",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      tone: "info" as const,
      href: "/dashboard/admin/users",
      hint: `${stats?.totalProviders ?? 0} provider • ${stats?.totalCustomers ?? 0} customer`,
    },
    {
      label: "Pesanan",
      value: stats?.totalOrders ?? 0,
      icon: Package,
      tone: "primary" as const,
      href: "/dashboard/admin",
      hint: `${stats?.statusBreakdown.PENDING ?? 0} menunggu`,
    },
    {
      label: "Pendapatan",
      value: formatIDR(stats?.revenue ?? 0),
      icon: Wallet,
      tone: "success" as const,
      href: "/dashboard/admin",
    },
    {
      label: "Jasa Aktif",
      value: stats?.activeServices ?? 0,
      icon: Store,
      tone: "warning" as const,
      href: "/dashboard/admin/moderasi",
      hint: `dari ${stats?.totalServices ?? 0} total`,
    },
    {
      label: "Rating Rata-rata",
      value: stats?.avgRating ?? 0,
      icon: Star,
      tone: "muted" as const,
      href: "/dashboard/admin",
      hint: "jasa aktif",
    },
  ]

  return (
    <div className="space-y-8 animate-content-in">
      <PageHeader
        title="Ringkasan Platform"
        description="Kesehatan JASAKITE dalam satu layar."
        actions={
          <a
            href="/api/admin/export"
            download
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary-strong"
          >
            <Download className="h-4 w-4" aria-hidden />
            Ekspor CSV Pesanan
          </a>
        }
      />

      <div className="flex flex-wrap justify-center gap-4 md:grid md:grid-cols-3 md:justify-items-stretch xl:grid-cols-5">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          : kpis.map((kpi) => (
              <StatCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                tone={kpi.tone}
                href={kpi.href}
                hint={kpi.hint}
                className="w-[calc(50%-0.5rem)] md:w-auto"
              />
            ))}
      </div>

      {/* Kesehatan foto kartu OG ditaruh tepat di bawah KPI: kegagalannya
          menyamar sebagai kartu yang sah (HTTP 200, panel monogram), jadi ia
          harus terlihat tanpa dicari — bukan diselipkan di antara grafik. */}
      <OgPhotoHealthStrip />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pesanan 14 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <ChartFallback />
            ) : (
              <OrdersAreaChart data={stats?.ordersByDay ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pendapatan per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {isLoading ? (
              <ChartFallback />
            ) : (
              <CategoryRevenueChart data={stats?.categoryRevenue ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {(stats?.draftServices?.length ?? 0) > 0 && (
        <Card className="border-primary/25">
          <CardHeader className="flex-col items-start gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary-strong" aria-hidden />
              Moderasi — {stats?.draftServices.length} jasa menunggu
            </CardTitle>
            <Link
              href="/dashboard/admin/moderasi"
              className="focus-ring inline-flex items-center gap-1 rounded text-sm font-medium text-primary-strong hover:underline"
            >
              Buka moderasi <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats?.draftServices.slice(0, 4).map((s) => (
                <span
                  key={s.id}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  {s.title}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pesanan Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : (stats?.recentOrders?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Belum ada pesanan"
              description="Pesanan yang masuk ke platform akan tampil di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Lima pesanan terbaru di seluruh platform
                </caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="p-3 font-medium">Jasa</th>
                    <th scope="col" className="p-3 font-medium">Customer</th>
                    <th scope="col" className="p-3 font-medium">Provider</th>
                    <th scope="col" className="p-3 font-medium">Status</th>
                    <th scope="col" className="p-3 font-medium">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentOrders ?? []).map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-border last:border-0 hover:bg-accent/60"
                    >
                      <td className="p-3 font-medium">
                        {/* Baris sebelumnya memakai onClick pada <tr> — tidak
                            bisa diakses keyboard. Tautan sekarang eksplisit. */}
                        <Link
                          href={`/orders/${o.id}`}
                          className="focus-ring rounded hover:text-primary-strong"
                        >
                          {o.service.title}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {o.customer.name ?? "Customer"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {o.service.provider.name}
                      </td>
                      <td className="p-3">
                        <OrderStatusBadge status={o.status} compact />
                      </td>
                      <td className="p-3 font-semibold tabular-nums">
                        {formatIDR(o.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 5 Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (stats?.topProviders?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Belum ada peringkat"
              description="Peringkat provider muncul setelah ada pesanan yang selesai."
            />
          ) : (
            <div className="space-y-2">
              {(stats?.topProviders ?? []).map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-background p-3.5"
                >
                  <span className="w-6 shrink-0 text-center text-lg font-extrabold text-primary-strong/50">
                    {i + 1}
                  </span>
                  <Link
                    href={`/provider/${p.id}`}
                    className="focus-ring flex-1 truncate rounded font-medium hover:text-primary-strong"
                  >
                    {p.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p.orders} pesanan
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-primary-strong">
                    {formatIDR(p.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
