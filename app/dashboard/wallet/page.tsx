import type { Metadata } from "next"
import { DashboardWallet } from "@/components/dashboard/dashboard-wallet"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Dompet — JASAKITE",
  robots: { index: false, follow: false },
}

export default function WalletPage() {
  return (
    <PageShell className="py-6 md:py-8">
      <DashboardWallet />
    </PageShell>
  )
}
