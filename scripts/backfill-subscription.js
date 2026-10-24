#!/usr/bin/env node
/**
 * Backfill langganan untuk penyedia lama.
 *
 * Sebelum fitur langganan ada, penyedia tayang tanpa masa aktif
 * (`User.subscriptionUntil` null). Setelah aturan baru berlaku, null berarti
 * "tidak tayang" — sehingga katalog yang tadinya berisi akan tampak kosong
 * walau datanya utuh.
 *
 * Skrip ini memberi satu periode GRATIS 30 hari (source ADMIN_GRANT, amount 0)
 * kepada penyedia yang punya minimal satu jasa ACTIVE dan belum punya tanggal
 * langganan. Tidak ada saldo yang dipotong dan tidak ada notifikasi yang
 * dikirim — ini operasi data, bukan penagihan.
 *
 * Idempoten: penyedia yang sudah punya `subscriptionUntil` dilewati, jadi
 * aman dijalankan dua kali.
 *
 * Pemakaian:
 *   node scripts/backfill-subscription.js --db=<nama-database> --yes
 */
const fs = require("fs")
const { PrismaClient } = require("@prisma/client")

const PERIOD_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (!fs.existsSync(".env")) return ""
  const line = fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .find((entry) => entry.startsWith("DATABASE_URL="))
  return line ? line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "") : ""
}

function databaseNameFromUrl(url) {
  const withoutQuery = url.split("?")[0]
  return withoutQuery.slice(withoutQuery.lastIndexOf("/") + 1)
}

async function main() {
  const confirmed = process.argv.includes("--yes")
  const dbArg = process.argv.find((arg) => arg.startsWith("--db="))
  const expectedDb = dbArg ? dbArg.slice("--db=".length) : ""
  const url = readDatabaseUrl()

  if (!url || !expectedDb) {
    console.error(
      "Pemakaian: node scripts/backfill-subscription.js --db=<nama-database> --yes"
    )
    process.exit(1)
  }

  const actualDb = databaseNameFromUrl(url)
  if (actualDb !== expectedDb) {
    console.error(
      `Database pada DATABASE_URL adalah "${actualDb}", bukan "${expectedDb}". Dibatalkan.`
    )
    process.exit(1)
  }

  console.log(`Target database: ${actualDb}`)
  if (!confirmed) {
    console.log("Tidak ada perubahan. Jalankan ulang dengan --yes untuk menulis.")
    return
  }

  const prisma = new PrismaClient()
  try {
    const providers = await prisma.user.findMany({
      where: {
        role: "PROVIDER",
        // MongoDB: `subscriptionUntil: null` HANYA cocok dengan dokumen yang
        // benar-benar menyimpan null. Dokumen lama tidak punya field ini sama
        // sekali (db push menambah kolom tanpa menulis ke baris lama), jadi
        // `isSet: false` wajib disertakan — tanpa itu skrip melaporkan "tidak
        // ada yang perlu di-backfill" padahal katalog penuh jasa.
        OR: [
          { subscriptionUntil: null },
          { subscriptionUntil: { isSet: false } },
        ],
        services: { some: { status: "ACTIVE" } },
      },
      select: { id: true, name: true, email: true },
    })

    if (providers.length === 0) {
      console.log("Tidak ada penyedia yang perlu di-backfill.")
      return
    }

    const now = new Date()
    const periodEnd = new Date(now.getTime() + PERIOD_DAYS * DAY_MS)

    for (const provider of providers) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: provider.id },
          data: { subscriptionUntil: periodEnd },
        }),
        prisma.providerSubscription.create({
          data: {
            providerId: provider.id,
            amount: 0,
            periodStart: now,
            periodEnd,
            status: "ACTIVE",
            source: "ADMIN_GRANT",
          },
        }),
      ])
      console.log(
        `  ✓ ${provider.name ?? provider.email} — aktif sampai ${periodEnd.toISOString().slice(0, 10)}`
      )
    }

    console.log(`Selesai: ${providers.length} penyedia diberi masa aktif 30 hari.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error("Backfill gagal:", error)
  process.exit(1)
})
