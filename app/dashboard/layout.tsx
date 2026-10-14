import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <DashboardShell
      role={session.user.role}
      userName={session.user.name ?? "User"}
      avatarUrl={session.user.image ?? null}
    >
      {children}
    </DashboardShell>
  )
}
