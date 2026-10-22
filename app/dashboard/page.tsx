import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { isAdminRole } from "@/lib/roles"

export const dynamic = "force-dynamic"

export default async function DashboardHome() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (isAdminRole(session.user.role)) redirect("/dashboard/admin")
  if (session.user.role === "PROVIDER") redirect("/dashboard/provider")

  redirect("/dashboard/customer")
}
