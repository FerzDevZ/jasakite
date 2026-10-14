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
        title="Gagal memuat profil provider"
        description="Data provider tidak bisa diambil. Coba muat ulang halaman ini."
        backHref="/services"
        backLabel="Jelajahi Jasa"
      />
    </PageShell>
  )
}
