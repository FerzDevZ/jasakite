import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import {
  buildBankSnapshot,
  getPlatformBankAccount,
  hasCompleteBankAccount,
  randomTopupCode,
  roundToRupiah,
  validateTopupAmount,
  validateWithdrawAmount,
} from "@/lib/wallet"

export const dynamic = "force-dynamic"

// ── GET: saldo + riwayat + pengajuan berjalan ────────────────────────────────

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "wallet-read",
    RATE_LIMITS.walletRead,
    session.user.id
  )
  if (limited) return limited

  try {
    const userId = prismaId(session.user.id)

    // ?slim=1 — checkout hanya butuh angka saldo. Tanpa ini, checkout menarik
    // 50 baris riwayat yang ikut memuat data URI bukti transfer (ratusan KB
    // per baris) hanya untuk membandingkan satu angka dengan total belanja.
    if (new URL(request.url).searchParams.get("slim") === "1") {
      const balanceOnly = await prisma.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      })
      if (!balanceOnly) {
        return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
      }
      return NextResponse.json({ balance: balanceOnly.balance })
    }

    const [user, transactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          balance: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      }),
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ])
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
    }

    return NextResponse.json({
      balance: user.balance,
      bank: {
        bankName: user.bankName,
        bankAccountNumber: user.bankAccountNumber,
        bankAccountName: user.bankAccountName,
      },
      platformBank: getPlatformBankAccount(),
      transactions,
    })
  } catch (error) {
    console.error("[wallet] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

// ── POST: ajukan top-up ──────────────────────────────────────────────────────

// Data URI kompresan kanvas dari klien (image/jpeg) atau URL https dari host
// terpercaya. Pola `data:<mime>;base64,` divalidasi ketat — zod .startsWith
// di sengaja dipakai agar skema lain (svg+xml → XSS, text/html, dsb) gugur.
const dataUriPattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const httpsUrlPattern = /^https:\/\/[\w.-]+(:\d+)?([/?#][^\s]*)?$/

const imageUrlSchema = z
  .string()
  .max(300_000, "Gambar terlalu besar setelah kompresi (maks ~280KB)")
  .refine(
    (value) => dataUriPattern.test(value) || httpsUrlPattern.test(value),
    { message: "Bukti harus berupa unggahan gambar (JPG/PNG/WebP) atau URL https" }
  )
  .optional()
  .or(z.literal(""))

const topupSchema = z.object({
  amount: z.coerce.number().positive(),
  proofImage: imageUrlSchema,
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "wallet-topup",
    RATE_LIMITS.walletTopup,
    session.user.id
  )
  if (limited) return limited

  try {
    const validated = topupSchema.parse(await request.json())
    const amount = roundToRupiah(validated.amount)

    const amountError = validateTopupAmount(amount)
    if (amountError) {
      return NextResponse.json({ error: amountError }, { status: 400 })
    }
    if (!validated.proofImage) {
      return NextResponse.json(
        { error: "Bukti transfer wajib dilampirkan" },
        { status: 400 }
      )
    }

    const userId = prismaId(session.user.id)
    const topupCode = randomTopupCode()

    // Ledger PENDING: saldo BELUM berubah — hanya admin yang bisa
    // mengubahnya lewat endpoint verifikasi.
    const topup = await prisma.walletTransaction.create({
      data: {
        userId,
        type: "TOPUP",
        status: "PENDING",
        amount,
        balanceAfter: 0,
        proofImage: validated.proofImage,
        // Audit lampiran pertama — PATCH penggantian bukti menimpanya.
        proofImageUpdatedAt: new Date(),
        topupCode,
      },
    })

    return NextResponse.json(topup, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[wallet] POST topup error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

// ── PATCH: lengkapi bukti transfer pada pengajuan PENDING ────────────────────

const attachProofSchema = z.object({
  transactionId: z.string().min(1),
  proofImage: imageUrlSchema,
})

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "wallet-topup",
    RATE_LIMITS.walletTopup,
    session.user.id
  )
  if (limited) return limited

  try {
    const validated = attachProofSchema.parse(await request.json())
    if (!validated.proofImage) {
      return NextResponse.json(
        { error: "Bukti transfer wajib dilampirkan" },
        { status: 400 }
      )
    }

    const userId = prismaId(session.user.id)
    const existing = await prisma.walletTransaction.findUnique({
      where: { id: prismaId(validated.transactionId) },
    })
    if (!existing || String(existing.userId) !== String(userId)) {
      return NextResponse.json(
        { error: "Pengajuan tidak ditemukan" },
        { status: 404 }
      )
    }
    if (existing.type !== "TOPUP" || existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Hanya pengajuan top-up yang masih menunggu bisa diperbarui" },
        { status: 409 }
      )
    }

    const updated = await prisma.walletTransaction.update({
      where: { id: existing.id },
      data: {
        proofImage: validated.proofImage,
        // Audit penggantian — inilah yang membuat admin melihat badge
        // "bukti diubah" di antrean verifikasi.
        proofImageUpdatedAt: new Date(),
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[wallet] PATCH proof error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

