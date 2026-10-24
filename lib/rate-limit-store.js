const crypto = require("node:crypto")

/**
 * Penyimpanan rate limit GLOBAL di MongoDB.
 *
 * Kenapa bukan `Map` di memori: state per proses berarti kuota efektif di
 * deployment multi-instance = limit × jumlah instance. Login dan endpoint tulis
 * karena itu bisa dicoba berkali-kali lipat hanya dengan mengenai lambda yang
 * berbeda — batas yang ditampilkan ke pengguna bukan batas yang berlaku.
 *
 * Kenapa `findAndModify` mentah, bukan `prisma.rateLimitBucket.upsert`:
 * upsert Prisma di MongoDB dijalankan sebagai transaksi, dan 50 permintaan
 * bersamaan gagal dengan "write conflict or a deadlock" (terukur). Perintah
 * `findAndModify` dengan `$inc` + `upsert` adalah satu operasi atomik: 50
 * permintaan bersamaan menghasilkan count 50 dengan 50 nilai balik unik 1..50.
 *
 * Berkas ini sengaja JavaScript biasa (bukan TypeScript) supaya bisa dijalankan
 * `node` langsung oleh skrip uji dua-proses, tanpa build step.
 */

const COLLECTION_NAME = "rateLimitBuckets"

/** Identitas disimpan sebagai hash: email/IP tidak perlu tersimpan mentah. */
function bucketId(scope, identifier, windowStart) {
  const digest = crypto
    .createHash("sha256")
    .update(`${scope}|${identifier}`)
    .digest("hex")
    .slice(0, 32)
  return `${scope}:${digest}:${windowStart}`
}

function windowBounds(nowMs, windowMs) {
  const windowStart = Math.floor(nowMs / windowMs) * windowMs
  return { windowStart, resetAt: windowStart + windowMs }
}

let ttlIndexState = "belum"

/**
 * TTL index sekali per proses, best-effort.
 *
 * Tanpa ini dokumen lama menumpuk selamanya: satu dokumen per jendela waktu per
 * kunci. Mongo menghapusnya sendiri lewat `expiresAt`, jadi tidak ada jalur
 * panas yang perlu membersihkan.
 */
async function ensureTtlIndex(prismaClient) {
  if (ttlIndexState === "siap" || ttlIndexState === "gagal") return
  ttlIndexState = "siap"
  try {
    await prismaClient.$runCommandRaw({
      createIndexes: COLLECTION_NAME,
      indexes: [
        {
          key: { expiresAt: 1 },
          name: "expiresAt_ttl",
          expireAfterSeconds: 0,
        },
      ],
    })
  } catch (error) {
    // Koleksi belum ada pada permintaan pertama, atau user DB tanpa izin
    // createIndex. Bukan alasan untuk menolak permintaan pengguna.
    ttlIndexState = "gagal"
    console.warn(`[rate-limit] TTL index tidak dibuat: ${error.message}`)
  }
}

function toResult(count, limit, windowMs, nowMs) {
  const { resetAt } = windowBounds(nowMs, windowMs)
  return {
    count,
    limit,
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt,
    retryAfterSeconds:
      count <= limit ? 0 : Math.max(1, Math.ceil((resetAt - nowMs) / 1000)),
  }
}

/**
 * Tambah satu hitungan dan kembalikan keadaan jendela setelah penambahan.
 * Satu round-trip, atomik di sisi server.
 */
async function hitBucket(
  prismaClient,
  { scope, identifier, limit, windowMs, nowMs = Date.now() }
) {
  const { windowStart, resetAt } = windowBounds(nowMs, windowMs)
  const id = bucketId(scope, identifier, windowStart)
  await ensureTtlIndex(prismaClient)

  const response = await prismaClient.$runCommandRaw({
    findAndModify: COLLECTION_NAME,
    query: { _id: id },
    update: {
      $inc: { count: 1 },
      $setOnInsert: {
        windowStart: { $date: new Date(windowStart).toISOString() },
        expiresAt: { $date: new Date(resetAt).toISOString() },
      },
    },
    upsert: true,
    new: true,
  })

  const count = response.value ? response.value.count : 1
  return toResult(count, limit, windowMs, nowMs)
}

/**
 * Baca hitungan jendela berjalan TANPA menambah.
 *
 * Dipakai login: yang dihitung hanya percobaan GAGAL, jadi pemeriksaan sebelum
 * mencoba tidak boleh ikut menambah kuota — kalau tidak, pengguna yang berhasil
 * masuk berkali-kali akan terkunci.
 */
async function readBucket(
  prismaClient,
  { scope, identifier, limit, windowMs, nowMs = Date.now() }
) {
  const { windowStart } = windowBounds(nowMs, windowMs)
  const record = await prismaClient.rateLimitBucket.findUnique({
    where: { id: bucketId(scope, identifier, windowStart) },
    select: { count: true },
  })
  return toResult(record ? record.count : 0, limit, windowMs, nowMs)
}

/**
 * Kosongkan hitungan jendela berjalan untuk satu identitas.
 *
 * Dipakai setelah login berhasil: percobaan gagal sebelumnya tidak lagi
 * menahan pengguna yang akhirnya tahu kata sandinya.
 */
async function resetBucket(
  prismaClient,
  { scope, identifier, windowMs, nowMs = Date.now() }
) {
  const { windowStart } = windowBounds(nowMs, windowMs)
  await prismaClient.rateLimitBucket.deleteMany({
    where: { id: bucketId(scope, identifier, windowStart) },
  })
}

/** Hapus semua dokumen milik satu scope — hanya untuk pengujian. */
async function clearBuckets(prismaClient, scope) {
  await prismaClient.rateLimitBucket.deleteMany({
    where: { id: { startsWith: `${scope}:` } },
  })
}

module.exports = {
  bucketId,
  windowBounds,
  ensureTtlIndex,
  hitBucket,
  readBucket,
  resetBucket,
  clearBuckets,
  COLLECTION_NAME,
}
