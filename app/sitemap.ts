import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site-url"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL

  const services = await prisma.service.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, createdAt: true, ratingAvg: true },
  })

  const providers = await prisma.user.findMany({
    where: { role: "PROVIDER", services: { some: { status: "ACTIVE" } } },
    select: { id: true },
  })

  const now = new Date()

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/services`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...services.map((s) => ({
      url: `${base}/service/${s.slug}`,
      lastModified: s.createdAt,
      changeFrequency: "weekly" as const,
      priority: s.ratingAvg > 4.5 ? 0.9 : s.ratingAvg > 4.0 ? 0.8 : 0.7,
    })),
    ...providers.map((p) => ({
      url: `${base}/provider/${p.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ]
}
