import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

/**
 * Banner kampanye aktif untuk beranda.
 *
 * Endpoint publik (tanpa login) karena beranda memang terbuka, tetapi tetap
 * dibatasi laju: satu banner rail dipanggil setiap kali beranda dibuka.
 *
 * Penyaringan tanggal dilakukan di database dengan dua klausa yang sama-sama
 * pasti: `isActive: true` dan `endsAt` yang masih di depan (atau null). Bukan
 * disaring di JS, karena banner kedaluwarsa yang lolos ke UI berarti janji
 * promo yang tidak bisa dipakai pelanggan.
 */
export async function GET(request: Request) {
  const limited = enforceRateLimit(request, "promos", RATE_LIMITS.read)
  if (limited) return limited

  try {
    const now = new Date()
    const banners = await prisma.promoBanner.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { position: "asc" },
      take: 6,
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error("[promos] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
