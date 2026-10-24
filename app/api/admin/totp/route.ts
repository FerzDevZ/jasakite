import { NextResponse } from "next/server"
import { z } from "zod"
import QRCode from "qrcode"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isSuperAdminRole } from "@/lib/roles"
import {
  TOTP_WINDOW_STEPS,
  buildTotpUri,
  decryptTotpSecret,
  encryptTotpSecret,
  findTotpMatch,
  generateTotpSecret,
  getTotpEncryptionKey,
} from "@/lib/totp"

export const dynamic = "force-dynamic"

// Catatan penempatan: route ini sengaja TIDAK berada di bawah /api/auth.
// Middleware melewati pemeriksaan CSRF untuk seluruh prefix /api/auth (karena
// NextAuth punya mekanismenya sendiri), sehingga endpoint yang mengubah faktor
// autentikasi di sana akan kehilangan perlindungan CSRF.

const startSchema = z.object({
  // Konfirmasi ulang password: sesi yang dibajak saja tidak boleh cukup untuk
  // mendaftarkan authenticator milik penyerang ke akun admin.
  password: z.string().min(1, "Password wajib diisi"),
})

const confirmSchema = z.object({
  code: z
    .string()
    .trim()
    .min(6, "Kode 6 digit wajib diisi")
    .max(7, "Kode 6 digit wajib diisi"),
})

async function loadSuperAdmin(sessionUserId: string) {
  const account = await prisma.user.findUnique({
    where: { id: prismaId(sessionUserId) },
    select: {
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      totpSecret: true,
      totpEnabledAt: true,
    },
  })
  if (!account) return { kind: "not-found" as const }
  if (!isSuperAdminRole(account.role)) return { kind: "forbidden" as const }
  return { kind: "ok" as const, account }
}

/** GET — status 2FA akun yang sedang masuk, untuk halaman keamanan. */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "totp-status",
    RATE_LIMITS.read,
    session.user.id
  )
  if (limited) return limited

  const account = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { role: true, totpSecret: true, totpEnabledAt: true },
  })
  if (!account) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
  }
  if (!isSuperAdminRole(account.role)) {
    return NextResponse.json(
      { error: "2FA hanya tersedia untuk SUPER_ADMIN" },
      { status: 403 }
    )
  }

  return NextResponse.json({
    enabled: Boolean(account.totpEnabledAt),
    // Ada secret tersimpan tetapi belum dikonfirmasi → pendaftaran tertunda.
    pending: Boolean(!account.totpEnabledAt && account.totpSecret),
    enabledAt: account.totpEnabledAt ? account.totpEnabledAt.toISOString() : null,
  })
}

/**
 * POST — mulai pendaftaran: hasilkan secret baru, simpan terenkripsi, dan
 * kembalikan QR + secret untuk dimasukkan ke aplikasi authenticator.
 *
 * `totpEnabledAt` sengaja dikosongkan: sampai PATCH mengonfirmasi satu kode,
 * authenticator baru belum dianggap aktif. Ini juga membuat rotasi perangkat
 * aman — secret lama langsung berhenti berlaku, bukan tetap hidup berdampingan.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "totp-setup",
    RATE_LIMITS.totpSetup,
    session.user.id
  )
  if (limited) return limited

  const loaded = await loadSuperAdmin(session.user.id)
  if (loaded.kind === "not-found") {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
  }
  if (loaded.kind === "forbidden") {
    return NextResponse.json(
      { error: "2FA hanya tersedia untuk SUPER_ADMIN" },
      { status: 403 }
    )
  }

  try {
    const { password } = startSchema.parse(await request.json())
    const { account } = loaded

    if (!account.passwordHash) {
      return NextResponse.json(
        { error: "Akun ini tidak punya password — atur password terlebih dahulu" },
        { status: 400 }
      )
    }
    const passwordMatches = await bcrypt.compare(password, account.passwordHash)
    if (!passwordMatches) {
      return NextResponse.json({ error: "Password salah" }, { status: 401 })
    }

    const base32Secret = generateTotpSecret()
    const encryptionKey = getTotpEncryptionKey()

    await prisma.user.update({
      where: { id: account.id },
      data: {
        totpSecret: encryptTotpSecret(base32Secret, encryptionKey),
        totpEnabledAt: null,
        totpLastUsedAt: null,
      },
    })

    const otpauthUri = buildTotpUri({
      base32Secret,
      accountName: account.email,
    })
    const qrDataUrl = await QRCode.toDataURL(otpauthUri, {
      margin: 1,
      width: 240,
      errorCorrectionLevel: "M",
    })

    return NextResponse.json({ otpauthUri, base32Secret, qrDataUrl })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[admin/totp] POST error:", error)
    return NextResponse.json(
      { error: "2FA tidak dapat dimulai. Periksa konfigurasi server." },
      { status: 500 }
    )
  }
}

/** PATCH — konfirmasi kode dari authenticator dan aktifkan 2FA. */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = await enforceRateLimit(
    request,
    "totp-setup",
    RATE_LIMITS.totpSetup,
    session.user.id
  )
  if (limited) return limited

  const loaded = await loadSuperAdmin(session.user.id)
  if (loaded.kind === "not-found") {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 })
  }
  if (loaded.kind === "forbidden") {
    return NextResponse.json(
      { error: "2FA hanya tersedia untuk SUPER_ADMIN" },
      { status: 403 }
    )
  }

  const { account } = loaded
  if (!account.totpSecret) {
    return NextResponse.json(
      { error: "Belum ada pendaftaran yang menunggu konfirmasi" },
      { status: 409 }
    )
  }

  try {
    const { code } = confirmSchema.parse(await request.json())

    let base32Secret: string
    try {
      base32Secret = decryptTotpSecret(account.totpSecret, getTotpEncryptionKey())
    } catch (error) {
      console.error("[admin/totp] secret tidak dapat didekripsi:", error)
      return NextResponse.json(
        { error: "Secret 2FA tidak terbaca. Hubungi operator." },
        { status: 500 }
      )
    }

    const match = findTotpMatch(base32Secret, code, new Date(), {
      windowSteps: TOTP_WINDOW_STEPS,
    })
    if (!match) {
      return NextResponse.json(
        { error: "Kode tidak cocok. Pastikan jam perangkat akurat." },
        { status: 401 }
      )
    }

    const enabledAt = new Date()
    await prisma.user.update({
      where: { id: account.id },
      data: {
        totpEnabledAt: enabledAt,
        totpLastUsedAt: match.stepStartedAt,
      },
    })

    return NextResponse.json({ ok: true, enabledAt: enabledAt.toISOString() })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[admin/totp] PATCH error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
