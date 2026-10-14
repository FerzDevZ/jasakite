"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"

/**
 * Panel error untuk error.tsx per segmen. Berbeda dari error.tsx root: ini
 * dirender DI DALAM shell (sidebar/navbar tetap ada), jadi pengguna tidak
 * kehilangan navigasi ketika satu panel gagal.
 */
export function ErrorPanel({
  error,
  reset,
  title = "Gagal memuat data",
  description = "Terjadi kesalahan saat mengambil data. Coba muat ulang; kalau masih gagal, laporkan Error ID di bawah.",
  backHref,
  backLabel,
}: {
  error: Error & { digest?: string }
  reset: () => void
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}) {
  useEffect(() => {
    console.error("Segment error:", error)
  }, [error])

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive-strong">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-bold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {error.digest && (
        <p className="mt-2 font-mono text-2xs text-muted-foreground/70">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Coba Lagi
        </Button>
        {backHref && backLabel && (
          <Link href={backHref}>
            <Button variant="outline">{backLabel}</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
