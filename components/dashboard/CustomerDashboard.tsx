"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Package,
  CheckCircle2,
  Star,
  ArrowRight,
  Clock,
  Wallet,
  Timer,
  Search,
} from "lucide-react"
import { formatIDR } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyState } from "@/components/ui/empty-state"

type OrderItem = {
  id: string | number
  totalPrice: number
  status: string
  createdAt: string
  service: {
    title: string
    slug: string
    deliveryTimeDays: number
    ratingAvg: number
    provider: { name: string | null }
  }
}

type Filter = "all" | "active" | "completed"

// Tab sebelumnya hanya dekoratif — dirender tapi tidak memfilter apa pun.
const FILTERS: Record<Filter, (o: OrderItem) => boolean> = {
  all: () => true,
  active: (o) => o.status === "PENDING" || o.status === "IN_PROGRESS",
  completed: (o) => o.status === "COMPLETED",
}

export function CustomerDashboard() {
  const [filter, setFilter] = useState<Filter>("all")

  const { data: orders, isLoading } = useQuery<OrderItem[]>({
    queryKey: ["customer-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders")
      if (!res.ok) throw new Error("Gagal memuat pesanan")
      return res.json()
    },
  })

  const completed = orders?.filter((o) => o.status === "COMPLETED").length ?? 0
  const inProgress = orders?.filter((o) => o.status === "IN_PROGRESS").length ?? 0
  // Jangan hitung CANCELLED — sebelumnya semua status dijumlah (P1-3)
  const totalSpent = orders?.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + o.totalPrice, 0) ?? 0
  const visible = orders?.filter(FILTERS[filter]) ?? []

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Pesanan"
              value={orders?.length ?? 0}
              icon={Package}
              tone="primary"
              href="/dashboard/customer"
            />
            <StatCard
              label="Sedang Berjalan"
              value={inProgress}
              icon={Clock}
              tone="info"
              href="/dashboard/customer"
            />
            <StatCard
              label="Selesai"
              value={completed}
              icon={CheckCircle2}
              tone="success"
              href="/dashboard/customer"
            />
            <StatCard
              label="Total Belanja"
              value={formatIDR(totalSpent)}
              icon={Wallet}
              tone="warning"
              href="/dashboard/customer"
              className="[&_p]:break-words"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="flex-col items-start gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Riwayat Pesanan</CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">Semua</TabsTrigger>
              <TabsTrigger value="active">Aktif</TabsTrigger>
              <TabsTrigger value="completed">Selesai</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))
            ) : visible.length === 0 ? (
              <EmptyState
                icon={filter === "all" ? Search : Package}
                title={
                  filter === "all"
                    ? "Belum ada pesanan"
                    : "Tidak ada pesanan di filter ini"
                }
                description={
                  filter === "all"
                    ? "Jelajahi katalog jasa dan pesan yang Anda butuhkan. Riwayat pesanan akan muncul di sini."
                    : "Coba pilih tab lain untuk melihat pesanan Anda yang lain."
                }
                action={
                  filter === "all" ? (
                    <Link href="/services">
                      <Button className="shadow-glow">Jelajahi Jasa</Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              visible.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="focus-ring group flex flex-col gap-4 rounded-2xl border border-border p-5 transition-[shadow,border-color] duration-base hover:shadow-card hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 font-medium">
                      {order.service.title}
                      <OrderStatusBadge status={order.status} compact />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                      {/* Nomor pesanan sebelumnya tidak ditampilkan di sini,
                          padahal itu rujukan yang dipakai customer saat
                          menghubungi provider — dan satu-satunya pembeda kalau
                          ia memesan jasa yang sama dua kali. */}
                      <span>Pesanan #{order.id}</span>
                      <span>Oleh {order.service.provider.name ?? "Provider"}</span>
                      <span className="flex items-center gap-1">
                        <Star
                          className="h-3.5 w-3.5 fill-rating text-rating"
                          aria-hidden
                        />
                        {order.service.ratingAvg.toFixed(1)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" aria-hidden />
                        {order.service.deliveryTimeDays} hari
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary-strong">
                        {formatIDR(order.totalPrice)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </div>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-base group-hover:translate-x-0.5 group-hover:text-primary-strong"
                      aria-hidden
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
