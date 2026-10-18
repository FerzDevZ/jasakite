"use client"

/**
 * global-error.tsx — konvensi Next.js App Router untuk error yang lolos dari
 * app/error.tsx dan Boundary rute lain.
 *
 * Kenapa perlu: pesan default Next ("Application error: a client-side
 * exception has occurred...") hanya teks statis tanpa jalan keluar. Laporan
 * pengguna HP menunjukkan kondisi itu nyata dan menetap — tab lama memuat
 * shell service worker cache yang menunjuk chunk build lama yang sudah tidak
 * dilayani setelah deploy. Tombol "Muat Ulang Bersih" memutus lingkaran itu:
 * unregister SW + hapus semua cache jasakite-v* + reload.
 *
 * Catatan Next.js: global-error HARUS me-render sendiri <html> dan <body> —
 * ia menggantikan root layout sepenuhnya saat aktif.
 */

import { GlobalErrorBoundary } from "@/components/layout/global-error-boundary"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <GlobalErrorBoundary error={error} reset={reset} />
      </body>
    </html>
  )
}
