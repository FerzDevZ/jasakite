"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

export function AuthBreadcrumb() {
  const pathname = usePathname()
  const isRegister = pathname.includes("/register")

  return (
    <nav aria-label="Breadcrumb" className="mb-6 self-start sm:self-center">
      <ol className="flex items-center gap-1 text-sm">
        <li className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Beranda</span>
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        </li>
        <li>
          <span className="font-medium text-foreground" aria-current="page">
            {isRegister ? "Daftar" : "Masuk"}
          </span>
        </li>
      </ol>
    </nav>
  )
}
