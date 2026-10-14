import type { Metadata } from "next"
import { AuthBreadcrumb } from "@/components/layout/auth-breadcrumb"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16">
      <AuthBreadcrumb />
      {children}
    </div>
  )
}
