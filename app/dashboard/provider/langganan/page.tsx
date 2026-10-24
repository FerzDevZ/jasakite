"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Loader2,
  ShieldAlert,
  Wallet,
} from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"

type SubscriptionHistoryRow = {
  id: string
  amount: number
  periodStart: string
  periodEnd: string
  status: string
  source: string
  createdAt: string
}

type SubscriptionView = {
  state: "ACTIVE" | "EXPIRED" | "NEVER"
  label: string
  until: string | null
  daysLeft: number
  canPublish: boolean
  monthlyPrice: number
  balance: number
  history: SubscriptionHistoryRow[]
}

function tanggal(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Halaman langganan penyedia.
 *
 * Menjelaskan satu aturan produk dengan angka nyata: Rp10.000/bulan (harga
 * ditentukan SUPER_ADMIN), dipotong otomatis dari saldo dompet tiap 30 hari.
 * Tombol "Perpanjang sekarang" memakai endpoint yang sama dengan cron, jadi
 * tidak ada jalur pembayaran kedua yang harus diuji terpisah.
 */
export default function ProviderSubscriptionPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<SubscriptionView>({
    queryKey: ["provider-subscription"],
    queryFn: async () => {
      const response = await fetch("/api/provider/subscription", {
        cache: "no-store",
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(payload?.error ?? "Gagal memuat data langganan")
      }
      return response.json() as Promise<SubscriptionView>
    },
  })

  const charge = useMutation({
    mutationFn: async () => {
      const response = await csrfFetch("/api/provider/subscription", {
        method: "POST",
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; periodEnd?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.error ?? "Perpanjangan gagal diproses")
      }
      return payload
    },
    onSuccess: async () => {
      toast.success("Langganan diperpanjang", {
        description: "Saldo dompet sudah dipotong dan masa aktif bertambah 30 hari.",
      })
      await queryClient.invalidateQueries({ queryKey: ["provider-subscription"] })
    },
    onError: (error: Error) => {
      toast.error("Perpanjangan gagal", { description: error.message })
      void queryClient.invalidateQueries({ queryKey: ["provider-subscription"] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Langganan tidak bisa dimuat"
        description="Periksa koneksi lalu muat ulang halaman."
      />
    )
  }

  const saldoCukup = data.balance >= data.monthlyPrice
  const aktif = data.state === "ACTIVE"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Langganan Penyedia</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Menayangkan jasa di JASAKITE adalah layanan berlangganan. Biaya
          dipotong otomatis dari saldo dompet setiap 30 hari, dan jasa Anda
          disembunyikan dari katalog bila langganan berakhir.
        </p>
      </div>

      {!aktif && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">
              {data.state === "NEVER"
                ? "Langganan belum pernah aktif"
                : "Langganan sudah berakhir"}
            </p>
            <p className="mt-0.5">
              Jasa Anda tidak muncul di katalog dan jasa baru tidak bisa
              ditayangkan sampai saldo cukup dan langganan diperpanjang.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary-strong" aria-hidden />
              Masa aktif
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-lg font-semibold">{data.label}</p>
            <p className="text-sm text-muted-foreground">
              {aktif
                ? `Sisa ${data.daysLeft} hari. Perpanjangan berikutnya dipotong otomatis dari saldo.`
                : "Masa aktif habis — jasa disembunyikan sampai diperpanjang."}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => charge.mutate()}
                disabled={charge.isPending || !saldoCukup}
              >
                {charge.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <CreditCard className="h-4 w-4" aria-hidden />
                )}
                Perpanjang {formatIDR(data.monthlyPrice)}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/wallet">Isi saldo</Link>
              </Button>
            </div>
            {!saldoCukup && (
              <p className="text-xs text-destructive-strong">
                Saldo dompet {formatIDR(data.balance)} belum cukup untuk{" "}
                {formatIDR(data.monthlyPrice)}. Isi saldo dulu, lalu perpanjang.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary-strong" aria-hidden />
              Tagihan bulanan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Biaya per 30 hari</span>
              <span className="text-lg font-semibold">
                {formatIDR(data.monthlyPrice)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Saldo dompet</span>
              <span className="font-semibold">{formatIDR(data.balance)}</span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">
              Harga ditetapkan SUPER_ADMIN dan berlaku untuk semua penyedia.
              Saldo berasal dari pendapatan pesanan atau isi saldo via QRIS.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat langganan</CardTitle>
        </CardHeader>
        <CardContent>
          {data.history.length === 0 ? (
            <EmptyState
              icon={BadgeCheck}
              title="Belum ada riwayat"
              description="Riwayat akan muncul setelah langganan pertama dipotong dari saldo."
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.history.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {tanggal(row.periodStart)} — {tanggal(row.periodEnd)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.source === "ADMIN_GRANT"
                        ? "Diberikan admin"
                        : "Potong saldo otomatis"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {row.amount > 0 ? formatIDR(row.amount) : "Gratis"}
                    </span>
                    <span
                      className={
                        row.status === "ACTIVE"
                          ? "rounded-full bg-success-soft px-2.5 py-1 text-2xs font-semibold text-success"
                          : "rounded-full bg-muted px-2.5 py-1 text-2xs font-semibold text-muted-foreground"
                      }
                    >
                      {row.status === "ACTIVE" ? "Aktif" : "Berakhir"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
