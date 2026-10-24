import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isAdminRole } from "@/lib/roles"
import { SITE_URL as siteUrl } from "@/lib/site-url"
import {
  breadcrumbJsonLd,
  serializeJsonLd,
  serviceJsonLd,
} from "@/lib/structured-data"
import ServiceDetailClient from "./service-detail-client"

export const dynamic = "force-dynamic"

/**
 * Satu pembacaan jasa per permintaan, dipakai bersama oleh metadata dan halaman.
 *
 * Aturan visibilitas ada di SATU tempat: jasa yang tidak ada, atau yang
 * statusnya bukan ACTIVE dan penontonnya bukan admin, diperlakukan sama
 * (null). Kalau metadata dan halaman memakai aturan berbeda, keduanya bisa
 * tidak sepakat — metadata mengirim 404 untuk halaman yang sebenarnya
 * merender konten, atau sebaliknya.
 *
 * `cache()` dari React mendedupe panggilan dalam satu permintaan, jadi
 * pembacaan di generateMetadata dan di komponen halaman tidak menjadi dua
 * kueri database.
 */
const getServiceForView = cache(async (slug: string) => {
  const service = await prisma.service.findUnique({
    where: { slug },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          city: true,
          createdAt: true,
          // Dipakai gerbang langganan di bawah — bukan untuk ditampilkan.
          subscriptionUntil: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      // Paket tier untuk selector harga di client — tanpa include ini
      // kotak "Pilih paket" tidak pernah dirender (client hanya menerima
      // data yang di-serial halaman ini, bukan panggilan /api/services).
      packages: { orderBy: { position: "asc" as const } },
    },
  })

  if (!service) return null

  // Izinkan ADMIN preview DRAFT via moderasi (?preview=1). Publik tidak
  // melihat jasa non-ACTIVE sama sekali.
  if (service.status !== "ACTIVE") {
    const session = await auth()
    if (!isAdminRole(session?.user?.role)) return null
  }

  // Langganan penyedia yang berakhir menyembunyikan jasanya dari publik,
  // sama seperti status DRAFT. Penyedia tetap melihatnya di dashboard.
  const providerSubscriptionActive =
    service.provider.subscriptionUntil !== null &&
    service.provider.subscriptionUntil.getTime() > Date.now()
  if (!providerSubscriptionActive) {
    const session = await auth()
    if (!isAdminRole(session?.user?.role)) return null
  }

  return service
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  // Status 404 SUNGGUHAN diputuskan middleware.ts, bukan di sini.
  //
  // Diukur di build produksi: `notFound()` di fungsi ini TIDAK menyetel status
  // (tetap 200), karena root layout membaca sesi sehingga rute dirender dinamis
  // dan shell-nya sudah terkirim sebelum metadata dievaluasi. Middleware
  // berjalan lebih dulu dan me-rewrite slug yang tidak layak ke path yang tidak
  // ada, sehingga Next sendiri yang menjawab 404.
  //
  // notFound() di bawah tetap dipertahankan sebagai lapisan kedua: permintaan
  // RSC (navigasi/prefetch klien) sengaja dilewatkan gerbang middleware, dan
  // jasa bisa berubah status di antara pemeriksaan middleware dan render.
  const service = await getServiceForView(slug)
  if (!service) notFound()

  const url = `${siteUrl}/service/${slug}`

  const description =
    service.description.length > 155
      ? `${service.description.slice(0, 152)}...`
      : service.description

  const keywords = [
    service.title,
    service.category.name,
    "jasa",
    "layanan lokal",
    "marketplace jasa",
    "penyedia jasa",
    `jasa ${service.category.name.toLowerCase()}`,
  ]

  return {
    title: service.title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: service.title,
      description,
      url,
      type: "website",
      siteName: "JASAKITE",
      locale: "id_ID",
    },
    twitter: {
      card: "summary_large_image",
      title: service.title,
      description,
    },
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // null berarti tidak ada ATAU tidak boleh dilihat — keduanya 404. Gerbang
  // middleware memakai aturan yang sama (middleware.ts + serviceDetailGate),
  // tapi pengecekan ini tetap diperlukan: navigasi RSC dilewatkan gerbang, dan
  // status jasa bisa berubah di antara pemeriksaan middleware dan render.
  const service = await getServiceForView(slug)
  if (!service) notFound()

  // Fakta terstruktur tentang provider untuk tab "Tentang Provider" —
  // menggantikan bio auto-generated yang sebelumnya filler copy.
  const [completedOrders, providerRating] = await Promise.all([
    prisma.order.count({
      where: { status: "COMPLETED", service: { providerId: service.providerId } },
    }),
    prisma.service.aggregate({
      where: { providerId: service.providerId, totalReviews: { gt: 0 } },
      _avg: { ratingAvg: true },
    }),
  ])

  const providerStats = {
    completedOrders,
    memberSince: service.provider.createdAt.toISOString(),
    city: service.provider.city,
    avgRating: providerRating._avg.ratingAvg ?? 0,
  }

  const related = await prisma.service.findMany({
    where: {
      status: "ACTIVE",
      categoryId: service.categoryId,
      id: { not: service.id },
    },
    include: {
      provider: { select: { id: true, name: true, avatarUrl: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { ratingAvg: "desc" },
    take: 3,
  })

  const jsonLd = serviceJsonLd({
    title: service.title,
    description: service.description,
    categoryName: service.category.name,
    url: `${siteUrl}/service/${service.slug}`,
    imageUrl: service.imageUrl,
    providerName: service.provider.name,
    providerUrl: `${siteUrl}/provider/${service.provider.id}`,
    price: service.price,
    ratingAvg: service.ratingAvg,
    totalReviews: service.totalReviews,
  })

  // Mengikuti breadcrumb yang terlihat di UI: Beranda → kategori → jasa.
  const breadcrumb = breadcrumbJsonLd([
    { name: "Beranda", url: `${siteUrl}/` },
    {
      name: service.category.name,
      url: `${siteUrl}/services?category=${service.category.id}`,
    },
    { name: service.title, url: `${siteUrl}/service/${service.slug}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([jsonLd, breadcrumb]) }}
      />
      <ServiceDetailClient
        service={service}
        related={related}
        providerStats={providerStats}
        pageUrl={`${siteUrl}/service/${service.slug}`}
      />
    </>
  )
}
