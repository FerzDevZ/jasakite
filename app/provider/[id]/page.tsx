import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  MapPin,
  Star,
  ShieldCheck,
  Package,
  MessageSquare,
  CalendarDays,
} from "lucide-react"
import { prisma } from "@/lib/prisma"
import { prismaId, sameId } from "@/lib/ids"
import { auth } from "@/lib/auth"
import { SITE_URL as siteUrl } from "@/lib/site-url"
import {
  breadcrumbJsonLd,
  providerJsonLd,
  serializeJsonLd,
} from "@/lib/structured-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageShell } from "@/components/layout/page-shell"
import { RatingStars } from "@/components/services/rating-stars"
import { ServiceTile } from "@/components/services/service-tile"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const user = await prisma.user.findUnique({
    where: { id: prismaId(id) },
    select: { id: true, name: true, role: true },
  })
  if (!user || user.role === "CUSTOMER") {
    // Sama seperti /service/[slug]: <Navbar /> async di root layout membuat
    // respons di-stream sebelum notFound() dievaluasi, jadi status tetap 200.
    // noindex mencegah soft 404 ini terindeks.
    return {
      title: "Provider tidak ditemukan",
      robots: { index: false, follow: false },
    }
  }
  // Sama seperti /service/[slug]: kartu utama (og:image/twitter:image)
  // disuntik oleh file convention app/provider/[id]/opengraph-image.tsx,
  // jadi di sini cukup judul/deskripsi/URL kanoniknya.
  const title = `${user.name} — Penyedia Jasa`
  const description = `Lihat profil, jasa, dan ulasan ${user.name} di JASAKITE.`
  const url = `${siteUrl}/provider/${user.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: "JASAKITE",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const providerId = prismaId(id)

  const [user, services, reviews, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        name: true,
        bio: true,
        location: true,
        avatarUrl: true,
        createdAt: true,
      },
    }),
    prisma.service.findMany({
      where: {
        providerId,
        status: "ACTIVE",
        // Profil penyedia adalah pintu masuk katalog: jasa milik penyedia
        // yang langganannya berakhir tidak boleh tayang di sini walau
        // slug-nya sudah tidak bisa dibuka.
        provider: { subscriptionUntil: { gt: new Date() } },
      },
      include: {
        category: true,
        // ServiceTile menampilkan nama provider di kartu — tanpa relasi ini
        // kartu di halaman profil berbeda bentuk dari kartu di katalog.
        provider: { select: { name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.review.findMany({
      where: { order: { service: { providerId, status: "ACTIVE" } } },
      include: {
        reviewer: { select: { name: true, avatarUrl: true } },
        order: { select: { service: { select: { title: true, slug: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    auth(),
  ])

  if (!user) notFound()

  // Hitungan SEJATI — `services.length` di bawah terbatas `take: 12`, jadi
  // stat & "X jasa aktif" pernah menampilkan 12 padahal provider punya lebih.
  // Ulasan ikut dihitung penuh: daftar `reviews` dibatasi take: 20 sehingga
  // panjangnya bukan total ulasan, sedangkan angka di halaman (dan JSON-LD
  // aggregateRating) wajib mencerminkan seluruh ulasan.
  const [serviceCount, completedOrders, reviewCount, reviewAggregate] =
    await Promise.all([
      prisma.service.count({
        where: {
          providerId,
          status: "ACTIVE",
          provider: { subscriptionUntil: { gt: new Date() } },
        },
      }),
      prisma.order.count({
        where: { status: "COMPLETED", service: { providerId } },
      }),
      prisma.review.count({
        where: { order: { service: { providerId, status: "ACTIVE" } } },
      }),
      prisma.review.aggregate({
        where: { order: { service: { providerId, status: "ACTIVE" } } },
        _avg: { rating: true },
      }),
    ])

  // Chat lepas-pesanan dari storefront: penyedia tidak bisa mengobrol
  // dengan toko sendiri; pengunjung belum masuk diarahkan ke login.
  const viewerId = session?.user?.id
  const isOwnStore = Boolean(viewerId && sameId(viewerId, providerId))
  const chatHref = viewerId ? `/messages?peer=${user.id}` : "/login"

  const totalReviews = reviewCount
  const ratingAvg = reviewAggregate._avg.rating ?? 0
  const monthsActive = Math.max(
    1,
    Math.round(
      (Date.now() - user.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
    )
  )

  const jsonLd = providerJsonLd({
    name: user.name,
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatarUrl,
    url: `${siteUrl}/provider/${user.id}`,
    ratingAvg,
    totalReviews,
    services: services.map((service) => ({
      title: service.title,
      url: `${siteUrl}/service/${service.slug}`,
      price: service.price,
      categoryName: service.category.name,
    })),
  })

  const breadcrumb = breadcrumbJsonLd([
    { name: "Beranda", url: `${siteUrl}/` },
    {
      name: user.name ?? "Penyedia Jasa",
      url: `${siteUrl}/provider/${user.id}`,
    },
  ])

  return (
    <PageShell className="py-10 animate-content-in">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([jsonLd, breadcrumb]) }}
      />
      {/* Header profil */}
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-border bg-card p-6 shadow-card md:flex-row md:items-center md:p-8">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt={user.name ?? "Provider"} className="h-24 w-24 shrink-0 rounded-2xl object-cover ring-2 ring-primary/15" />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-4xl font-extrabold text-primary-strong">
            {(user.name ?? "P").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">
              {user.name}
            </h1>
            <Badge className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Terverifikasi
            </Badge>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {user.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {user.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> Aktif {monthsActive} bulan
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-4 w-4" /> {completedOrders} pesanan selesai
            </span>
          </p>
          {user.bio && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {user.bio}
            </p>
          )}
          {!isOwnStore && (
            <div className="mt-4">
              <Button size="sm" variant="outline" asChild>
                <Link href={chatHref}>
                  <MessageSquare className="h-4 w-4" aria-hidden />
                  {viewerId ? "Chat Penyedia" : "Masuk untuk Chat"}
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Statistik */}
        <div className="grid w-full grid-cols-3 gap-2 sm:gap-4 md:w-auto">
          <div className="rounded-2xl border border-border bg-background p-2.5 text-center sm:p-4">
            <div className="text-xl font-extrabold text-primary-strong sm:text-2xl">
              {ratingAvg.toFixed(1)}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-2xs text-muted-foreground sm:text-xs">
              <Star className="h-3 w-3 fill-rating text-rating" /> Rating
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-2.5 text-center sm:p-4">
            <div className="text-xl font-extrabold sm:text-2xl">{totalReviews}</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-2xs text-muted-foreground sm:text-xs">
              <MessageSquare className="h-3 w-3" /> Ulasan
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-background p-2.5 text-center sm:p-4">
            <div className="text-xl font-extrabold sm:text-2xl">{serviceCount}</div>
            <div className="mt-1 flex items-center justify-center gap-1 text-2xs text-muted-foreground sm:text-xs">
              <Package className="h-3 w-3" /> Jasa
            </div>
          </div>
        </div>
      </div>

      {/* Jasa */}
      <div className="mt-14">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Jasa yang ditawarkan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {serviceCount} jasa aktif
            </p>
          </div>
        </div>

        {services.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Belum ada jasa aktif"
            description="Provider ini belum menayangkan jasa. Coba lihat provider lain di katalog."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceTile key={service.id} service={service} media="sm" />
            ))}
          </div>
        )}
        {/* Lebih dari 12 jasa? Sisa ditampilkan lengkap di katalog. */}
        {serviceCount > services.length && (
          <div className="mt-6 text-center">
            <Link
              href={`/services?search=${encodeURIComponent(user.name ?? "")}`}
              className="focus-ring text-sm font-semibold text-primary-strong hover:underline"
            >
              Lihat semua {serviceCount} jasa di katalog →
            </Link>
          </div>
        )}
      </div>

      {/* Ulasan */}
      <div className="mt-14">
        <h2 className="mb-6 text-xl font-semibold tracking-tight">
          Ulasan pelanggan
        </h2>
        {totalReviews === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Belum ada ulasan"
            description="Ulasan muncul setelah pelanggan menyelesaikan pesanan dengan provider ini."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-center gap-3">
                  {review.reviewer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.reviewer.avatarUrl} alt={review.reviewer.name ?? "Reviewer"} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-strong">
                      {(review.reviewer.name ?? "P").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">
                      {review.reviewer.name}
                    </div>
                    <Link
                      href={`/service/${review.order.service.slug}`}
                      className="focus-ring block truncate rounded text-xs text-muted-foreground hover:text-primary-strong"
                    >
                      {review.order.service.title}
                    </Link>
                  </div>
                  <RatingStars
                    value={review.rating}
                    size="sm"
                    className="ml-auto"
                  />
                </div>
                {review.comment && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
