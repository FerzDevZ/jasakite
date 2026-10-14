import type { Metadata } from "next"
import ServicesPageClient from "./page.client"
import {
  parseServicesQuery,
  hasInvalidPriceRange,
  fetchServicesPage,
  fetchCatalogCategories,
  type ServicesPayload,
  type CategoryOptionData,
} from "@/lib/services-query"

export const metadata: Metadata = {
  title: "Jelajahi Jasa — JASAKITE",
  description:
    "Cari dan bandingkan ribuan jasa profesional di sekitar Anda. Filter berdasarkan kategori, lokasi, dan rating.",
  openGraph: {
    title: "Jelajahi Jasa — JASAKITE",
    description:
      "Cari dan bandingkan ribuan jasa profesional di sekitar Anda.",
    type: "website",
  },
}

/**
 * Katalog dirender client (filter interaktif, infinite scroll), TAPI data
 * halaman pertama diambil di server saat URL masih default (tanpa filter):
 * tile + gambar LCP masuk HTML awal — tidak menunggu hydrate + fetch API
 * (dulu penyumbang ~3.1s Load Delay di fase LCP).
 *
 * Saat URL membawa filter, SSR dilewati (initialData kunci filter; client
 * langsung refetch sesuai URL — tidak ada risiko seeding data yang salah).
 */
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(sp)) {
    const v = Array.isArray(value) ? value[0] : value
    if (v !== undefined) params.set(key, v)
  }
  const q = parseServicesQuery(params)

  let initialData: ServicesPayload | undefined
  let initialCategories: CategoryOptionData[] | undefined
  const hasFilters = Boolean(
    q.search || q.slug || q.category || q.location || q.minPrice || q.maxPrice || q.rating ||
      (q.sort && q.sort !== "newest")
  )
  // Kategori selalu di-SSR (dipakai chips filter di atas fold — dulu elemen
  // LCP karena menunggu fetch client); katalog hanya saat URL default.
  const [catalog, categories] = await Promise.allSettled([
    !hasFilters && !hasInvalidPriceRange(q)
      ? fetchServicesPage({ ...q, sort: "newest", page: 1 })
      : Promise.resolve(undefined),
    fetchCatalogCategories(),
  ])
  if (catalog.status === "fulfilled") initialData = catalog.value
  if (categories.status === "fulfilled") initialCategories = categories.value

  return <ServicesPageClient initialData={initialData} initialCategories={initialCategories} />
}
