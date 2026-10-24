"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Store,
  Users,
  ShieldCheck,
  Wallet,
  BadgeCheck,
  CreditCard,
  Rocket,
  type LucideIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { WelcomeModal } from "@/components/dashboard/welcome-modal"
import { Breadcrumb } from "@/components/layout/breadcrumb"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  ADMIN: [
    { href: "/dashboard/admin", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/dashboard/admin/wallet", label: "Verifikasi Saldo", icon: BadgeCheck },
    { href: "/dashboard/admin/langganan", label: "Langganan", icon: CreditCard },
    { href: "/dashboard/admin/users", label: "Pengguna", icon: Users },
    { href: "/dashboard/admin/moderasi", label: "Moderasi Jasa", icon: ShieldCheck },
    { href: "/dashboard/admin/vercel", label: "Build & Deploy", icon: Rocket },
  ],
  PROVIDER: [
    { href: "/dashboard/provider", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/dashboard/provider/buka-jasa", label: "Kelola Jasa", icon: Store },
    { href: "/dashboard/provider/langganan", label: "Langganan", icon: CreditCard },
    { href: "/dashboard/wallet", label: "Dompet", icon: Wallet },
  ],
  CUSTOMER: [
    { href: "/dashboard/customer", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/dashboard/wallet", label: "Dompet", icon: Wallet },
  ],
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin Platform",
  PROVIDER: "Penyedia Jasa",
  CUSTOMER: "Customer",
}

/**
 * Menentukan item nav yang aktif. `/dashboard/admin` adalah prefix dari
 * `/dashboard/admin/users`, jadi root tiap role hanya aktif pada exact match —
 * tanpa pengecualian ini, "Ringkasan" ikut menyala di semua sub-halaman.
 */
function isActive(pathname: string, href: string, roots: string[]) {
  if (roots.includes(href)) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[]
  pathname: string
  onNavigate?: () => void
}) {
  const roots = items.map((i) => i.href).filter((h) => h.split("/").length === 3)

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon
        const active = isActive(pathname, item.href, roots)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring group flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-glow"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

function UserCard({ userName, role, avatarUrl }: { userName: string | null; role: string; avatarUrl?: string | null }) {
  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={userName ?? "User"} className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base font-semibold text-primary-strong">
            {(userName ?? "U").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{userName ?? "Pengguna"}</div>
          <div className="text-xs text-muted-foreground">
            {ROLE_LABEL[role] ?? role}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 py-2.5 text-sm font-medium text-destructive-strong transition-colors hover:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" />
        Keluar dari Akun
      </button>
    </div>
  )
}

export function DashboardShell({
  role,
  userName,
  avatarUrl,
  children,
}: {
  role: string
  userName: string | null
  avatarUrl?: string | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  // SUPER_ADMIN mewarisi seluruh menu ADMIN (lihat lib/roles.ts). Tanpa
  // pemetaan ini, akun SUPER_ADMIN jatuh ke menu CUSTOMER dan tidak bisa
  // menemukan halaman admin — termasuk pengaturan langganan yang hanya boleh
  // diubah oleh mereka.
  const navKey = role === "SUPER_ADMIN" ? "ADMIN" : role
  const items = NAV_BY_ROLE[navKey] ?? NAV_BY_ROLE.CUSTOMER
  const roleLabel =
    role === "SUPER_ADMIN" ? "Super Admin" : (ROLE_LABEL[role] ?? role)
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const panelRef = React.useRef<HTMLElement>(null)
  const previousFocus = React.useRef<HTMLElement | null>(null)

  // Tutup drawer saat rute berubah — tanpa ini drawer tetap terbuka
  // menutupi halaman baru setelah navigasi.
  React.useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (!drawerOpen) return
    previousFocus.current = document.activeElement as HTMLElement | null
    // Gunakan position: fixed + overscroll-behavior agar background tidak
    // ter-scroll di Android Chrome (overscroll gesture).
    const scrollY = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.body.style.overflow = "hidden"
    const frame = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')?.focus()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false)
      if (e.key !== "Tab" || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      document.body.style.overflow = ""
      window.scrollTo(0, scrollY)
      window.removeEventListener("keydown", onKey)
      previousFocus.current?.focus()
    }
  }, [drawerOpen])

  return (
    <>
    <WelcomeModal role={role} userName={userName} />
    <div className="flex h-[calc(100dvh-4rem)] overflow-hidden bg-muted/30">
      {/* Sidebar desktop — dvh biar pas di iOS Safari toolbar dinamis, tidak kepotong 60px */}
      <aside className="hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col border-r border-border bg-card md:flex sticky top-16 self-start">
        <nav aria-label="Navigasi dashboard" className="flex-1 space-y-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
          <p className="px-4 pb-2 pt-3 text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            {roleLabel}
          </p>
          <NavLinks items={items} pathname={pathname} />
        </nav>

        <UserCard userName={userName} role={role} avatarUrl={avatarUrl} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]">
        {/* Bar nav mobile — sticky top-0 di dalam scroll container main (bukan top-16),
            karena scroll container sudah di bawah navbar (h-[calc(100vh-4rem)]). */}
        <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-xl md:hidden">
          <span className="truncate text-sm font-semibold text-muted-foreground">
            {roleLabel}
          </span>
          <button
            type="button"
            aria-label="Buka navigasi dashboard"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="focus-ring flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-4 w-4" aria-hidden />
            Menu
          </button>
        </div>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              aria-hidden
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
              style={{ touchAction: 'none' }}
            />
            <aside
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigasi dashboard"
              className="absolute right-0 top-0 flex h-full w-72 flex-col border-l border-border bg-card shadow-card-lg"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  {roleLabel}
                </span>
                <button
                  type="button"
                  aria-label="Tutup navigasi"
                  onClick={() => setDrawerOpen(false)}
                  className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 p-3">
                <NavLinks
                  items={items}
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </nav>

              <UserCard userName={userName} role={role} avatarUrl={avatarUrl} />
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <Breadcrumb className="mb-4" />
          {children}
        </main>
      </div>
    </div>
    </>
  )
}
