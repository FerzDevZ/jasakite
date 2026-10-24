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
//
// ── Jendela kepercayaan 15 menit ("mode sudo") ─────────────────────────────
// Satu kode yang sah membuka jendela 15 menit PER PERANGKAT: di dalamnya,
// keputusan uang berikutnya tidak minta kode lagi. Pola yang sama dipakai
// GitHub ("confirm access"). Poin rancangannya:
//  - Token jendela adalah cookie HttpOnly bertanda tangan HMAC (kunci turunan
//    AUTH_SECRET, label terpisah dari kunci enkripsi TOTP) yang memuat
//    userId + kedaluwarsa — tidak bisa dipalsukan, tidak pindah antar akun,
//    dan otomatis mati sendiri.
//  - Jendela HANYA melompati kode; peran SUPER_ADMIN dan status 2FA aktif
//    tetap dicek pada setiap keputusan (admin yang diturunkan perannya, atau
//    yang merotasi 2FA, tetap ditolak meski cookie-nya masih hidup).

import { createHash, createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import {
  TOTP_WINDOW_STEPS,
  decryptTotpSecret,
  findTotpMatch,
  getTotpEncryptionKey,
} from "@/lib/totp"

export const MONEY_TRUST_WINDOW_MS = 15 * 60 * 1000
const MONEY_TRUST_COOKIE = "jasakite-uang-trust"

/** Kunci HMAC jendela kepercayaan — label sendiri agar tidak sama dengan kunci enkripsi TOTP. */
export function getMoneyTrustKey(): Buffer {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""
  if (secret.length < 16) {
    throw new Error("AUTH_SECRET minimal 16 karakter untuk kunci kepercayaan uang")
  }
  return createHash("sha256").update(`money-trust:v1:${secret}`).digest()
}

/** Buat token jendela: `userId.untilEpochMs.hmac` (murni — mudah diuji). */
export function signMoneyTrust(
  userId: string,
  untilEpochMs: number,
  key: Buffer
): string {
  const payload = `${userId}.${untilEpochMs}`
  const mac = createHmac("sha256", key).update(payload).digest("base64url")
  return `${payload}.${mac}`
}

/**
 * Baca token jendela untuk `userId`. Mengembalikan tanggal kedaluwarsa bila
 * tanda tangan cocok, pemilik cocok, dan belum lewat — selain itu null.
 * (Murni — mudah diuji.)
 */
export function parseMoneyTrust(
  token: string,
  key: Buffer,
  userId: string,
  at: Date
): Date | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [tokenUserId, untilRaw, mac] = parts
  const expected = createHmac("sha256", key)
    .update(`${tokenUserId}.${untilRaw}`)
    .digest("base64url")
  const macBuf = Buffer.from(mac)
  const expectedBuf = Buffer.from(expected)
  if (macBuf.length !== expectedBuf.length || !timingSafeEqual(macBuf, expectedBuf)) {
    return null
  }
  if (tokenUserId !== userId) return null
  const untilEpochMs = Number(untilRaw)
  if (!Number.isFinite(untilEpochMs)) return null
  const until = new Date(untilEpochMs)
  if (at.getTime() >= until.getTime()) return null
  return until
}

async function readMoneyTrustUntil(userId: string): Promise<Date | null> {
  try {
    const jar = await cookies()
    const token = jar.get(MONEY_TRUST_COOKIE)?.value
    if (!token) return null
    return parseMoneyTrust(token, getMoneyTrustKey(), userId, new Date())
  } catch {
    // Di luar konteks request (mis. pengujian unit) tidak ada cookie — anggap
    // tidak ada jendela kepercayaan; jalan kode penuh tetap tersedia.
    return null
  }
}

async function writeMoneyTrust(userId: string): Promise<void> {
  try {
    const jar = await cookies()
    jar.set(MONEY_TRUST_COOKIE, signMoneyTrust(userId, Date.now() + MONEY_TRUST_WINDOW_MS, getMoneyTrustKey()), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(MONEY_TRUST_WINDOW_MS / 1000),
    })
  } catch {
    // Gagal menulis cookie ≠ gagal keputusan: verifikasi kodenya sudah sah.
  }
}

/** Untuk GET antrean: sampai kapan perangkat ini tepercaya (null = harus kode). */
export async function getMoneyTrustUntil(userId: string): Promise<Date | null> {
  return readMoneyTrustUntil(userId)
}

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
 *
 * Jendela kepercayaan dicek SETELAH akun dibaca tapi SEBELUM kode disyaratkan:
 * peran dan status 2FA tetap divalidasi setiap kali (lewat decideMoneyAccess
 * dengan kode kosong — cabang `code-missing` hanya tercapai bila kedua lapis
 * awal lolos), lalu cookie jendela melompati kebutuhan kode.
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

  // Lapis peran + pendaftaran tetap berjalan untuk setiap keputusan; sonde
  // dengan kode kosong hanya bisa menghasilkan forbidden / setup-required /
  // misconfigured / code-missing (kode kosong tak pernah sampai validasi kode,
  // sehingga cabang allow tidak mungkin — TypeScript tetap perlu disempitkan).
  const precheck = decideMoneyAccess({ account, submittedCode: "", encryptionKey })
  if (
    precheck.kind === "forbidden" ||
    precheck.kind === "setup-required" ||
    precheck.kind === "misconfigured"
  ) {
    return moneyAccessResponse(precheck)
  }

  const trustUntil = await readMoneyTrustUntil(userId)
  if (trustUntil) return null

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

  await writeMoneyTrust(userId)
  return null
}
