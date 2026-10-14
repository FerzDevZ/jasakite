"use client"

import { ErrorPanel } from "@/components/layout/error-panel"
import { PageShell } from "@/components/layout/page-shell"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <PageShell width="prose" className="py-16">
      <ErrorPanel
        error={error}
        reset={reset}
        title="Gagal memuat detail jasa"
        description="Data jasa ini tidak bisa diambil. Mungkin jasa sudah tidak tayang."
        backHref="/services"
        backLabel="Jelajahi Jasa Lain"
      />
    </PageShell>
  )
}
