"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ArrowDownToLine, Wallet } from "lucide-react"
import { formatIDR } from "@/lib/utils"

/**
 * Saldo dompet untuk checkout — dua komponen kecil yang dipakai bersama oleh
 * checkout per-satu-jasa (app/checkout) dan checkout keranjang.
 *
 * Sebelumnya metode "Saldo JASAKITE" buta: pengguna baru tahu saldo kurang
 * setelah menekan Bayar, dari toast error 409 tanpa jalan keluar. Query ini
 * memakai `?slim=1` (hanya angka saldo — tanpa 50 baris riwayat yang memuat
 * data URI bukti) dan kunci ["wallet", "slim"]: masih ber-prefix "wallet",
 * jadi invalidate halaman Dompet setelah top-up ikut menyegarkannya.
 */
type SlimWallet = { balance: number }

export function useCheckoutBalance(enabled: boolean): {
  balance: number | null
  loading: boolean
} {
  const query = useQuery<SlimWallet>({
    queryKey: ["wallet", "slim"],
    queryFn: async () => {
      const response = await fetch("/api/wallet?slim=1", { cache: "no-store" })
      if (response.status === 401) throw new Error("Sesi berakhir")
      if (!response.ok) throw new Error("Gagal memuat saldo")
      return response.json()
    },
    enabled,
  })

  // `balance === null` mencakup query gagal (tamu/jaringan) — blokir submit
  // hanya bila angkanya PASTI diketahui; kalau tidak, biarkan server yang
  // menolak, jangan memblokir buta.
  return {
    balance: query.data?.balance ?? null,
    loading: query.isLoading,
  }
}

/**
 * Panel saldo di kartu pembayaran — tampil hanya saat metode Saldo dipilih.
 * Cukup: saldo sekarang + sisa. Kurang: nominal kekurangan + tombol "Isi
 * saldo" (draft checkout tersimpan di localStorage/keranjang server, jadi
 * pindah ke Dompet dan kembali tidak menghilangkan isi form).
 */
export function SaldoBalanceNotice({
  total,
  balance,
  loading,
}: {
  total: number
  balance: number | null
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <Wallet className="h-4 w-4 animate-pulse" aria-hidden />
        Memuat saldo dompet…
      </div>
    )
  }
  if (balance === null) return null

  const shortfall = total - balance
  if (shortfall <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success-soft px-4 py-3 text-sm text-success">
        <Wallet className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Saldo {formatIDR(balance)} — cukup untuk total {formatIDR(total)}.
        </span>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="space-y-2.5 rounded-lg bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          Saldo {formatIDR(balance)} — kurang {formatIDR(shortfall)} untuk total
          ini. Bayar dengan metode lain atau isi saldo dulu.
        </span>
      </div>
      <Link
        href="/dashboard/wallet"
        className="focus-ring inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-background px-4 py-2 text-xs font-bold text-primary-strong transition-transform duration-base hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
      >
        <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden /> Isi saldo
      </Link>
    </div>
  )
}
