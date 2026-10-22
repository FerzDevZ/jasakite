#!/usr/bin/env node
/**
 * Promosikan satu akun menjadi SUPER_ADMIN.
 *
 * Peran ini adalah satu-satunya yang boleh memverifikasi uang (top-up,
 * penarikan, pembayaran pesanan). Karena itu skrip ini sengaja cerewet:
 * mencetak nama database yang menjadi target dan meminta `--yes` eksplisit,
 * supaya tidak ada promosi tak sengaja ke database yang salah — kesalahan yang
 * pernah terjadi pada operasi data lain di proyek ini.
 *
 * Pemakaian:
 *   node scripts/promote-super-admin.js admin@jasakite.id --db=jasakite --yes
 *
 * `--db` WAJIB dan harus sama dengan nama database pada DATABASE_URL. Tanpa
 * pengaman ini, `.env` lokal yang menunjuk database dev bisa dipromosikan
 * tanpa disadari — kelas kesalahan yang sudah pernah terjadi di proyek ini.
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
      "Pemakaian: node scripts/promote-super-admin.js <email> --db=<nama-database> --yes"
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
    console.error("Tambahkan --yes untuk benar-benar mengubah peran.")
    process.exit(2)
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } })
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    })
    if (!user) {
      console.error(`Akun ${email} tidak ditemukan di database ${databaseName}.`)
      process.exit(1)
    }
    if (user.role === "SUPER_ADMIN") {
      console.log(`Sudah SUPER_ADMIN: ${user.email} (${databaseName}).`)
      return
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "SUPER_ADMIN" },
    })
    console.log(
      `Promosi selesai: ${user.email} ${user.role} → SUPER_ADMIN (database ${databaseName}).`
    )
    console.log(
      "Akun harus keluar lalu masuk lagi agar JWT membawa peran baru."
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
