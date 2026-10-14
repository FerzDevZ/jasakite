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
      title="Gagal memuat antrean moderasi"
      description="Daftar jasa yang menunggu moderasi tidak bisa diambil."
      backHref="/dashboard/admin"
      backLabel="Ke Ringkasan"
    />
  )
}
