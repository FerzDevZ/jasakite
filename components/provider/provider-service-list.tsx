"use client"

import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/toast-dynamic"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { ServiceStatusBadge } from "@/components/orders/order-status-badge"
import { Eye, EyeOff, ExternalLink, Loader2, PlusCircle } from "lucide-react"
import { formatIDR } from "@/lib/utils"
import { markPending, rollback } from "@/lib/optimistic"
import { haptic } from "@/lib/haptic"
import { csrfFetch } from "@/lib/csrf-fetch"

type OwnService = {
  id: string | number
  title: string
  slug: string
  price: number
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
  createdAt: string
  category: { id: string | number; name: string }
  _count: { orders: number }
}

/**
 * Daftar jasa milik provider dengan aksi tayang/sembunyikan.
 *
 * `toggleStatus` sebelumnya `await fetch()` tanpa memeriksa `res.ok` sama
 * sekali: kalau server menolak (mis. sesi kedaluwarsa), daftar tetap
 * di-refetch dan status lama muncul kembali tanpa pesan apa pun — provider
 * mengira tombolnya rusak. Sekarang pakai mutation dengan toast + state busy
 * per baris.
 */
export function ProviderServiceList({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient()

  const { data: services, isLoading } = useQuery<OwnService[]>({
    queryKey: ["my-services"],
    queryFn: async () => {
      const res = await fetch("/api/provider/services")
      if (!res.ok) throw new Error("Gagal memuat jasa")
      return res.json()
    },
    enabled,
  })

  // Optimistik ala kanban: badge status berbalik seketika saat tombol ditekan,
  // server menjadi sumber kebenaran via invalidate; gagal → snapshot kembali.
  const toggleMutation = useMutation({
    mutationFn: async (service: OwnService) => {
      const next = service.status === "ACTIVE" ? "DRAFT" : "ACTIVE"
      const res = await csrfFetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Gagal mengubah status jasa")
      }
      return { service, next }
    },
    onMutate: async (service: OwnService) => {
      await queryClient.cancelQueries({ queryKey: ["my-services"] })
      const previous = queryClient.getQueryData<OwnService[]>(["my-services"])
      const next = service.status === "ACTIVE" ? "DRAFT" : "ACTIVE"
      queryClient.setQueryData<OwnService[]>(["my-services"], (old) =>
        old ? markPending(old, (s) => s.id === service.id, { status: next }) : old
      )
      haptic()
      return { previous: rollback(previous ?? []) }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-services"] })
      queryClient.invalidateQueries({ queryKey: ["provider-orders"] })
    },
    onSuccess: ({ service, next }) => {
      toast.success(
        next === "ACTIVE" ? "Jasa ditayangkan" : "Jasa disembunyikan",
        {
          description:
            next === "ACTIVE"
              ? `"${service.title}" kembali muncul di katalog.`
              : `"${service.title}" tidak lagi muncul di katalog.`,
        }
      )
    },
    onError: (error: Error, _service, context) => {
      queryClient.setQueryData(["my-services"], context?.previous)
      toast.error("Gagal mengubah status", { description: error.message })
    },
  })

  const busyId = toggleMutation.isPending
    ? toggleMutation.variables?.id
    : undefined

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (!services || services.length === 0) {
    return (
      <EmptyState
        icon={PlusCircle}
        title="Belum ada jasa"
        description="Buat jasa pertama Anda lewat formulir di atas — langsung tayang setelah dikirim."
      />
    )
  }

  return (
    <div className="space-y-3">
      {services.map((service) => {
        const busy = busyId === service.id
        const active = service.status === "ACTIVE"
        return (
          <div
            key={service.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/service/${service.slug}`}
                  className="focus-ring rounded font-semibold hover:text-primary-strong"
                >
                  {service.title}
                </Link>
                <ServiceStatusBadge status={service.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {service.category.name} • {service._count.orders} pesanan •{" "}
                {formatIDR(service.price)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant={active ? "outline" : "default"}
                disabled={busy}
                onClick={() => toggleMutation.mutate(service)}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : active ? (
                  <EyeOff aria-hidden />
                ) : (
                  <Eye aria-hidden />
                )}
                {active ? "Sembunyikan" : "Tayangkan"}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link
                  href={`/service/${service.slug}`}
                  target="_blank"
                  rel="noopener"
                  aria-label={`Buka halaman publik ${service.title} di tab baru`}
                >
                  <ExternalLink aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
