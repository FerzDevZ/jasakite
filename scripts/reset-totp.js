#!/usr/bin/env node
/**
 * Hapus pendaftaran 2FA (TOTP) satu akun SUPER_ADMIN.
 *
 * Jalur pemulihan bila perangkat authenticator hilang atau kode terus ditolak
 * karena jam perangkat melenceng. Tanpa skrip ini, akun terkunci dari semua
 * keputusan uang dan satu-satunya jalan adalah mengedit database langsung.
 *
 * Efeknya sengaja TERBATAS: 2FA dimatikan, tetapi keputusan uang TETAP ditolak
 * server (`requireMoneyAccess` → `requiresTotpSetup`) sampai admin mendaftarkan
 * authenticator baru. Jadi skrip ini tidak bisa dipakai untuk "melewati" 2FA
 * saat memverifikasi uang.
 *
 * Pemakaian:
 *   node scripts/reset-totp.js admin@jasakite.id --db=jasakite --yes
 *
 * `--db` WAJIB sama dengan nama database pada DATABASE_URL — pengaman yang sama
 * dengan scripts/promote-super-admin.js, karena kesalahan target database sudah
 * pernah terjadi di proyek ini.
 */
const fs = require("fs")
const { PrismaClient } = require("@prisma/client")

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (!fs.existsSync(".env")) return ""
  const line = fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .find((entry) => entry.startsWith("DATABASE_URL="))
  return line ? line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "") : ""
}

async function main() {
  const email = String(process.argv[2] ?? "").toLowerCase().trim()
  const confirmed = process.argv.includes("--yes")
  const expectedDbArg = process.argv.find((arg) => arg.startsWith("--db="))
  const expectedDb = expectedDbArg ? expectedDbArg.slice("--db=".length) : ""

  if (!email || !expectedDb) {
    console.error(
      "Pemakaian: node scripts/reset-totp.js <email> --db=<nama-database> --yes"
    )
    process.exit(1)
  }

  const url = readDatabaseUrl()
  if (!url) {
    console.error("DATABASE_URL tidak ditemukan (env atau .env).")
    process.exit(1)
  }

  let databaseName = "(tidak terbaca)"
  try {
    databaseName = new URL(url).pathname.replace(/^\//, "") || "(default)"
  } catch {
    console.error("DATABASE_URL bukan URL yang sah.")
    process.exit(1)
  }

  console.log(`Target database: ${databaseName}`)
  if (expectedDb !== databaseName) {
    console.error(
      `Ditolak: --db=${expectedDb} tidak sama dengan database pada DATABASE_URL (${databaseName}).`
    )
    process.exit(3)
  }
  if (!confirmed) {
    console.error("Tambahkan --yes untuk benar-benar menghapus pendaftaran 2FA.")
    process.exit(2)
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        totpSecret: true,
        totpEnabledAt: true,
      },
    })
    if (!user) {
      console.error(`Akun ${email} tidak ditemukan di database ${databaseName}.`)
      process.exit(1)
    }
    if (user.role !== "SUPER_ADMIN") {
      console.error(
        `Ditolak: ${user.email} berperan ${user.role}, bukan SUPER_ADMIN. 2FA hanya dipakai peran itu.`
      )
      process.exit(4)
    }
    if (!user.totpSecret && !user.totpEnabledAt) {
      console.log(`Tidak ada pendaftaran 2FA pada ${user.email} (${databaseName}).`)
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, totpLastUsedAt: null },
    })

    console.log(`2FA dihapus: ${user.email} (database ${databaseName}).`)
    console.log(
      "Akun bisa masuk lagi tanpa kode, TETAPI semua keputusan uang tetap ditolak sampai authenticator baru didaftarkan di /dashboard/admin/keamanan."
    )
    console.log(
      "Segera ganti password akun ini jika perangkat hilang dicurigai dikuasai orang lain."
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
