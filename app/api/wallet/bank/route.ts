import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { buildBankSnapshot } from "@/lib/wallet"

export const dynamic = "force-dynamic"

const bankSchema = z.object({
  bankName: z.string().trim().min(2, "Nama bank minimal 2 karakter").max(60),
  bankAccountNumber: z
    .string()
    .trim()
    .min(6, "Nomor rekening minimal 6 digit")
    .max(30)
    .regex(/^\d+$/, "Nomor rekening hanya boleh angka"),
  bankAccountName: z.string().trim().min(2, "Nama pemilik minimal 2 karakter").max(60),
})

/** PUT — simpan rekening penarikan milik sendiri. */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "wallet-bank",
    RATE_LIMITS.walletRead,
    session.user.id
  )
  if (limited) return limited

  try {
    const validated = bankSchema.parse(await request.json())
    const userId = prismaId(session.user.id)

    await prisma.user.update({
      where: { id: userId },
      data: {
        bankName: validated.bankName,
        bankAccountNumber: validated.bankAccountNumber,
        bankAccountName: validated.bankAccountName,
      },
    })

    const snapshot = buildBankSnapshot(validated)
    return NextResponse.json({ ok: true, bankSnapshot: snapshot })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[wallet/bank] PUT error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
