import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { notify } from "@/lib/notifications"
import { requireMoneyAccess } from "@/lib/totp-guard"

export const dynamic = "force-dynamic"

const verifySchema = z.object({
  action: z.enum(["verify", "reject"]),
  rejectReason: z.string().trim().min(3, "Sebutkan alasan penolakan").max(300).optional(),
  // Kode 2FA saat keputusan diambil — bukan hanya saat login.
  totpCode: z.string().trim().min(1, "Kode 2FA wajib diisi").max(7),
})

const rupiah = new Intl.NumberFormat("id-ID")

/**
 * POST — keputusan admin atas pengajuan dompet (top-up & withdraw).
 *
 * Invariant yang dijaga di SATU transaksi:
 *  - TOPUP verify  : kredit saldo atomik + ledger PENDING → VERIFIED dengan
 *                    balanceAfter = saldo terbaru. Dua admin yang memverifikasi
 *                    pengajuan yang sama bersamaan → hanya satu menang
 *                    (updateMany where status PENDING), yang kalah mendapat 409.
 *  - TOPUP reject  : ledger PENDING → REJECTED, saldo TIDAK disentuh.
 *  - WITHDRAW verify : terminal — dana sudah didebit saat pengajuan; cap waktu
 *                    keputusan saja. Transfer manual ke rekening user terjadi
 *                    di luar sistem.
 *  - WITHDRAW reject : kembalikan dana — kredit atomik + baris REFUND baru,
 *                    lalu pengajuan → REJECTED. User saldo utuh kembali.
 *
 * Gerbang akses: SUPER_ADMIN + kode TOTP yang sah dan belum pernah dipakai
 * (`requireMoneyAccess`). ADMIN biasa tetap 403 walau menyertakan kode.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminId = prismaId(session.user.id)

  const limited = enforceRateLimit(
    request,
    "wallet-verify",
    RATE_LIMITS.walletVerify,
    session.user.id
  )
  if (limited) return limited

  // Ambang terpisah dan jauh lebih ketat untuk tebakan kode 6 digit.
  const twoFactorLimited = enforceRateLimit(
    request,
    "wallet-verify-2fa",
    RATE_LIMITS.totpVerify,
    session.user.id
  )
  if (twoFactorLimited) return twoFactorLimited

  const { id } = await params
  if (!id || !/^[0-9a-fA-F]{24}$|^\d+$/.test(id.trim())) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  try {
    const { action, rejectReason, totpCode } = verifySchema.parse(await request.json())
    if (action === "reject" && !rejectReason) {
      return NextResponse.json(
        { error: "Alasan penolakan wajib diisi" },
        { status: 400 }
      )
    }

    const transactionId = prismaId(id.trim())
    const walletTx = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
    })
    if (!walletTx) {
      return NextResponse.json(
        { error: "Pengajuan tidak ditemukan" },
        { status: 404 }
      )
    }
    if (walletTx.status !== "PENDING") {
      return NextResponse.json(
        { error: "Pengajuan ini sudah diputus" },
        { status: 409 }
      )
    }

    const isTopup = walletTx.type === "TOPUP"
    const isWithdraw = walletTx.type === "WITHDRAW"
    if (!isTopup && !isWithdraw) {
      return NextResponse.json(
        { error: "Jenis transaksi ini tidak diverifikasi manual" },
        { status: 400 }
      )
    }

    // Uang hanya boleh diputus SUPER_ADMIN, dan hanya dengan kode 2FA yang sah
    // pada saat itu juga. ADMIN mengurus operasional, bukan saldo orang lain —
    // satu akun yang salah klik bisa mengkredit Rp10 juta.
    //
    // Diletakkan SETELAH validasi di atas supaya permintaan yang pasti gagal
    // (ID salah, pengajuan sudah diputus) tidak menghabiskan kode 2FA admin.
    const denied = await requireMoneyAccess(session.user.id, totpCode)
    if (denied) return denied

    const updated = await prisma.$transaction(async (tx) => {
      if (isTopup && action === "verify") {
        // Kredit saldo atomik — tanpa pembacaan-then-tulis.
        const credited = await tx.user.updateMany({
          where: { id: walletTx.userId },
          data: { balance: { increment: walletTx.amount } },
        })
        if (credited.count === 0) throw new Error("Pengguna tidak ditemukan")
        const refreshed = await tx.user.findUnique({
          where: { id: walletTx.userId },
          select: { balance: true },
        })
        if (!refreshed) throw new Error("Pengguna tidak ditemukan setelah kredit")

        const claimed = await tx.walletTransaction.updateMany({
          where: { id: transactionId, status: "PENDING" },
          data: {
            status: "VERIFIED",
            balanceAfter: refreshed.balance,
            verifiedById: adminId,
            verifiedAt: new Date(),
          },
        })
        if (claimed.count === 0) {
          throw Object.assign(new Error("Pengajuan sudah diputus"), { code: "CONFLICT" })
        }
        return { status: "VERIFIED" as const }
      }

      if (isWithdraw && action === "reject") {
        // Kembalikan dana yang terlanjur dibekukan.
        const refunded = await tx.user.updateMany({
          where: { id: walletTx.userId },
          data: { balance: { increment: walletTx.amount } },
        })
        if (refunded.count === 0) throw new Error("Pengguna tidak ditemukan")
        const refreshed = await tx.user.findUnique({
          where: { id: walletTx.userId },
          select: { balance: true },
        })
        if (!refreshed) throw new Error("Pengguna tidak ditemukan setelah refund")

        const claimed = await tx.walletTransaction.updateMany({
          where: { id: transactionId, status: "PENDING" },
          data: {
            status: "REJECTED",
            rejectReason: rejectReason ?? null,
            verifiedById: adminId,
            verifiedAt: new Date(),
          },
        })
        if (claimed.count === 0) {
          throw Object.assign(new Error("Pengajuan sudah diputus"), { code: "CONFLICT" })
        }
        await tx.walletTransaction.create({
          data: {
            userId: walletTx.userId,
            type: "REFUND",
            status: "VERIFIED",
            amount: walletTx.amount,
            balanceAfter: refreshed.balance,
            orderId: walletTx.orderId,
          },
        })
        return { status: "REJECTED" as const }
      }

      // Sisa jalur: TOPUP reject & WITHDRAW verify — tidak menyentuh saldo.
      const claimed = await tx.walletTransaction.updateMany({
        where: { id: transactionId, status: "PENDING" },
        data:
          action === "verify"
            ? { status: "VERIFIED", verifiedById: adminId, verifiedAt: new Date() }
            : {
                status: "REJECTED",
                rejectReason: rejectReason ?? null,
                verifiedById: adminId,
                verifiedAt: new Date(),
              },
      })
      if (claimed.count === 0) {
        throw Object.assign(new Error("Pengajuan sudah diputus"), { code: "CONFLICT" })
      }
      return { status: action === "verify" ? ("VERIFIED" as const) : ("REJECTED" as const) }
    })

    // Notifikasi SETELAH commit — kegagalan tidak membatalkan keputusan.
    const approved = updated.status === "VERIFIED"
    await notify({
      userId: walletTx.userId,
      type: "SYSTEM",
      title: isTopup
        ? approved
          ? `Isi saldo ${walletTx.topupCode ?? ""} disetujui`
          : `Isi saldo ${walletTx.topupCode ?? ""} ditolak`
        : approved
          ? "Penarikan saldo disetujui"
          : "Penarikan saldo ditolak",
      body: isTopup
        ? approved
          ? `Saldo bertambah Rp${rupiah.format(walletTx.amount)}.`
          : (rejectReason ?? "Bukti transfer tidak dapat diverifikasi.")
        : approved
          ? `Rp${rupiah.format(walletTx.amount)} sedang ditransfer ke rekening Anda.`
          : `Dana dikembalikan ke saldo. ${rejectReason ?? ""}`.trim(),
      href: "/dashboard/wallet",
    })

    return NextResponse.json({ ok: true, status: updated.status })
  } catch (error) {
    if ((error as unknown as { code?: string })?.code === "CONFLICT") {
      return NextResponse.json(
        { error: "Pengajuan sudah diputus admin lain, muat ulang" },
        { status: 409 }
      )
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[wallet/verify] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
