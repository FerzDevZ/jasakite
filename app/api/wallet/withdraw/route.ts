import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { notify } from "@/lib/notifications"
import {
  buildBankSnapshot,
  hasCompleteBankAccount,
  roundToRupiah,
  validateWithdrawAmount,
} from "@/lib/wallet"

export const dynamic = "force-dynamic"

const withdrawSchema = z.object({
  amount: z.coerce.number().positive(),
})

/**
 * POST — ajukan penarikan saldo.
 *
 * Status pengajuan langsung PENDING dan SALDO SUDAH DIKURANGI (debit atomik
 * `balance >= amount` di dalam transaksi). Membekukan dana sejak pengajuan
 * mencegah saldo yang sama dibelanjakan dua kali — kegagalan verifikasi
 * kemudian mengembalikan dana lewat endpoint tolak admin, bukan dengan
 * membiarkan saldo tetap terpakai.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "wallet-withdraw",
    RATE_LIMITS.walletWithdraw,
    session.user.id
  )
  if (limited) return limited

  try {
    const validated = withdrawSchema.parse(await request.json())
    const amount = roundToRupiah(validated.amount)
    const userId = prismaId(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
    }

    const amountError = validateWithdrawAmount(amount, user.balance)
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 })
    }
    if (!hasCompleteBankAccount(user)) {
      return NextResponse.json(
        { error: "Lengkapi rekening penarikan terlebih dahulu" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const debited = await tx.user.updateMany({
        where: { id: userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      })
      if (debited.count === 0) {
        throw Object.assign(new Error("Saldo tidak mencukupi"), { code: "INSUFFICIENT" })
      }
      const refreshed = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      })
      if (!refreshed) throw new Error("Pengguna tidak ditemukan setelah debit")
      return tx.walletTransaction.create({
        data: {
          userId,
          type: "WITHDRAW",
          status: "PENDING",
          amount,
          balanceAfter: refreshed.balance,
          bankSnapshot: buildBankSnapshot(user),
        },
      })
    })

    // Notifikasi ke admin dilakukan SETELAH transaksi commit dan kegagalannya
    // tidak membatalkan pengajuan — pola yang sama dengan notify pesanan.
    // Hanya SUPER_ADMIN yang bisa memutuskan penarikan; memberi tahu ADMIN
    // biasa hanya menghasilkan notifikasi yang tidak bisa ditindaklanjuti.
    const admins = await prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true },
      take: 10,
    })
    await Promise.all(
      admins.map((admin) =>
        notify({
          userId: admin.id,
          type: "SYSTEM",
          title: "Pengajuan tarik saldo baru",
          body: `Menunggu verifikasi — Rp${new Intl.NumberFormat("id-ID").format(amount)}`,
          href: "/dashboard/admin/wallet",
        })
      )
    )

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if ((error as unknown as { code?: string })?.code === "INSUFFICIENT") {
      return NextResponse.json(
        { error: "Saldo tidak mencukupi untuk penarikan ini" },
        { status: 409 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[wallet/withdraw] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
