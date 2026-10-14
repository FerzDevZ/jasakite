"use client"

import { ErrorPanel } from "@/components/layout/error-panel"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorPanel
      error={error}
      reset={reset}
      title="Gagal memuat pesanan Anda"
      description="Riwayat pesanan tidak bisa diambil. Coba muat ulang panel ini."
      backHref="/services"
      backLabel="Jelajahi Jasa"
    />
  )
}
