"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Home, ShieldAlert } from "lucide-react"
import Link from "next/link"

/**
 * Boundary crash FATAL — menangkap exception yang lolos di atas app/error.tsx
 * (di sana ia adalah error PER HALAMAN via Next overflow error boundary).
 *
 * Dua komponen ini punya peran berbeda dan keduanya diperlukan:
 * - app/error.tsx     → crash saat RENDERS satu route; sembuh dengan `reset`.
 * - components/layout/
 *   global-error-boundary.tsx → crash saat HYDRATION/module-load aman dari
 *                               App Router perilaku generic — Next.js default
 *                               error page ("Application error: a client-side
 *                              exception has occurred") hanya berupa teks
 *                               statis tanpa jalan keluar. Komponen ini
 *                               menawarkan jalan keluar nyata.
 */

export function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    console.error("[global-boundary] Fatal client error:", error)
  }, [error])

  /**
   * "Muat Ulang Bersih": reload dengan dance yang menargetkan penyebab
   * terbukti dari laporan HP crash — stale shell yang menunjuk chunk/ versi
   * lama yang sudah hilang dari server setelah deploy.
   *
   * 1. Unregister service worker + hapus semua cache (jasakite-v*).
   * 2. location.replace("/") — menyegarkan versi shell.
   */
  const cleanReload = async () => {
    setResetting(true)
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((reg) => reg.unregister()))
      }
      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
    } catch {
      // Cache API bisa ditolak mode incognito atau storage penuh — gagal
      // bersih di sini tidak boleh menggagalkan reload itu sendiri.
    }
    location.replace("/")
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive-strong">
        <ShieldAlert className="h-9 w-9" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        Aplikasi tidak dapat dimuat
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ada data lokal kedaluwarsa di perangkat ini yang membuat aplikasi gagal
        dinyalakan. Membersihkannya biasanya menyelesaikan masalah — tanpa
        kehilangan pesanan Anda.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={cleanReload} disabled={resetting} variant="default">
          <RefreshCw className="h-4 w-4" />
          {resetting ? "Membersihkan…" : "Muat Ulang Bersih"}
        </Button>
        <Button onClick={reset} variant="outline">
          Coba Lagi
        </Button>
        <Link href="/">
          <Button variant="ghost">
            <Home className="h-4 w-4" /> Beranda
          </Button>
        </Link>
      </div>
    </div>
  )
}
