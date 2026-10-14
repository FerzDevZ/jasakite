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
      title="Gagal memuat daftar pengguna"
      description="Data pengguna tidak bisa diambil. Coba muat ulang panel ini."
      backHref="/dashboard/admin"
      backLabel="Ke Ringkasan"
    />
  )
}
