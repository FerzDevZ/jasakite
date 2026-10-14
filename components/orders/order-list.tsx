"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Clock, PackageSearch } from "lucide-react"
import { PageShell, PageHeader } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Segmented } from "@/components/ui/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { formatIDR } from "@/lib/utils"
import { cn } from "@/lib/utils"

type OrderRow = {
  id: string
  code: string | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  totalPrice: number
  qty: number
  createdAt: string
  deadline: string | null
  service: {
    title: string
    slug: string
    imageUrl: string | null
    provider: { name: string | null }
  }
}

type Filter = "ACTIVE" | "ALL" | "COMPLETED" | "CANCELLED"

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "ALL", label: "Semua" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "CANCELLED", label: "Batal" },
]

/**
 * Daftar pesanan pelanggan.
 *
 * Halaman ini yang menggantikan kebiasaan "buka dashboard lalu cari kartu":
 * default filternya **Aktif**, bukan Semua, karena pertanyaan yang membawa
 * orang ke sini hampir selalu "pesananku sudah sampai mana?" — dan jawabannya
 * selalu ada di pesanan yang belum selesai, berapa pun banyaknya riwayat lama.
 */
export function OrderList() {
  const router = useRouter()
  const [filter, setFilter] = React.useState<Filter>("ACTIVE")

  const { data, isLoading, isError } = useQuery<OrderRow[]>({
    queryKey: ["orders", "list"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { cache: "no-store" })
      if (res.status === 401) {
        router.replace("/login")
        throw new Error("Sesi berakhir")
      }
      if (!res.ok) throw new Error("Gagal memuat pesanan")
      return res.json()
    },
    staleTime: 15_000,
  })

  const orders = data ?? []
  const active = orders.filter(
    (o) => o.status === "PENDING" || o.status === "IN_PROGRESS"
  )

  const visible =
    filter === "ACTIVE"
      ? active
      : filter === "ALL"
        ? orders
        : orders.filter((o) => o.status === filter)

  return (
    <PageShell width="prose" className="py-8 animate-content-in">
      <PageHeader
        title="Pesanan"
        description={
          active.length > 0
            ? `${active.length} pesanan sedang berjalan. Ketuk untuk melihat progresnya.`
            : "Semua pesananmu tersimpan di sini beserta progresnya."
        }
      />

      <div className="mt-5">
        <Segmented<Filter>
          ariaLabel="Saring pesanan"
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((f) => ({
            value: f.value,
            label:
              f.value === "ACTIVE" && active.length > 0
                ? `Aktif (${active.length})`
                : f.label,
          }))}
        />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={PackageSearch}
            title="Pesanan gagal dimuat"
            description="Koneksi ke server terputus. Coba muat ulang halaman ini."
            action={<Button onClick={() => router.refresh()}>Muat ulang</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={
              filter === "ACTIVE"
                ? "Tidak ada pesanan aktif"
                : "Belum ada pesanan di sini"
            }
            description={
              filter === "ACTIVE"
                ? "Pesanan yang sedang berjalan akan muncul di sini beserta progresnya."
                : "Riwayat pesanan akan terisi begitu kamu memesan jasa pertama."
            }
            action={
              <Link href="/services">
                <Button className="shadow-glow">Cari jasa</Button>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {visible.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}

function OrderCard({ order }: { order: OrderRow }) {
  const waiting = order.status === "PENDING"
  const working = order.status === "IN_PROGRESS"

  return (
    <Link
      href={`/orders/${order.id}`}
      className={cn(
        "focus-ring block rounded-2xl border bg-card p-3.5 transition-colors sm:p-4",
        waiting || working
          ? "border-primary/30 hover:border-primary/60"
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-2xs font-semibold text-muted-foreground">
            {order.code ? `#${order.code}` : `#${order.id}`}
          </p>
          <p className="mt-1 text-2xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <OrderStatusBadge status={order.status} compact />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-accent">
          {order.service.imageUrl ? (
            <Image
              src={order.service.imageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              unoptimized={order.service.imageUrl.startsWith("data:")}
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-semibold">
            {order.service.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {order.service.provider.name ?? "Penyedia"}
            {order.qty > 1 ? ` · ${order.qty} unit` : ""}
          </p>
          {(waiting || working) && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                waiting ? "text-warning" : "text-info"
              )}
            >
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              {waiting
                ? "Menunggu konfirmasi penyedia"
                : "Sedang dikerjakan penyedia"}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-primary-strong">
            {formatIDR(order.totalPrice)}
          </p>
          <ChevronRight
            className="ml-auto mt-1 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  )
}
