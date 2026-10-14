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
      title="Gagal memuat statistik platform"
      description="Data ringkasan admin tidak bisa diambil. Coba muat ulang panel ini."
      backHref="/dashboard"
      backLabel="Ke Dashboard"
    />
  )
}
