#!/usr/bin/env node
/**
 * Preflight lingkungan sebelum `prisma generate` + `next build`.
 *
 * RIWAYAT (kenapa skrip ini tidak lagi menyalin apa pun):
 * Sebelumnya ia menyalin `prisma/schema.mongo.prisma` menimpa
 * `prisma/schema.prisma` setiap kali `DATABASE_URL` berisi mongo. Karena
 * deployment ini memang selalu mongo, salinan itu yang dipakai build Vercel —
 * dan salinan itu sudah tertinggal: ia tidak lagi memuat model
 * `OgPhotoPreflightSnapshot`, sedangkan `lib/og-photo-preflight-snapshot.ts`
 * memakainya di jalur render kartu OG dan di endpoint admin.
 *
 * Gejalanya tidak muncul sebagai build gagal: build sukses, Prisma Client
 * ter-generate, lalu `prisma.ogPhotoPreflightSnapshot` `undefined` saat
 * dijalankan. Fitur yang hidup di mesin lokal mati di produksi tanpa satu pun
 * peringatan.
 *
 * `prisma/schema.prisma` sudah `provider = "mongodb"` dan itulah schema yang
 * dipakai lokal maupun produksi, jadi tidak ada lagi yang perlu di-switch: satu
 * schema, satu sumber kebenaran. Skrip ini tinggal memeriksa — dan menolak lebih
 * awal, sebelum kesalahan yang sama terulang.
 */
const fs = require('fs')

const KNOWN_MONGO_SCHEMES = ['mongodb://', 'mongodb+srv://']

function readDotEnvDatabaseUrl() {
  if (!fs.existsSync('.env')) return ''
  try {
    const env = fs.readFileSync('.env', 'utf8')
    const match = env.match(/DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}

function stripQuotes(value) {
  return value.replace(/^["']|["']$/g, '').trim()
}

function fail(message) {
  console.error(`[vercel-preflight] ${message}`)
  process.exit(1)
}

const rawUrl = stripQuotes(process.env.DATABASE_URL || readDotEnvDatabaseUrl())

if (!rawUrl) {
  fail(
    'DATABASE_URL kosong. Di Vercel, setel variabel ini untuk Production DAN Preview — build ini membaca database saat prerender (sitemap, kartu OG), jadi nilainya wajib ada di lingkup build, bukan hanya di runtime.'
  )
}

/** Skema URL saja (mis. "file:", "postgresql:") — isi kredensial tidak pernah dicetak. */
const scheme = (rawUrl.match(/^[a-z0-9+.-]+:/i) || ["(tanpa skema)"])[0]

if (rawUrl.startsWith('file:')) {
  fail(
    'DATABASE_URL menunjuk berkas lokal (skema "file:"). prisma/schema.prisma memakai provider = "mongodb", jadi SQLite tidak bisa dipakai lagi — arahkan ke mongod lokal atau cluster Atlas.'
  )
}

if (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://')) {
  fail(
    'DATABASE_URL menunjuk PostgreSQL, sedangkan prisma/schema.prisma memakai provider = "mongodb". Dulu skrip ini menukar provider secara diam-diam; sekarang tidak — provider yang berbeda butuh schema dan migrasinya sendiri, bukan penggantian teks.'
  )
}

if (!KNOWN_MONGO_SCHEMES.some((known) => rawUrl.startsWith(known))) {
  fail(
    `DATABASE_URL tidak dikenali sebagai MongoDB (skema terlihat: "${scheme}"). Skema yang diterima: mongodb:// atau mongodb+srv://.`
  )
}

const isSrv = rawUrl.startsWith('mongodb+srv://')

// Driver MongoDB menolak kombinasi ini; lebih baik gagal di sini daripada di
// tengah build dengan pesan yang menyebut opsi, bukan penyebabnya.
if (isSrv && /[?&]directConnection=true/i.test(rawUrl)) {
  fail(
    'DATABASE_URL memakai mongodb+srv:// bersama directConnection=true. Kombinasi itu tidak valid untuk cluster Atlas — hapus directConnection (opsi itu hanya untuk mongod tunggal, seperti service container CI lokal).'
  )
}

function describeTarget(url) {
  const withoutCredentials = url.replace(/\/\/[^@/]*@/, '//<kredensial>@')
  const [authority, rest = ''] = withoutCredentials
    .replace(/^mongodb(\+srv)?:\/\//, '')
    .split('/')
  const databaseName = rest.split('?')[0] || '(default)'
  return { authority, databaseName }
}

const { authority, databaseName } = describeTarget(rawUrl)

// Ditulis tanpa kredensial: log build Vercel tersimpan dan bisa dibaca lebih
// banyak orang daripada isi .env.
console.log(`[vercel-preflight] Database: ${authority} · basis data: ${databaseName}`)

if (!/[?&]retryWrites=true/i.test(rawUrl)) {
  console.warn(
    '[vercel-preflight] retryWrites=true tidak ada di DATABASE_URL. Pada Atlas, kegagalan tulis transien (failover, pemilihan ulang primary) berakhir sebagai error yang terlihat pengguna kalau retry dimatikan.'
  )
}

if (!/[?&]maxPoolSize=/i.test(rawUrl)) {
  console.warn(
    '[vercel-preflight] maxPoolSize tidak disetel: driver MongoDB memakai 100 koneksi per instance. Di serverless, instance yang menumpuk bisa menghabiskan batas koneksi Atlas — setel mis. maxPoolSize=10 sesuai tier-nya.'
  )
}

console.log('[vercel-preflight] Konfigurasi database tampak sah untuk build MongoDB.')
