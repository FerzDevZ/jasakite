import type { Metadata } from "next"
import { AdminVercelSettings } from "@/components/dashboard/admin-vercel-settings"
import { PageShell } from "@/components/layout/page-shell"

export const metadata: Metadata = {
  title: "Build & Deploy — JASAKITE Admin",
  robots: { index: false, follow: false },
}

export default function AdminVercelPage() {
  return (
    <PageShell className="py-6 md:py-8">
      <AdminVercelSettings />
    </PageShell>
  )
}
