import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { prismaId } from '@/lib/ids'
import { resolveLocation } from '@/lib/provinces'

/**
 * Logika query katalog jasa yang dipakai DUA konsumen:
 * 1. `GET /api/services` — sumber data klien untuk interaksi filter.
 * 2. `app/services/page.tsx` — fetch server-side untuk SSR initialData,
 *    sehingga tile katalog (termasuk gambar LCP) masuk HTML awal tanpa
 *    menunggu hydrate + fetch API di jendela kritis.
 *
 * SATU definisi filter: perubahan pencarian/filter di API otomatis berlaku
 * pula di SSR — tidak ada jalan untuk saling meleset.
 */

export const SERVICES_PAGE_SIZE = 12

export const SERVICES_SORT_MAP = {
  newest: { createdAt: 'desc' },
  'price-asc': { price: 'asc' },
  'price-desc': { price: 'desc' },
  rating: { ratingAvg: 'desc' },
  // "Terlaris" di menu urutkan klien mengirim sort=popular. Sebelum entry ini
  // ada, SortOrder tak dikenal jatuh diam-diam ke newest melalui `??` di bawah
  // — pengguna memilih Terlaris dan hasilnya tidak pernah berubah.
  popular: { orders: { _count: 'desc' } },
} as const

export type ServicesQuery = {
  search?: string
  slug?: string
  category?: string
  minPrice?: string
  maxPrice?: string
  rating?: string
  location?: string
  sort?: string
  page?: number
}

/**
 * Bentuk baris hasil `fetchServicesPage` — mencerminkan `include` di bawah.
 * Secara struktural kompatibel dengan `ServiceItem` di page.client (field
 * konsumen tile semuanya ada), sehingga aman dipakai sebagai initialData
 * TanStack Query tanpa transformasi tambahan.
 */
export type ServicesRow = Prisma.ServiceGetPayload<{
  include: {
    provider: { select: { id: true; name: true; avatarUrl: true; city: true } }
    category: { select: { id: true; name: true; slug: true; icon: true } }
    _count: { select: { orders: true } }
  }
}>

export type ServicesPayload = {
  services: ServicesRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function parseServicesQuery(searchParams: URLSearchParams): ServicesQuery {
  return {
    search: (searchParams.get('search') ?? '').trim(),
    slug: searchParams.get('slug') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    minPrice: searchParams.get('minPrice') ?? undefined,
    maxPrice: searchParams.get('maxPrice') ?? undefined,
    rating: searchParams.get('rating') ?? undefined,
    location: (searchParams.get('location') ?? '').trim() || undefined,
    sort: searchParams.get('sort') ?? 'newest',
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1),
  }
}

export function buildServicesWhere(q: ServicesQuery): Prisma.ServiceWhereInput {
  // Bertipe, bukan `any`: `any` di sini mematikan pemeriksaan untuk SELURUH
  // klausa filter, sehingga salah ketik nama kolom (mis. `raingAvg`) baru
  // ketahuan dari hasil query yang kosong di produksi.
  //
  // Saringan langganan ikut di sini — bukan di route — supaya API dan SSR
  // memakai aturan yang sama: jasa penyedia yang masa aktifnya lewat TIDAK
  // pernah muncul di katalog, tanpa perlu cron yang menyembunyikannya.
  const where: Prisma.ServiceWhereInput = {
    status: 'ACTIVE',
    provider: { subscriptionUntil: { gt: new Date() } },
  }

  if (q.slug) {
    where.slug = q.slug
  }
  if (q.category) {
    const cid = String(q.category).trim()
    if (/^[0-9a-fA-F]{24}$/.test(cid) || /^\d+$/.test(cid)) {
      where.categoryId = prismaId(cid)
    }
  }
  // Pencarian multi-kata: escape regex, limit, anti-ReDoS
  if (q.search) {
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const raw = q.search.slice(0, 50)
    const tokens = raw.split(/\s+/).filter(Boolean).slice(0, 5).map((t) => escapeRegex(t.slice(0, 30))).filter(Boolean)
    if (tokens.length > 0) {
      where.AND = tokens.map((token) => ({
        OR: [
          { title: { contains: token } },
          { description: { contains: token } },
          { provider: { name: { contains: token } } },
        ],
      }))
    }
  }
  if (q.minPrice || q.maxPrice) {
    const min = q.minPrice ? parseFloat(q.minPrice) : undefined
    const max = q.maxPrice ? parseFloat(q.maxPrice) : undefined
    // Objek filter dibangun utuh dulu. Menulis `where.price = {}` lalu
    // `where.price.gte = ...` memaksa tipe `price` menjadi gabungan
    // `number | FloatFilter`, dan mengakses `.gte` pada gabungan itu ditolak.
    const price: Prisma.FloatFilter = {}
    if (min !== undefined && Number.isFinite(min) && min >= 0) price.gte = min
    if (max !== undefined && Number.isFinite(max) && max >= 0) price.lte = max
    where.price = price
  }
  if (q.rating) {
    const r = parseFloat(q.rating)
    if (Number.isFinite(r)) where.ratingAvg = { gte: r }
  }
  if (q.location) {
    // `resolveLocation` mengembalikan mode eksak untuk nama kabupaten/kota
    // Bangka Belitung yang dikenal, dan `contains` untuk ketikan bebas.
    // Eksak itu perlu: `contains "kabupaten bangka"` juga cocok dengan
    // "kabupaten bangka barat/tengah/selatan" sehingga memilih satu
    // kabupaten diam-diam menampilkan empat.
    const loc = resolveLocation(q.location)
    if (loc) {
      // Gabungkan dengan saringan langganan di atas, bukan menimpanya —
      // `where.provider = { city }` akan menghapus `subscriptionUntil`.
      where.provider =
        loc.mode === "exact"
          ? { city: loc.value, subscriptionUntil: { gt: new Date() } }
          : { city: { contains: loc.value }, subscriptionUntil: { gt: new Date() } }
    }
  }
  return where
}

