import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole, isSuperAdminRole } from "@/lib/roles"
import {
  getMonthlyPrice,
  renewDueSubscriptions,
  setMonthlyPrice,
} from "@/lib/subscription-server"
import {
  DEFAULT_MONTHLY_PRICE,
  MAX_MONTHLY_PRICE,
  MIN_MONTHLY_PRICE,
  describeSubscription,
} from "@/lib/subscription"

export const dynamic = "force-dynamic"

/**
 * Pengaturan langganan penyedia (khusus admin).
 *
 * GET  — harga bulanan yang berlaku + daftar penyedia (status, saldo, jasa).
 * PATCH — mengubah harga bulanan. Hanya SUPER_ADMIN: harga yang dinaikkan
 *         langsung memotong saldo penyedia pada siklus berikutnya, jadi ini
 *         keputusan uang seperti verifikasi top-up.
 * POST — jalankan perpanjangan otomatis sekarang (tombol "Tagih sekarang").
 *        Idempoten dengan cron; dipakai saat demo/presentasi tanpa menunggu
 *        jadwal harian.
 */

const priceSchema = z.object({ monthlyPrice: z.union([z.number(), z.string()]) })

async function requireAdmin(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { id: true, role: true },
  })
  if (!isAdminRole(user?.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  const limited = await enforceRateLimit(
    request,
    "admin-subscription",
    RATE_LIMITS.adminRead,
    session.user.id
  )
  if (limited) return { error: limited }

  return { user: user as { id: string; role: string } }
}

export async function GET(request: Request) {
  const authResult = await requireAdmin(request)
  if ("error" in authResult) return authResult.error

  const now = new Date()
  const [monthlyPrice, providers] = await Promise.all([
    getMonthlyPrice(),
    prisma.user.findMany({
      where: { role: "PROVIDER" },
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        balance: true,
        subscriptionUntil: true,
        _count: { select: { services: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
  ])

  return NextResponse.json({
    monthlyPrice,
    defaultPrice: DEFAULT_MONTHLY_PRICE,
    minPrice: MIN_MONTHLY_PRICE,
    maxPrice: MAX_MONTHLY_PRICE,
    providers: providers.map((provider) => {
      const snapshot = describeSubscription(provider.subscriptionUntil, now)
      return {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        city: provider.city,
        balance: provider.balance,
        serviceCount: provider._count.services,
        state: snapshot.state,
        daysLeft: snapshot.daysLeft,
        subscriptionUntil: provider.subscriptionUntil
          ? provider.subscriptionUntil.toISOString()
          : null,
      }
    }),
  })
}

export async function PATCH(request: Request) {
  const authResult = await requireAdmin(request)
  if ("error" in authResult) return authResult.error

  if (!isSuperAdminRole(authResult.user.role)) {
    return NextResponse.json(
      { error: "Hanya SUPER_ADMIN yang dapat mengubah harga langganan" },
      { status: 403 }
    )
  }

  try {
    const body = priceSchema.parse(await request.json())
    const result = await setMonthlyPrice(body.monthlyPrice, authResult.user.id)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true, monthlyPrice: result.price })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Harga bulanan wajib diisi" },
        { status: 400 }
      )
    }
    console.error("[admin/subscription] PATCH error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authResult = await requireAdmin(request)
  if ("error" in authResult) return authResult.error

  if (!isSuperAdminRole(authResult.user.role)) {
    return NextResponse.json(
      { error: "Hanya SUPER_ADMIN yang dapat menjalankan penagihan" },
      { status: 403 }
    )
  }

  try {
    const summary = await renewDueSubscriptions()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error("[admin/subscription] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
