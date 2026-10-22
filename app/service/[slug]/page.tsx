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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const service = await prisma.service.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      price: true,
      ratingAvg: true,
      totalReviews: true,
      category: { select: { name: true } },
    },
  })

  const url = `${siteUrl}/service/${slug}`

  if (!service) {
    return {
      title: "Jasa tidak ditemukan",
      description: "Jasa yang Anda cari tidak tersedia atau telah dihapus.",
      alternates: { canonical: url },
      // Halaman ini merender UI not-found tapi status HTTP-nya tetap 200:
      // <Navbar /> adalah async server component di root layout, sehingga
      // respons sudah di-stream (header terkirim) sebelum notFound() di bawah
      // dievaluasi. Next.js tidak bisa mengubah status setelah itu.
      //
      // Tanpa noindex, crawler memperlakukannya sebagai soft 404 dan bisa
      // mengindeks halaman kosong untuk setiap slug ngawur yang pernah
      // ditautkan. noindex menutup celah itu tanpa merombak layout.
      robots: { index: false, follow: false },
    }
  }

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
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      // Paket tier untuk selector harga di client — tanpa include ini
      // kotak "Pilih paket" tidak pernah dirender (client hanya menerima
      // data yang di-serial halaman ini, bukan panggilan /api/services).
      packages: { orderBy: { position: "asc" as const } },
    },
  })

  if (!service) notFound()
  // Izinkan ADMIN preview DRAFT via moderasi (?preview=1). Publik tetap 404 untuk non-ACTIVE.
  if (service.status !== "ACTIVE") {
    const session = await auth()
    if (!isAdminRole(session?.user?.role)) notFound()
  }

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
