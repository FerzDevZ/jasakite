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
        title="Gagal memuat checkout"
        description="Data jasa untuk pesanan ini tidak bisa diambil. Pesanan Anda belum dibuat, jadi aman untuk mencoba lagi."
        backHref="/services"
        backLabel="Kembali ke Katalog"
      />
    </PageShell>
  )
}
