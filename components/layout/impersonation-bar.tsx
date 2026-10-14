"use client"

import { useState } from "react"
import { UserRound, ArrowLeftRight, Loader2 } from "lucide-react"
// toast ter-defer: ImpersonationBar termount di SEMUA halaman lewat Navbar,
// import statis sonner menarik ~34KB ke jendela kritis hydrate semua halaman.
import { toast } from "@/lib/toast-dynamic"

export function ImpersonationBar({
  name,
  role,
}: {
  name: string
  role: string
}) {
  const [busy, setBusy] = useState(false)

  const restore = async () => {
    setBusy(true)
    const res = await fetch("/api/auth/unimpersonate", { method: "POST" })
    if (!res.ok) {
      // Tanpa pemeriksaan ini, kegagalan tetap diikuti redirect: admin mendarat
      // di halaman pengguna sambil masih menyandang sesi user lain tanpa tahu.
      const data = await res.json().catch(() => null)
      toast.error("Gagal kembali ke akun admin", {
        description: data?.error ?? "Coba lagi, atau keluar lalu masuk kembali.",
      })
      setBusy(false)
      return
    }
    // Reload penuh diperlukan di sini: cookie sesi berganti, jadi seluruh
    // state klien (termasuk cache React Query) harus dibuang.
    window.location.href = "/dashboard/admin/users"
  }

  const roleLabel =
    role === "PROVIDER" ? "Penyedia Jasa" : role === "CUSTOMER" ? "Customer" : role

  return (
    <div className="border-t border-warning/30 bg-warning/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <span className="flex items-center gap-2 font-medium text-foreground">
          <UserRound className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          Mode tampil sebagai:{" "}
          <span className="font-bold">{name}</span>
          {/* Chip solid, bukan bg-warning/15: warna warning di atas bar yang
              sudah bg-warning/10 hanya 3.87:1 — gagal AA untuk teks 2xs. */}
          <span className="rounded-full bg-warning px-2 py-0.5 text-2xs font-semibold text-warning-foreground">
            {roleLabel}
          </span>
        </span>
        <button
          type="button"
          onClick={restore}
          disabled={busy}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-bold text-background transition-all hover:opacity-85 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
          )}
          Kembali ke Admin
        </button>
      </div>
    </div>
  )
}
