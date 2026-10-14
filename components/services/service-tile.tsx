import Link from "next/link"
import Image from "next/image"
import { Star, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { formatIDR } from "@/lib/utils"
import { getCategoryIcon } from "@/lib/category-icons"
import { cn } from "@/lib/utils"

export type ServiceTileData = {
  id: string | number
  title: string
  slug: string
  description?: string | null
  price: number
  deliveryTimeDays: number
  imageUrl: string | null
  ratingAvg: number
  totalReviews: number
  // Opsional: jumlah pesanan nyata dari _count API. Kartu menampilkan angka
  // ini apa adanya — bukan label "Terlaris" yang tidak bisa diverifikasi.
  _count?: { orders: number }
  provider: { name: string | null; avatarUrl?: string | null; city?: string | null }
  category: { name: string; slug: string }
}

/**
 * Kartu jasa tunggal untuk seluruh grid katalog: landing, /services,
 * profil provider, dan "jasa terkait". Markup yang sama sebelumnya disalin
 * di empat tempat dengan tinggi gambar, radius, dan info berbeda-beda —
 * itu sebabnya kartu jasa terlihat tidak sama antar halaman.
 *
 * `media` mengatur tinggi area visual saja; sisanya identik di semua tempat.
 */
export function ServiceTile({
  service,
  media = "md",
  showDescription = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
}: {
  service: ServiceTileData
  media?: "sm" | "md"
  showDescription?: boolean
  sizes?: string
  className?: string
}) {
  const Icon = getCategoryIcon(service.category.slug)
  const mediaHeight = media === "sm" ? "h-36" : "h-44"

  return (
    <Link
      href={`/service/${service.slug}`}
      className={cn(
        "focus-ring group block overflow-hidden rounded-2xl border border-border bg-card transition-[transform,box-shadow,border-color] duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-card-lg focus-visible:-translate-y-0.5 focus-visible:shadow-card-lg focus-visible:border-primary/30 dark:hover:shadow-card-dark dark:hover:border-white/10",
        className
      )}
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-accent",
          mediaHeight
        )}
      >
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.title}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-300 ease-smooth group-hover:scale-[1.03]"
            unoptimized={service.imageUrl.startsWith("data:")}
          />
        ) : (
          <Icon
            className="h-16 w-16 text-primary-strong/25 transition-transform duration-300 ease-smooth group-hover:scale-105"
            aria-hidden
          />
        )}
        <Badge className="absolute left-3 top-3 rounded-md bg-card/95 text-foreground shadow-sm">
          {service.category.name}
        </Badge>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-card/95 px-2 py-1 text-xs font-semibold shadow-sm">
          <Star className="h-3 w-3 fill-rating text-rating" aria-hidden />
          {service.totalReviews > 0 ? service.ratingAvg.toFixed(1) : "Baru"}
          {service.totalReviews > 0 && (
            <span className="font-normal text-muted-foreground">
              ({service.totalReviews})
            </span>
          )}
        </div>
        {(service._count?.orders ?? 0) > 0 && (
          <span className="absolute bottom-3 left-3 rounded-lg bg-black/65 px-2 py-0.5 text-2xs font-semibold text-white backdrop-blur">
            {service._count!.orders} pesanan
          </span>
        )}
      </div>

      <div className="p-5">
        <h3 className="line-clamp-2 font-bold leading-snug transition-colors group-hover:text-primary-strong">
          {service.title}
        </h3>

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          {service.provider.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={service.provider.avatarUrl} alt="" aria-hidden className="h-6 w-6 shrink-0 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-bold text-primary-strong"
            >
              {(service.provider.name ?? "P").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="truncate">{service.provider.name ?? "Provider"}</span>
          {service.provider.city && (
            <span className="hidden items-center gap-1 truncate text-xs text-muted-foreground/70 sm:inline-flex">
              • {service.provider.city.split(" ").map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ")}
            </span>
          )}
          {service.totalReviews > 10 && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-success/10 px-1.5 py-0.5 text-2xs font-semibold text-success">
              ✓ Terverifikasi
            </span>
          )}
        </div>

        {showDescription && service.description && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {service.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden />
            {service.deliveryTimeDays} hari
          </span>
          <span className="flex items-baseline gap-1 tabular-nums">
            <span className="text-xs font-medium text-muted-foreground">Rp</span>
            <span className="text-xl font-extrabold tracking-tight text-primary-strong">{new Intl.NumberFormat("id-ID").format(service.price)}</span>
            <span className="text-xs font-normal text-muted-foreground">/ selesai</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Skeleton dengan proporsi sama seperti ServiceTile. */
export function ServiceTileSkeleton({ media = "md" }: { media?: "sm" | "md" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className={cn("rounded-none", media === "sm" ? "h-36" : "h-44")} />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  )
}
