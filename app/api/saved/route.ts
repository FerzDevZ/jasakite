import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

const toggleSchema = z.object({
  serviceId: z.union([z.string(), z.number()]).transform(String).refine((v) => /^[0-9a-fA-F]{24}$/.test(v) || /^\d+$/.test(v), "serviceId tidak valid"),
})

// Daftar jasa yang disimpan oleh user yang sedang login.
// Mendukung `?id=<serviceId>` untuk memeriksa status simpan satu jasa saja.
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "saved-read",
    RATE_LIMITS.read,
    session.user.id
  )
  if (limited) return limited

  try {
    // Pastikan ID selalu string untuk MongoDB @db.ObjectId
    const userId = String(session.user.id)
    const { searchParams } = new URL(request.url)
    const singleId = searchParams.get("id")

    if (singleId) {
      const serviceId = String(singleId)
      if (!serviceId.trim()) {
        return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
      }
      const exists = await prisma.savedService.findUnique({
        where: { userId_serviceId: { userId, serviceId } },
        select: { id: true },
      })
      return NextResponse.json({ saved: Boolean(exists) })
    }

    const saved = await prisma.savedService.findMany({
      where: { userId },
      include: {
        service: {
          include: {
            provider: { select: { id: true, name: true, avatarUrl: true } },
            category: { select: { id: true, name: true, slug: true, icon: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(saved.map((s) => s.service))
  } catch (error) {
    console.error("[saved] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

// Simpan (POST) / hapus (DELETE) dari wishlist
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "save",
    RATE_LIMITS.save,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const parsed = toggleSchema.parse(body)
    const serviceId = String(parsed.serviceId)
    const userId = String(session.user.id)

    const service = await prisma.service.findUnique({
      where: { id: serviceId } as any,
      select: { id: true, status: true },
    })
    if (!service || service.status !== "ACTIVE") {
      return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 })
    }

    // Toggle tanpa transaksi — MongoDB M0 (free tier) tidak support
    // multi-document transactions. Unique constraint tetap menjaga
    // integritas: race condition paling banter create duplikat yang
    // langsung ditolak unique index.
    const existing = await prisma.savedService.findUnique({
      where: { userId_serviceId: { userId, serviceId } },
    })

    if (existing) {
      await prisma.savedService.delete({ where: { id: existing.id } })
      return NextResponse.json({ saved: false }, { status: 200 })
    }

    try {
      await prisma.savedService.create({ data: { userId, serviceId } })
      return NextResponse.json({ saved: true }, { status: 201 })
    } catch (createErr: unknown) {
      // `unknown`, bukan `any`: `catch (e: any)` membuat setiap properti yang
      // salah ketik (mis. `err.cod`) tetap lolos kompilasi dan hanya muncul
      // sebagai kegagalan sunyi saat race condition benar-benar terjadi.
      // P2002 = unique constraint violated — berarti ada race condition,
      // delete saja record yang baru dibuat user lain.
      const code = (createErr as { code?: unknown } | null)?.code
      if (code === "P2002") {
        const dupe = await prisma.savedService.findUnique({
          where: { userId_serviceId: { userId, serviceId } },
        })
        if (dupe) {
          await prisma.savedService.delete({ where: { id: dupe.id } })
          return NextResponse.json({ saved: false }, { status: 200 })
        }
      }
      throw createErr
    }
  } catch (error) {
    console.error("[saved] POST error:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
