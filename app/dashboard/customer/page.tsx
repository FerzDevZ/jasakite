"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { CustomerDashboard } from "@/components/dashboard/CustomerDashboard"
import { SavedServices } from "@/components/dashboard/saved-services"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { PageHeader } from "@/components/layout/page-shell"

export const dynamic = "force-dynamic"

export default function CustomerDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  // Skeleton tidak lagi memakai container sendiri: halaman ini dirender di
  // dalam DashboardShell yang sudah punya padding, jadi wrapper max-w-7xl
  // ekstra membuat konten bergeser saat data selesai dimuat.
  if (status === "loading" || !session) {
    return <DashboardSkeleton stats={4} panels={2} />
  }

  return (
    <div className="space-y-8 animate-content-in">
      <PageHeader
        title="Pesanan Saya"
        description="Pantau status pesanan jasa Anda dan jasa yang Anda simpan."
      />
      <CustomerDashboard />
      <SavedServices />
    </div>
  )
}
