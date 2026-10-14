"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList, Home, LayoutGrid, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptic"
import { useUnreadMessages } from "@/components/layout/message-badge"

/**
 * Bottom tab bar mobile — pola yang membuat Shopee/GoFood terasa seperti
 * "aplikasi", bukan website. Hanya di mobile (lg:hidden); bar aksi halaman
 * (checkout/detail/katalog) memakai bottom-[calc(3.5rem+...)] agar duduk
 * DI ATAS tab bar ini — tinggi tab = h-14 = 3.5rem.
 *
 * Lima tab karena tiga alur pelanggan yang berbeda harus selalu terjangkau:
 * mencari jasa, memeriksa pesanan, dan membalas pesan. Menaruh "Pesanan" di
 * dalam menu Akun (seperti sebelumnya) berarti satu-satunya cara mengetahui
 * pesanan sudah dikonfirmasi adalah menebak di mana mencarinya.
 */
export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const unread = useUnreadMessages()

  // Jumlah pesanan yang belum selesai — angka yang benar-benar membuat
  // pengguna membuka tab Pesanan, bukan total riwayat belanjanya.
  const activeOrders = useQuery<{ status: string }[]>({
    queryKey: ["orders", "active-count"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { cache: "no-store" })
      if (!res.ok) return []
      return res.json()
    },
    enabled: Boolean(session?.user),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const orderCount = (activeOrders.data ?? []).filter(
    (order) => order.status === "PENDING" || order.status === "IN_PROGRESS"
  ).length

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 lg:hidden"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch">
        <BottomTab href="/" label="Beranda" icon={Home} active={isActive("/", true)} />
        <BottomTab
          href="/services"
          label="Kategori"
          icon={LayoutGrid}
          active={isActive("/services")}
        />
        <BottomTab
          href={session ? "/orders" : "/login"}
          label="Pesanan"
          icon={ClipboardList}
          active={isActive("/orders")}
          count={session ? orderCount : 0}
          badgeLabel="pesanan aktif"
        />
        <BottomTab
          href="/messages"
          label="Pesan"
          icon={MessageCircle}
          active={isActive("/messages")}
          count={session ? unread : 0}
          badgeLabel="pesan belum dibaca"
          prefetch={false}
        />
        <BottomTab
          href={session ? "/dashboard" : "/login"}
          label={session ? "Akun" : "Masuk"}
          icon={User}
          active={isActive("/dashboard") || isActive("/login") || isActive("/register")}
          prefetch={false}
        />
      </ul>
    </nav>
  )
}

function BottomTab({
  href,
  label,
  icon: Icon,
  active,
  count = 0,
  badgeLabel = "belum dibaca",
  prefetch,
}: {
  href: string
  label: string
  icon: typeof Home
  active: boolean
  count?: number
  badgeLabel?: string
  // Tab tujuannya kondisional (mis. /messages & /dashboard → /login saat
  // anonim) memicu prefetch RSC + redirect server saat load — boros bandwidth
  // dan menambah long task di jendela kritis. Nonaktifkan prefetch untuk
  // target yang hanya tercapai lewat klik eksplisit.
  prefetch?: boolean
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        prefetch={prefetch}
        aria-current={active ? "page" : undefined}
        onClick={() => haptic()}
        className={cn(
          "focus-ring relative flex h-full flex-col items-center justify-center gap-0.5 text-2xs transition-[color,transform] active:scale-95",
          active
            ? "font-semibold text-primary-strong"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="relative">
          <Icon className="h-5 w-5" aria-hidden />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground"
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </span>
        <span>{label}</span>
        {count > 0 && (
          <span className="sr-only" aria-live="polite">
            {count} {badgeLabel}
          </span>
        )}
      </Link>
    </li>
  )
}