export function servicesSortOrder(q: ServicesQuery): Prisma.ServiceOrderByWithRelationInput {
  const sort = (q.sort ?? 'newest') as keyof typeof SERVICES_SORT_MAP
  return SERVICES_SORT_MAP[sort] ?? SERVICES_SORT_MAP.newest
}

/** Validasi harga min>max — sama di API (400) dan SSR (fallback tanpa filter). */
export function hasInvalidPriceRange(q: ServicesQuery): boolean {
  if (!q.minPrice || !q.maxPrice) return false
  const min = parseFloat(q.minPrice)
  const max = parseFloat(q.maxPrice)
  return Number.isFinite(min) && Number.isFinite(max) && min > max
}

/**
 * Daftar kategori untuk chips filter — bentuknya cocok dengan `CategoryOption`
 * di components/services/catalog-filters.tsx.
 */
export type CategoryOptionData = {
  id: string
  name: string
  slug: string
  _count: { services: number }
}

/**
 * Daftar kategori untuk chips filter — bentuknya cocok dengan `CategoryOption`
 * di components/services/catalog-filters.tsx.
 */
export async function fetchCatalogCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          services: {
            where: {
              status: "ACTIVE",
              provider: { subscriptionUntil: { gt: new Date() } },
            },
          },
        },
      },
    },
  })
}

/**
 * Satu halaman katalog. `min>max` dikembalikan sebagai error oleh API;
 * untuk SSR dipanggil SETELAH `hasInvalidPriceRange` disaring.
 */
export async function fetchServicesPage(q: ServicesQuery): Promise<ServicesPayload> {
  const page = Math.max(1, q.page ?? 1)
  const where = buildServicesWhere(q)

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      include: {
        provider: { select: { id: true, name: true, avatarUrl: true, city: true } },
        category: { select: { id: true, name: true, slug: true, icon: true } },
        // Jumlah pesanan per jasa — dipakai kartu katalog untuk badge
        // "n pesanan" dan umpan "Paling banyak dipesan" di beranda.
        _count: { select: { orders: true } },
        // Paket tier hanya dibutuhkan halaman detail (fetch by slug);
        // daftar katalog tidak memerlukannya sehingga payload tetap ramping.
        ...(q.slug ? { packages: { orderBy: { position: "asc" as const } } } : {}),
      },
      skip: (page - 1) * SERVICES_PAGE_SIZE,
      take: SERVICES_PAGE_SIZE,
      orderBy: servicesSortOrder(q),
    }),
    prisma.service.count({ where }),
  ])

  return {
    services,
    total,
    page,
    pageSize: SERVICES_PAGE_SIZE,
    totalPages: Math.ceil(total / SERVICES_PAGE_SIZE),
  }
}
