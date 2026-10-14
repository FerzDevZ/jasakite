import Link from "next/link"
import { PlusCircle, LayoutDashboard } from "lucide-react"
import { auth, signOut } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { SearchBar } from "@/components/layout/search-bar"
import { NotificationBell } from "@/components/layout/notification-bell"
import { MessageBadge } from "@/components/layout/message-badge"
import { CartBadge } from "@/components/cart/cart-badge"
import { CategoryMenu } from "@/components/layout/category-menu"
import prisma from "@/lib/prisma"
import { ImpersonationBar } from "@/components/layout/impersonation-bar"

export default async function Navbar() {
  const session = await auth()
  // Mega-menu kategori desktop + daftar kategori di mobile menu.
  const categories = await prisma.category.findMany({
    take: 12,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/85 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        {/* Logo. aria-label: wordmark dipecah dua span untuk pewarnaan,
            sehingga tanpa nama eksplisit pembaca layar membacanya sebagai dua
            kata terpisah dan tidak menyebutkan merek secara utuh. */}
        <Link href="/" aria-label="JASAKITE — beranda" className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-base font-extrabold text-primary-foreground shadow-glow transition-transform duration-200 ease-smooth group-hover:rotate-3 group-hover:scale-105">
            {/* Monogram merek: J dari JASAKITE. */}
            J
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">
            JASA<span className="text-primary-strong">KITE</span>
          </span>
        </Link>

        {/* Search dengan shortcut "/" */}
        <SearchBar />

        {/* Nav kanan */}
        <nav className="ml-auto flex items-center gap-1.5 md:gap-2">
          <CategoryMenu categories={categories} />
          <Link
            href="/services"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:block"
          >
            Jelajahi
          </Link>

          <ThemeToggle />

          {session?.user ? (
            <>
              {/* Keranjang sengaja di sebelah kiri lonceng: dua ikon ini
                  tampak serupa, dan menaruh yang paling sering ditekan
                  (keranjang) lebih dekat ke pencarian membuat jempol
                  tidak perlu menyeberangi seluruh navbar. */}
              <CartBadge />
              <MessageBadge />
              <NotificationBell />
              <Link href="/dashboard" className="hidden sm:block">
                <Button variant="outline" size="sm" aria-label="Buka dashboard">
                  <LayoutDashboard aria-hidden="true" />
                  <span className="hidden md:inline">Dashboard</span>
                </Button>
              </Link>
              {(session?.user.role === "PROVIDER" || session?.user.role === "ADMIN") ? (
                <Link href="/dashboard/provider/buka-jasa" className="hidden sm:block">
                  <Button size="sm" className="h-9 px-4 font-bold shadow-glow" aria-label="Buka jasa baru">
                    <PlusCircle aria-hidden="true" />
                    <span className="hidden md:inline">Buka Jasa</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/services" className="hidden sm:block">
                  <Button size="sm" variant="outline" className="h-9 px-4 font-semibold" aria-label="Jelajahi jasa">
                    <span className="hidden md:inline">Jelajahi Jasa</span>
                  </Button>
                </Link>
              )}
              <div className="hidden items-center gap-2 sm:flex">
                <Avatar className="h-8 w-8 ring-2 ring-primary/40">
                  {session.user.image ? (
                    <AvatarImage src={session.user.image} alt={session.user.name ?? "User"} />
                  ) : (
                    <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary-strong">
                      {(session.user.name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <form
                  action={async () => {
                    "use server"
                    await signOut({ redirectTo: "/" })
                  }}
                  className="hidden md:block"
                >
                  <Button variant="ghost" size="sm" type="submit">
                    Keluar
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <>
              {/* Tersembunyi di mobile (hidden sm:block) tapi tetap termount —
                  prefetch Link default-nya memicu fetch RSC /login & /register
                  bahkan saat tak terlihat. Nonaktifkan: target auth hanya
                  dicapai lewat klik eksplisit. */}
              <Link href="/login" prefetch={false}>
                <Button variant="outline" size="sm">
                  Masuk
                </Button>
              </Link>
              <Link href="/register" prefetch={false}>
                <Button size="sm" className="shadow-glow">
                  Daftar
                </Button>
              </Link>
            </>
          )}

          <MobileMenu
            session={session?.user ? true : false}
            categories={categories}
          />
        </nav>
      </div>

      {/* Banner impersonasi — admin sedang menjelajah sebagai user lain */}
      {session?.user.impersonatedBy && (
        <ImpersonationBar
          name={session.user.name ?? "User"}
          role={session.user.role}
        />
      )}
    </header>
  )
}
