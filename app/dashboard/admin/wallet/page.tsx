import type { Metadata } from "next"
import { AdminWalletQueue } from "@/components/dashboard/admin-wallet-queue"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Verifikasi Saldo — JASAKITE Admin",
  robots: { index: false, follow: false },
}

export default function AdminWalletPage() {
  return (
    <PageShell className="py-6 md:py-8">
      <AdminWalletQueue />
    </PageShell>
  )
}
