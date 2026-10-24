#!/usr/bin/env node
/**
 * Pensiunkan kategori & jasa lama dari katalog.
 *
 * Kategori yang tidak lagi ditawarkan (perbaikan rumah/AC, kebersihan,
 * instalasi listrik, pengecatan, pindahan, tukang) masih tersimpan di database
 * lama dan tetap tampil di beranda karena hero membaca seluruh kategori.
 *
 * Aturan yang dijaga skrip ini:
 *   - Jasa yang SUDAH punya pesanan tidak dihapus, hanya diarsipkan
 *     (status ARCHIVED) supaya riwayat pesanan, ulasan, dan ledger tetap utuh.
 *   - Jasa tanpa pesanan dihapus beserta paket dan simpanannya.
 *   - Kategori baru dihapus setelah tidak ada jasa yang menunjuknya, karena
 *     Prisma menolak menghapus induk yang masih punya anak.
 *
 * Dry-run adalah bawaan; tulis hanya dengan `--yes`.
 *
 * Pemakaian:
 *   node scripts/retire-legacy-catalog.js --db=<nama-database>
 *   node scripts/retire-legacy-catalog.js --db=<nama-database> --yes
 */
const fs = require("fs")
const { PrismaClient } = require("@prisma/client")

/** Slug kategori yang sudah tidak ada di produk. */
const LEGACY_CATEGORY_SLUGS = [
  "perbaikan-rumah",
  "kebersihan",
  "listrik",
  "pengecatan",
  "pindahan",
  "tukang",
]

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
      "Pemakaian: node scripts/retire-legacy-catalog.js --db=<nama-database> [--yes]"
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
  console.log(confirmed ? "Mode: MENULIS" : "Mode: dry-run (tambahkan --yes untuk menulis)")

  const prisma = new PrismaClient()
  const summary = { archived: 0, deletedServices: 0, deletedCategories: 0 }

  try {
    for (const slug of LEGACY_CATEGORY_SLUGS) {
      const category = await prisma.category.findUnique({
        where: { slug },
        select: { id: true, name: true },
      })
      if (!category) continue

      const services = await prisma.service.findMany({
        where: { categoryId: category.id },
        select: { id: true, title: true, _count: { select: { orders: true } } },
      })

      for (const service of services) {
        const hasOrders = service._count.orders > 0
        if (hasOrders) {
          summary.archived += 1
          console.log(`  arsip  ${category.name} · ${service.title} (${service._count.orders} pesanan)`)
          if (confirmed) {
            await prisma.service.update({
              where: { id: service.id },
              data: { status: "ARCHIVED" },
            })
          }
        } else {
          summary.deletedServices += 1
          console.log(`  hapus  ${category.name} · ${service.title}`)
          if (confirmed) {
            await prisma.savedService.deleteMany({ where: { serviceId: service.id } })
            await prisma.servicePackage.deleteMany({ where: { serviceId: service.id } })
            await prisma.service.delete({ where: { id: service.id } })
          }
        }
      }

      const remaining = await prisma.service.count({
        where: { categoryId: category.id },
      })
      if (remaining === 0) {
        summary.deletedCategories += 1
        console.log(`  hapus  kategori ${category.name}`)
        if (confirmed) {
          await prisma.category.delete({ where: { id: category.id } })
        }
      } else {
        console.log(`  tahan  kategori ${category.name}: masih ada ${remaining} jasa berarsip`)
      }
    }

    console.log("")
    console.log(
      `${summary.archived} jasa diarsipkan · ${summary.deletedServices} jasa dihapus · ${summary.deletedCategories} kategori dihapus`
    )
    if (!confirmed) console.log("Tidak ada perubahan tulis. Jalankan ulang dengan --yes.")
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error("Gagal: ", error)
  process.exit(1)
})
