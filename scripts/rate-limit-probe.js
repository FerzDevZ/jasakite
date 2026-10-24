/**
 * Probe rate limit global untuk uji DUA PROSES.
 *
 * Alasannya ada: batas per proses tidak bisa dibuktikan dalam satu proses.
 * Skrip ini memakai `lib/rate-limit-store.js` yang SAMA dengan aplikasi, lalu
 * dijalankan dua kali sebagai proses `node` terpisah — satu-satunya keadaan
 * yang mereka bagi adalah database.
 *
 * Pemakaian:
 *   node scripts/rate-limit-probe.js run <scope> <identifier> <limit> <windowMs> <burst>
 *   node scripts/rate-limit-probe.js peek <scope> <identifier> <limit> <windowMs>
 *   node scripts/rate-limit-probe.js reset <scope>
 *
 * Keluarannya satu baris JSON supaya mudah dibaca test.
 */
const { PrismaClient } = require("@prisma/client")
const {
  hitBucket,
  readBucket,
  clearBuckets,
} = require("../lib/rate-limit-store.js")

const prisma = new PrismaClient()

async function main() {
  const [mode, scope, identifier, limitArg, windowArg, burstArg] =
    process.argv.slice(2)

  if (mode === "reset") {
    await clearBuckets(prisma, scope)
    console.log(JSON.stringify({ reset: scope }))
    return
  }

  const limit = Number(limitArg)
  const windowMs = Number(windowArg)

  if (mode === "peek") {
    const result = await readBucket(prisma, { scope, identifier, limit, windowMs })
    console.log(JSON.stringify({ allowed: 0, denied: 0, count: result.count }))
    return
  }

  if (mode === "run") {
    const burst = Number(burstArg)
    let allowed = 0
    let denied = 0
    // Sengaja berurutan: yang diuji adalah pembagian kuota antar-proses, bukan
    // ketahanan satu proses terhadap permintaan paralel.
    for (let attempt = 0; attempt < burst; attempt++) {
      const result = await hitBucket(prisma, { scope, identifier, limit, windowMs })
      if (result.ok) allowed++
      else denied++
    }
    console.log(JSON.stringify({ allowed, denied }))
    return
  }

  throw new Error(`mode tidak dikenal: ${mode}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(`[rate-limit-probe] ${error.message}`)
    await prisma.$disconnect()
    process.exit(1)
  })
