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
    <div className="w-full max-w-md">
      <ErrorPanel
        error={error}
        reset={reset}
        title="Halaman masuk gagal dimuat"
        description="Terjadi kesalahan saat menyiapkan formulir. Coba muat ulang."
        backHref="/"
        backLabel="Ke Beranda"
      />
    </div>
  )
}
