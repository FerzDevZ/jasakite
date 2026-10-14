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
      title="Gagal memuat data provider"
      description="Ringkasan layanan dan pesanan tidak bisa diambil."
      backHref="/dashboard/provider/buka-jasa"
      backLabel="Kelola Jasa"
    />
  )
}
