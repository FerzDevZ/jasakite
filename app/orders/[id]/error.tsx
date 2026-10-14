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
        title="Gagal memuat pesanan"
        description="Detail pesanan tidak bisa diambil. Mungkin pesanan sudah dihapus atau Anda tidak punya akses."
        backHref="/dashboard"
        backLabel="Ke Dashboard"
      />
    </PageShell>
  )
}
