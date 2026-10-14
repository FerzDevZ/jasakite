/**
 * Backfill kolom User.city dari User.location.
 *
 *   node prisma/backfill-city.js            # terapkan
 *   node prisma/backfill-city.js --dry-run  # lihat rencana tanpa menulis
 *
 * Idempoten: menjalankan berulang kali menghasilkan keadaan yang sama.
 *
 * Logika parsing sengaja MENCERMINKAN lib/location.ts. Ini file .js polos yang
 * dijalankan lewat node tanpa build step, jadi tidak bisa mengimpor modul TS
 * langsung; tests/location.test.ts adalah kontrak yang menjaga keduanya tetap
 * sinkron. Kalau aturan parsing berubah, ubah di dua tempat itu.
 */

const { PrismaClient } = require("@prisma/client")

const STREET_PREFIX = /^(jl\.?|jalan|gg\.?|gang|no\.?|rt|rw|blok)\b/i

/** Ambil nama kota dari alamat: segmen setelah koma terakhir. */
function cityFromLocation(location) {
  if (!location) return null

  const segments = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (segments.length === 0) return null

  const city = segments[segments.length - 1].trim()
  if (STREET_PREFIX.test(city)) return null

  return city.trim()
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const prisma = new PrismaClient()

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, location: true, city: true },
    })

    const updates = []
    let unresolved = 0

    for (const user of users) {
      const parsed = cityFromLocation(user.location)
      // Disimpan lowercase: pencocokan filter jadi konsisten tanpa bergantung
      // pada `mode: "insensitive"` yang tak didukung SQLite.
      const next = parsed ? parsed.trim().toLowerCase() : null

      if (user.location && !parsed) unresolved++
      if (user.city !== next) updates.push({ id: user.id, city: next, from: user.location })
    }

    console.log(`Total user           : ${users.length}`)
    console.log(`Perlu diperbarui     : ${updates.length}`)
    console.log(`Alamat tanpa kota    : ${unresolved}`)

    const cities = new Set(
      users
        .map((u) => cityFromLocation(u.location))
        .filter(Boolean)
        .map((c) => c.trim().toLowerCase())
    )
    console.log(`Kota unik terdeteksi : ${cities.size} — ${[...cities].sort().join(", ")}`)

    if (updates.length > 0) {
      console.log("\nContoh pemetaan:")
      for (const u of updates.slice(0, 5)) {
        console.log(`  ${JSON.stringify(u.from)} -> ${JSON.stringify(u.city)}`)
      }
    }

    if (dryRun) {
      console.log("\n[dry-run] Tidak ada yang ditulis.")
      return
    }

    // Transaksi: kalau satu update gagal, tidak ada yang setengah jalan.
    await prisma.$transaction(
      updates.map((u) =>
        prisma.user.update({ where: { id: u.id }, data: { city: u.city } })
      )
    )

    console.log(`\nSelesai — ${updates.length} baris diperbarui.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error("Backfill gagal:", error.message)
  process.exit(1)
})
