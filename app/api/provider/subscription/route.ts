import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole } from "@/lib/roles"
import {
  chargeProviderSubscription,
  getProviderSubscriptionView,
} from "@/lib/subscription-server"
import { formatRupiah } from "@/lib/subscription"

export const dynamic = "force-dynamic"

/**
 * Langganan penyedia: status + tagihan.
 *
 * GET dipakai halaman /dashboard/provider/langganan dan banner dashboard.
 * POST adalah tombol "Perpanjang sekarang" — memotong saldo dompet sebesar
 * harga bulanan yang sedang berlaku. Perpanjangan otomatis bulanan dikerjakan
 * cron (/api/cron/subscription), bukan endpoint ini.
 */

async function requireProvider(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const user = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { id: true, role: true },
  })
  if (!user) {
    return { error: NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 }) }
  }
  // Admin boleh melihat/mengaktifkan langganan penyedia dari halaman mereka
  // sendiri; hanya peran lain (CUSTOMER) yang ditolak.
  if (user.role !== "PROVIDER" && !isAdminRole(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Hanya penyedia jasa yang memiliki langganan" },
        { status: 403 }
      ),
    }
  }

  return { user }
}

export async function GET(request: Request) {
  const authResult = await requireProvider(request)
  if ("error" in authResult) return authResult.error

  const limited = await enforceRateLimit(
    request,
    "subscription-read",
    RATE_LIMITS.walletRead,
    authResult.user.id
  )
  if (limited) return limited

  const view = await getProviderSubscriptionView(authResult.user.id)
  if (!view) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json(view)
}

export async function POST(request: Request) {
  const authResult = await requireProvider(request)
  if ("error" in authResult) return authResult.error

  const limited = await enforceRateLimit(
    request,
    "subscription-charge",
    RATE_LIMITS.subscriptionCharge,
    authResult.user.id
  )
  if (limited) return limited

  const outcome = await chargeProviderSubscription(authResult.user.id)

  if (outcome.status === "NOT_PROVIDER") {
    return NextResponse.json(
      { error: "Hanya penyedia jasa yang dapat berlangganan" },
      { status: 403 }
    )
  }

  if (outcome.status === "INSUFFICIENT") {
    return NextResponse.json(
      {
        error: `Saldo tidak cukup. Butuh ${formatRupiah(
          outcome.required
        )}, saldo Anda ${formatRupiah(outcome.balance)}.`,
        code: "INSUFFICIENT_BALANCE",
        required: outcome.required,
        balance: outcome.balance,
      },
      { status: 409 }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      amount: outcome.amount,
      periodEnd: outcome.periodEnd.toISOString(),
      balanceAfter: outcome.balanceAfter,
    },
    { status: 201 }
  )
}
