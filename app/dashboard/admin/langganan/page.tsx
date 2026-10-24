"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { BadgeCheck, Loader2, RefreshCw, ShieldAlert } from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"

type ProviderRow = {
  id: string
  name: string | null
  email: string
  city: string | null
  balance: number
  serviceCount: number
  state: "ACTIVE" | "EXPIRED" | "NEVER"
  daysLeft: number
  subscriptionUntil: string | null
}

type AdminSubscriptionPayload = {
  monthlyPrice: number
  defaultPrice: number
  minPrice: number
  maxPrice: number
  providers: ProviderRow[]
}

const STATE_LABEL: Record<ProviderRow["state"], string> = {
  ACTIVE: "Aktif",
  EXPIRED: "Berakhir",
  NEVER: "Belum berlangganan",
}

/**
 * Pengaturan langganan penyedia untuk admin.
 *
 * Harga hanya bisa diubah SUPER_ADMIN — server menolak PATCH dari ADMIN
 * biasa, dan tombolnya juga dinonaktifkan di sini supaya tidak terlihat
 * seolah berhasil. Tombol "Tagih sekarang" menjalankan cron yang sama, agar
 * demo tidak perlu menunggu jadwal harian.
 */
export default function AdminSubscriptionPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN"

  const { data, isLoading, isError } = useQuery<AdminSubscriptionPayload>({
    queryKey: ["admin-subscription"],
    queryFn: async () => {
      const response = await fetch("/api/admin/subscription", {
        cache: "no-store",
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(payload?.error ?? "Gagal memuat pengaturan langganan")
      }
      return response.json() as Promise<AdminSubscriptionPayload>
    },
  })

  const [priceDraft, setPriceDraft] = React.useState("")
  React.useEffect(() => {
    if (data && priceDraft === "") setPriceDraft(String(data.monthlyPrice))
  }, [data, priceDraft])

  const savePrice = useMutation({
    mutationFn: async (monthlyPrice: number) => {
      const response = await csrfFetch("/api/admin/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyPrice }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; monthlyPrice?: number }
        | null
      if (!response.ok) throw new Error(payload?.error ?? "Harga gagal disimpan")
      return payload
    },
    onSuccess: async () => {
      toast.success("Harga langganan diperbarui", {
        description: "Harga baru berlaku pada penagihan berikutnya.",
      })
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription"] })
    },
    onError: (error: Error) => {
      toast.error("Harga gagal disimpan", { description: error.message })
    },
  })

  const runBilling = useMutation({
    mutationFn: async () => {
      const response = await csrfFetch("/api/admin/subscription", {
        method: "POST",
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; checked?: number; charged?: number; insufficient?: number }
        | null
      if (!response.ok) throw new Error(payload?.error ?? "Penagihan gagal")
      return payload
    },
    onSuccess: async (payload) => {
      toast.success("Penagihan dijalankan", {
        description: `${payload?.charged ?? 0} penyedia ditagih, ${
          payload?.insufficient ?? 0
        } saldo tidak cukup.`,
      })
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription"] })
    },
    onError: (error: Error) => {
      toast.error("Penagihan gagal", { description: error.message })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Pengaturan tidak bisa dimuat"
        description="Periksa koneksi lalu muat ulang halaman."
      />
    )
  }

  const activeCount = data.providers.filter((p) => p.state === "ACTIVE").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Langganan Penyedia</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {activeCount} dari {data.providers.length} penyedia sedang aktif. Biaya
          dipotong otomatis dari saldo dompet setiap 30 hari; penyedia yang
          saldonya tidak cukup kehilangan tayangan jasanya.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Harga bulanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSuperAdmin && (
            <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Anda masuk sebagai ADMIN. Harga hanya bisa diubah SUPER_ADMIN.
            </p>
          )}
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              savePrice.mutate(Number(priceDraft))
            }}
          >
            <div className="w-full max-w-xs space-y-1.5">
              <Label htmlFor="monthly-price">Harga per 30 hari (Rp)</Label>
              <Input
                id="monthly-price"
                type="number"
                inputMode="numeric"
                min={data.minPrice}
                max={data.maxPrice}
                step={1000}
                value={priceDraft}
                disabled={!isSuperAdmin}
                onChange={(event) => setPriceDraft(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Berlaku {formatIDR(data.minPrice)} – {formatIDR(data.maxPrice)}.
                Bawaan {formatIDR(data.defaultPrice)}.
              </p>
            </div>
            <Button type="submit" disabled={!isSuperAdmin || savePrice.isPending}>
              {savePrice.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Simpan harga
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!isSuperAdmin || runBilling.isPending}
              onClick={() => runBilling.mutate()}
            >
              {runBilling.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-4 w-4" aria-hidden />
              )}
              Tagih sekarang
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Penyedia ({data.providers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.providers.length === 0 ? (
            <EmptyState
              icon={BadgeCheck}
              title="Belum ada penyedia"
              description="Akun penyedia akan muncul di sini setelah mendaftar."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Penyedia</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 pr-3 font-semibold">Saldo</th>
                    <th className="py-2 pr-3 font-semibold">Jasa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.providers.map((provider) => (
                    <tr key={provider.id}>
                      <td className="py-3 pr-3">
                        <p className="font-medium">{provider.name ?? "Tanpa nama"}</p>
                        <p className="text-xs text-muted-foreground">
                          {provider.email}
                          {provider.city ? ` • ${provider.city}` : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={
                            provider.state === "ACTIVE"
                              ? "rounded-full bg-success-soft px-2.5 py-1 text-2xs font-semibold text-success"
                              : "rounded-full bg-muted px-2.5 py-1 text-2xs font-semibold text-muted-foreground"
                          }
                        >
                          {STATE_LABEL[provider.state]}
                          {provider.state === "ACTIVE"
                            ? ` · ${provider.daysLeft} hari`
                            : ""}
                        </span>
                      </td>
                      <td className="py-3 pr-3 tabular-nums">
                        {formatIDR(provider.balance)}
                      </td>
                      <td className="py-3 pr-3 tabular-nums">{provider.serviceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
