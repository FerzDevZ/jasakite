"use client"

import Link from "next/link"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Lock } from "lucide-react"
import { PageHeader } from "@/components/layout/page-shell"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { AdminTotpSetup } from "@/components/dashboard/admin-totp-setup"
import { isAdminRole, isSuperAdminRole } from "@/lib/roles"

export default function AdminSecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
    else if (!isAdminRole(session.user.role)) router.push("/dashboard")
  }, [session, status, router])

  if (status === "loading" || !session || !isAdminRole(session.user.role)) {
    return <DashboardSkeleton stats={0} panels={1} />
  }

  const isSuperAdmin = isSuperAdminRole(session.user.role)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Keamanan Akun"
        description="Langkah-kedua untuk akun yang boleh memutuskan perpindahan uang."
      />

      {isSuperAdmin ? (
        <AdminTotpSetup />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Anda masuk sebagai ADMIN. 2FA hanya diperlukan oleh SUPER_ADMIN,
            karena hanya peran itu yang dapat memverifikasi top-up, penarikan,
            dan pembayaran pesanan.
          </p>
          <Link
            href="/dashboard/admin/wallet"
            className="focus-ring mt-3 inline-block rounded text-sm font-semibold text-primary-strong underline-offset-4 hover:underline"
          >
            Lihat antrean verifikasi (hanya-baca)
          </Link>
        </div>
      )}
    </div>
  )
}
