import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId } from "@/lib/ids"
import { checkVoucher, type VoucherType } from "@/lib/vouchers"

export const dynamic = "force-dynamic"

const schema = z.object({
  code: z.string().trim().min(2).max(32),
  subtotal: z.coerce.number().min(0).max(1_000_000_000),
  city: z.string().trim().max(60).optional().nullable(),
})

/**
 * Validasi kode voucher terhadap subtotal nyata.
 *
 * `subtotal` DIKIRIM KLIEN untuk menghitung pratinjau potongan. Itu aman karena
 * endpoint ini hanya menjawab "berapa potongannya", bukan menagih: penagihan
 * sesungguhnya terjadi di `POST /api/orders`, yang menghitung ulang subtotal
 * dari database dan memvalidasi voucher sekali lagi. Kalau klien berbohong di
 * sini, ia hanya menipu pratinjau di layarnya sendiri.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(
    request,
    "voucher-validate",
    RATE_LIMITS.voucher,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = schema.parse(body)
    const code = validated.code.toUpperCase()

    const voucher = await prisma.voucher.findUnique({ where: { code } })
    if (!voucher) {
      return NextResponse.json(
        { ok: false, reason: "Kode voucher tidak dikenal" },
        { status: 200 }
      )
    }

    const userId = prismaId(session.user.id)
    const redemptions = await prisma.voucherRedemption.count({
      where: { voucherCode: voucher.code, userId },
    })

    const check = checkVoucher(
      {
        code: voucher.code,
        type: voucher.type as VoucherType,
        value: voucher.value,
        minSpend: voucher.minSpend,
        maxDiscount: voucher.maxDiscount,
        scopeCity: voucher.scopeCity,
        isActive: voucher.isActive,
        startsAt: voucher.startsAt,
        endsAt: voucher.endsAt,
        quota: voucher.quota,
        usedCount: voucher.usedCount,
        perUser: voucher.perUser,
        userRedemptions: redemptions,
      },
      validated.subtotal,
      validated.city?.toLowerCase() ?? null
    )

    if (!check.ok) {
      return NextResponse.json({ ok: false, reason: check.reason }, { status: 200 })
    }

    return NextResponse.json({
      ok: true,
      code: voucher.code,
      title: voucher.title,
      discount: check.discount,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, reason: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[vouchers/validate] error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
