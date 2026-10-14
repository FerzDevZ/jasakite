import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export async function GET(request: NextRequest) {
  const limited = enforceRateLimit(request, "search", RATE_LIMITS.search)
  if (limited) return limited

  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 50)

  if (!query || query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const tokens = query
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5)
      .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    const suggestions = await prisma.service.findMany({
      where: {
        status: "ACTIVE",
        AND: tokens.map((token) => ({
          OR: [
            { title: { contains: token } },
            { description: { contains: token } },
          ],
        })),
      },
      select: {
        title: true,
        slug: true,
      },
      take: 8,
      orderBy: {
        title: "asc",
      },
    })

    // Deduplicate by title, keep first slug (P1-10)
    const seen = new Set<string>()
    const deduped: { title: string; slug: string }[] = []
    for (const s of suggestions) {
      const key = s.title.trim().toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(s)
      }
      if (deduped.length >= 6) break
    }

    return NextResponse.json({
      suggestions: deduped,
    })
  } catch (error) {
    console.error("Search suggestions error:", error)
    return NextResponse.json({ suggestions: [] })
  }
}