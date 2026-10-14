"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-shell"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { BukaJasaForm } from "@/components/provider/buka-jasa-form"
import { ProviderServiceList } from "@/components/provider/provider-service-list"

export default function BukaJasaPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [createdId, setCreatedId] = useState<string | number | null>(null)

  if (status === "loading") {
    return <DashboardSkeleton stats={0} panels={2} />
  }

  if (!session) {
    router.push("/login")
    return null
  }

  const canManage =
    session.user.role === "PROVIDER" || session.user.role === "ADMIN"

  if (!canManage) {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/provider"
        className="focus-ring inline-flex items-center gap-1 rounded text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke dashboard
      </Link>

      <PageHeader
        title="Buka Jasa"
        description="Tawarkan keahlian Anda dan mulai terima pesanan dari pelanggan di sekitar."
      />

      {createdId !== null && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-2xl border border-success/30 bg-success-soft p-4 sm:flex-row sm:items-center"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-success"
            aria-hidden
          />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">Jasa berhasil dibuat dan langsung tayang</p>
            <p className="mt-1 text-muted-foreground">
              Jasa Anda sekarang bisa ditemukan di katalog dan halaman pencarian.
            </p>
          </div>
          {/* Konfirmasi lama tidak menawarkan jalan ke jasa yang baru dibuat,
              padahal itu tindakan berikutnya yang paling wajar. */}
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href="/dashboard/provider">Lihat di Dashboard</Link>
          </Button>
        </div>
      )}

      <BukaJasaForm onCreated={setCreatedId} />

      <section className="mt-14">
        <h2 className="mb-4 text-xl font-semibold">Jasa Saya</h2>
        <ProviderServiceList enabled={canManage} />
      </section>
    </div>
  )
}
