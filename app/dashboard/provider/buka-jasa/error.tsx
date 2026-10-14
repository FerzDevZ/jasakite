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
      title="Gagal memuat halaman kelola jasa"
      description="Daftar jasa atau kategori tidak bisa diambil."
      backHref="/dashboard/provider"
      backLabel="Ke Ringkasan"
    />
  )
}
