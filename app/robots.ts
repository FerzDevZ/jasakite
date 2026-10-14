import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/checkout",
        "/orders",
        "/login",
        "/register",
        "/api/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
