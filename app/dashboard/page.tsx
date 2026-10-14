import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function DashboardHome() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN") redirect("/dashboard/admin")
  if (session.user.role === "PROVIDER") redirect("/dashboard/provider")

  redirect("/dashboard/customer")
}
