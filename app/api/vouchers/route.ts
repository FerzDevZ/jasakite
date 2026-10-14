import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId } from "@/lib/ids"
import { checkVoucher, type VoucherType } from "@/lib/vouchers"

export const dynamic = "force-dynamic"

/**
 * Daftar voucher yang BISA dipakai pengguna ini.
 *
 * Setiap voucher dikembalikan bersama status kelayakannya (`eligible` +
 * `reason`), bukan hanya yang lolos. Alasannya praktis: pelanggan yang punya
 * kode tetapi tidak bisa memakainya berhak tahu kenapa ("minimal belanja
 * Rp300.000"), dan pesan itu persis sama dengan yang muncul kalau validasi
 * dijalankan — keduanya memakai `checkVoucher` yang sama, jadi tidak mungkin
 * berbeda.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = enforceRateLimit(request, "vouchers", RATE_LIMITS.read, session.user.id)
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const subtotal = Math.max(0, Number(searchParams.get("subtotal") ?? 0) || 0)
    const city = searchParams.get("city")?.toLowerCase() ?? null

    const userId = prismaId(session.user.id)
    const now = new Date()

    const vouchers = await prisma.voucher.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { value: "desc" },
      take: 20,
    })

    if (vouchers.length === 0) {
      return NextResponse.json({ vouchers: [] })
    }

    const codes = vouchers.map((v) => v.code)
    const redemptions = await prisma.voucherRedemption.findMany({
      where: { userId, voucherCode: { in: codes } },
      select: { voucherCode: true },
    })
    const usedByUser = new Map<string, number>()
    for (const redemption of redemptions) {
      usedByUser.set(
        redemption.voucherCode,
        (usedByUser.get(redemption.voucherCode) ?? 0) + 1
      )
    }

    const items = vouchers.map((voucher) => {
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
          userRedemptions: usedByUser.get(voucher.code) ?? 0,
        },
        subtotal,
        city
      )

      return {
        code: voucher.code,
        title: voucher.title,
        description: voucher.description,
        type: voucher.type as VoucherType,
        value: voucher.value,
        minSpend: voucher.minSpend,
        scopeCity: voucher.scopeCity,
        endsAt: voucher.endsAt,
        eligible: check.ok,
        reason: check.ok ? null : check.reason,
        discount: check.ok ? check.discount : 0,
      }
    })

    return NextResponse.json({ vouchers: items })
  } catch (error) {
    console.error("[vouchers] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
