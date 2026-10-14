import Link from "next/link"
import Image from "next/image"
import { Star, MapPin, Package } from "lucide-react"
import { PriceBlock } from "@/components/ui/price-block"
import { Skeleton } from "@/components/ui/skeleton"
import { getCategoryIcon } from "@/lib/category-icons"
import { cn } from "@/lib/utils"
import type { ServiceTileData } from "@/components/services/service-tile"

/**
 * Kartu jasa tunggal untuk seluruh grid katalog: landing, /services,
 * profil provider, dan "jasa terkait".
 *
 * Bahasa visual marketplace (ala Shopee/Tokopedia): harga adalah AKTOR
 * utama — oranye tebal dan besar — rating berdiri sendiri sebagai chip
 * kuning padat di kiri bawah gambar, dan jumlah pesanan tampil sebagai
 * teks netral "n terjual" di kanan rating. Judul dua baris, kota di
 * bawahnya; tanpa elemen dekoratif yang tidak membawa data.
 *
 * Yang TIDAK dilakukan: menampilkan label "Terlaris"/"Flash Sale" tanpa
 * dasar data. Angka pesanan diambil dari `_count.orders` yang nyata.
 */
export function DenseServiceTile({
  service,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
}: {
  service: ServiceTileData
  className?: string
  sizes?: string
  /** Gambar pertama katalog adalah kandidat LCP — pra-unduh tanpa menunggu layout. */
  priority?: boolean
}) {
  const Icon = getCategoryIcon(service.category.slug)
  const orders = service._count?.orders ?? 0
  const city = service.provider.city
    ? service.provider.city
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : null

  return (
    <Link
      href={`/service/${service.slug}`}
      prefetch={false}
      className={cn(
        "focus-ring group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[transform,box-shadow,border-color] duration-fast ease-smooth hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-lg",
        className
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent">
        {service.imageUrl ? (
          <Image
            src={service.imageUrl}
            alt={service.title}
            fill
            priority={priority}
            sizes={sizes}
            className="object-cover transition-transform duration-base ease-smooth group-hover:scale-[1.04]"
            unoptimized={service.imageUrl.startsWith("data:")}
          />
        ) : (
          <Icon
            className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-primary-strong/25"
            aria-hidden
          />
        )}
        {/* Chip rating kuning ala marketplace: bg-brand-2 (kuning cerah) +
            teks coklat gelap ≈12:1, terbaca di atas foto apa pun. */}
        {service.totalReviews > 0 && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-brand-2 px-1.5 py-0.5 text-2xs font-bold text-rating-foreground shadow-sm">
            <Star className="h-3 w-3 fill-rating-foreground" aria-hidden />
            {service.ratingAvg.toFixed(1)}
          </span>
        )}
        {orders > 0 && (
          <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-1.5 py-0.5 text-2xs font-semibold text-white backdrop-blur">
            {orders} terjual
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary-strong">
          {service.title}
        </h3>

        {/* Harga jadi aktor utama — ukuran lg, tanpa suffix, tanpa elemen lain
            di baris yang sama agar mata langsung jatuh ke angka. */}
        <PriceBlock amount={service.price} size="lg" className="mt-0.5" />

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
          {service.totalReviews > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 fill-rating text-rating" aria-hidden />
              {service.ratingAvg.toFixed(1)}
              <span className="text-muted-foreground/70">({service.totalReviews})</span>
            </span>
          )}
          {city && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{city}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

/** Skeleton dengan proporsi identik — mencegah lompatan tata letak saat memuat. */
export function DenseServiceTileSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    </div>
  )
}

/** Penanda kecil untuk jasa yang punya paket tier — dipakai di baris harga. */
export function PackageBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-info-soft px-1.5 py-0.5 text-2xs font-semibold text-info",
        className
      )}
    >
      <Package className="h-3 w-3" aria-hidden />
      Paket tersedia
    </span>
  )
}
