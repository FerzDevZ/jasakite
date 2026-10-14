"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { RefreshCw, Home, AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Page error:", error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive-strong">
        <AlertTriangle className="h-9 w-9" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">
        Terjadi kesalahan
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Maaf, halaman ini gagal dimuat. Silakan coba lagi atau kembali ke
        beranda.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/60">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="h-4 w-4" /> Coba Lagi
        </Button>
        <Link href="/">
          <Button variant="outline">
            <Home className="h-4 w-4" /> Beranda
          </Button>
        </Link>
      </div>
    </div>
  )
}
