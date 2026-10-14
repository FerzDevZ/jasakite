"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

type BreadcrumbItem = {
  label: string
  href?: string
}

/**
 * Mapping path segments to human-readable labels.
 * Menambahkan breadcrumbs untuk navigasi yang lebih baik.
 */
const PATH_LABELS: Record<string, string> = {
  "": "Beranda",
  services: "Jasa",
  service: "Detail Jasa",
  checkout: "Checkout",
  orders: "Pesanan",
  dashboard: "Dashboard",
  customer: "Pelanggan",
  provider: "Penyedia",
  admin: "Admin",
  "buka-jasa": "Buka Jasa",
  moderasi: "Moderasi",
  users: "Pengguna",
  faq: "FAQ",
  login: "Masuk",
  register: "Daftar",
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Beranda", href: "/" },
  ]

  let currentPath = ""
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = PATH_LABELS[segment] || segment

    // Don't add href for the last segment (current page)
    const isLast = currentPath === pathname
    breadcrumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    })
  }

  return breadcrumbs
}

export function Breadcrumb({
  className,
  items,
}: {
  className?: string
  items?: BreadcrumbItem[]
}) {
  const pathname = usePathname()
  const breadcrumbs = items || generateBreadcrumbs(pathname)

  // Don't show breadcrumbs on home page
  if (breadcrumbs.length <= 1) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          const isFirst = index === 0

          return (
            <li
              key={item.label}
              className="flex items-center gap-1"
            >
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="focus-ring flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  {isFirst && <Home className="h-3.5 w-3.5" aria-hidden />}
                  <span className={isFirst ? "hidden sm:inline" : ""}>
                    {item.label}
                  </span>
                </Link>
              ) : (
                <span
                  className="flex items-center gap-1 font-medium text-foreground"
                  aria-current="page"
                >
                  {isFirst && <Home className="h-3.5 w-3.5" aria-hidden />}
                  <span className={isFirst ? "hidden sm:inline" : ""}>
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
