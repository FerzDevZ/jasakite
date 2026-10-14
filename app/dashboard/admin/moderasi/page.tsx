"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/layout/page-shell"
import { ServiceStatusBadge } from "@/components/orders/order-status-badge"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { ShieldCheck, Eye, CheckCircle2, Loader2 } from "lucide-react"
import { formatIDR } from "@/lib/utils"

type DraftService = {
  id: string | number
  title: string
  price: number
  slug: string
  createdAt: string
  provider: { name: string | null }
  category: { name: string }
}

type AdminStats = {
  draftServices: DraftService[]
}

export default function ModerasiPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | number | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
    else if (session.user.role !== "ADMIN") router.push("/dashboard")
  }, [session, status, router])

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) throw new Error("Gagal memuat data")
      return res.json()
    },
    enabled: session?.user?.role === "ADMIN",
  })

  // Aktivasi lewat mutation: sebelumnya `activate()` mengabaikan hasil fetch
  // sepenuhnya, jadi kegagalan server tampak seperti sukses (daftar hanya
  // di-refetch dan jasa tetap muncul tanpa penjelasan apa pun).
  const activateMutation = useMutation({
    mutationFn: async (service: DraftService) => {
      const res = await csrfFetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Gagal mengaktifkan jasa")
      }
      return service
    },
    onMutate: (service) => setBusyId(service.id),
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
      toast.success("Jasa diaktifkan", {
        description: `"${service.title}" sekarang tayang di katalog.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Gagal mengaktifkan jasa", { description: error.message })
    },
    onSettled: () => setBusyId(null),
  })

  if (status === "loading" || !session || session.user.role !== "ADMIN") {
    return <DashboardSkeleton stats={0} panels={1} />
  }

  const draft = stats?.draftServices ?? []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Moderasi Jasa"
        description="Tinjau jasa berstatus draf sebelum tayang ke publik."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : draft.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Tidak ada jasa menunggu moderasi"
          description="Semua jasa sudah tayang. Jasa draf baru akan muncul di sini otomatis."
        />
      ) : (
        <div className="space-y-3">
          {draft.map((s) => {
            const busy = busyId === s.id
            return (
              <div
                key={s.id}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{s.title}</span>
                    <ServiceStatusBadge status="DRAFT" />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {s.category.name} • {s.provider.name ?? "Provider"} •{" "}
                    <span className="font-semibold text-primary-strong">
                      {formatIDR(s.price)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/service/${s.slug}?preview=1`}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Pratinjau ${s.title} di tab baru (draft)`}
                    >
                      <Eye aria-hidden /> Lihat
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="shadow-glow"
                    disabled={busy}
                    onClick={() => activateMutation.mutate(s)}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <ShieldCheck aria-hidden />
                    )}
                    Aktifkan
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
