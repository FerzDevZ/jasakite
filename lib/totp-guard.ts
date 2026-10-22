// Penjaga langkah-kedua untuk aksi yang memindahkan uang.
//
// Login yang membawa cookie sesi tidak cukup untuk menyetujui top-up,
// penarikan, atau pembayaran pesanan. Setiap keputusan uang harus disertai kode
// TOTP yang valid SAAT ITU JUGA, sehingga sesi yang dibajak (cookie dicuri,
// laptop dibiarkan terbuka) tidak otomatis bisa mengkredit saldo.
//
// Tiga lapis yang dijaga di sini:
//  1. Peran — hanya SUPER_ADMIN.
//  2. Pendaftaran — akun tanpa TOTP terkonfirmasi ditolak dengan
//     `requiresTotpSetup`, bukan diloloskan diam-diam. Tanpa langkah ini,
//     admin baru bisa memverifikasi uang selamanya tanpa 2FA.
//  3. Anti-replay — satu kode hanya boleh dipakai sekali. Klaim dilakukan
//     dengan updateMany bersyarat, jadi dua permintaan paralel dengan kode yang
//     sama tidak bisa dua-duanya lolos.

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import {
  TOTP_WINDOW_STEPS,
  decryptTotpSecret,
  findTotpMatch,
  getTotpEncryptionKey,
} from "@/lib/totp"

export type TotpAccountSnapshot = {
  role: string | null | undefined
  totpEnabledAt: Date | null
  totpSecret: string | null
  totpLastUsedAt: Date | null
}

export type MoneyAccessDecision =
  | { kind: "allow"; stepStartedAt: Date }
  | { kind: "forbidden" }
  | { kind: "setup-required" }
  | { kind: "code-missing" }
  | { kind: "invalid-code" }
  | { kind: "code-already-used" }
  | { kind: "misconfigured"; reason: string }

/**
 * Keputusan murni (tanpa database) agar bisa diuji langsung: diberikan
 * snapshot akun, kode yang dikirim, kunci enkripsi, dan waktu sekarang.
 */
export function decideMoneyAccess(params: {
  account: TotpAccountSnapshot
  submittedCode: unknown
  encryptionKey: Buffer
  at?: Date
  windowSteps?: number
}): MoneyAccessDecision {
  const { account, submittedCode, encryptionKey } = params
  const at = params.at ?? new Date()

  if (account.role !== "SUPER_ADMIN") return { kind: "forbidden" }
  if (!account.totpEnabledAt || !account.totpSecret) {
    return { kind: "setup-required" }
  }
  if (typeof submittedCode !== "string" || submittedCode.trim().length === 0) {
    return { kind: "code-missing" }
  }

  let base32Secret: string
  try {
    base32Secret = decryptTotpSecret(account.totpSecret, encryptionKey)
  } catch (error) {
    // Secret rusak/kunci AUTH_SECRET berubah. Jangan pernah gagal-terbuka:
    // lebih baik keputusan uang berhenti sampai operator memperbaikinya.
    return {
      kind: "misconfigured",
      reason: error instanceof Error ? error.message : "Secret TOTP tidak terbaca",
    }
  }

  const match = findTotpMatch(base32Secret, submittedCode, at, {
    windowSteps: params.windowSteps ?? TOTP_WINDOW_STEPS,
  })
  if (!match) return { kind: "invalid-code" }

  if (
    account.totpLastUsedAt &&
    account.totpLastUsedAt.getTime() >= match.stepStartedAt.getTime()
  ) {
    return { kind: "code-already-used" }
  }

  return { kind: "allow", stepStartedAt: match.stepStartedAt }
}

/**
 * Tandai langkah waktu sebagai terpakai. `count === 0` berarti admin lain (atau
 * permintaan paralel) sudah memakai kode yang sama lebih dulu.
 */
export async function claimTotpStep(
  userId: string,
  stepStartedAt: Date
): Promise<boolean> {
  const claimed = await prisma.user.updateMany({
    where: {
      id: prismaId(userId),
      OR: [
        { totpLastUsedAt: null },
        { totpLastUsedAt: { lt: stepStartedAt } },
      ],
    },
    data: { totpLastUsedAt: stepStartedAt },
  })
  return claimed.count > 0
}

export function moneyAccessResponse(
  decision: Exclude<MoneyAccessDecision, { kind: "allow" }>
): NextResponse {
  switch (decision.kind) {
    case "forbidden":
      return NextResponse.json(
        { error: "Hanya SUPER_ADMIN yang dapat memutuskan perpindahan uang" },
        { status: 403 }
      )
    case "setup-required":
      return NextResponse.json(
        {
          error:
            "Aktifkan 2FA (TOTP) terlebih dahulu sebelum memverifikasi uang.",
          code: "totp_setup_required",
          requiresTotpSetup: true,
        },
        { status: 403 }
      )
    case "code-missing":
      return NextResponse.json(
        { error: "Kode 2FA wajib diisi", code: "totp_required" },
        { status: 400 }
      )
    case "invalid-code":
      return NextResponse.json(
        { error: "Kode 2FA salah atau sudah kedaluwarsa", code: "totp_invalid" },
        { status: 401 }
      )
    case "code-already-used":
      return NextResponse.json(
        {
          error: "Kode 2FA ini sudah dipakai. Tunggu kode berikutnya.",
          code: "totp_replayed",
        },
        { status: 401 }
      )
    case "misconfigured":
      return NextResponse.json(
        { error: "2FA sedang tidak dapat diverifikasi. Hubungi operator." },
        { status: 500 }
      )
  }
}

/**
 * Gabungan baca-akun → putuskan → klaim. Mengembalikan `null` bila aksi boleh
 * lanjut, atau NextResponse siap kirim bila ditolak.
 */
export async function requireMoneyAccess(
  userId: string,
  submittedCode: unknown
): Promise<NextResponse | null> {
  const account = await prisma.user.findUnique({
    where: { id: prismaId(userId) },
    select: {
      role: true,
      totpEnabledAt: true,
      totpSecret: true,
      totpLastUsedAt: true,
    },
  })

  if (!account) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
  }

  let encryptionKey: Buffer
  try {
    encryptionKey = getTotpEncryptionKey()
  } catch (error) {
    console.error("[totp-guard] kunci enkripsi tidak tersedia:", error)
    return moneyAccessResponse({
      kind: "misconfigured",
      reason: error instanceof Error ? error.message : "Kunci tidak tersedia",
    })
  }

  const decision = decideMoneyAccess({
    account,
    submittedCode,
    encryptionKey,
  })
  if (decision.kind !== "allow") {
    return moneyAccessResponse(decision)
  }

  const claimed = await claimTotpStep(userId, decision.stepStartedAt)
  if (!claimed) {
    return moneyAccessResponse({ kind: "code-already-used" })
  }
  return null
}
