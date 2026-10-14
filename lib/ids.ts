// Helper untuk menangani ID yang bisa Int (SQLite/Postgres) atau String ObjectId (MongoDB)
export function isObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export function toPrismaId(id: string): string | number {
  if (!id) return id as unknown as number
  const trimmed = String(id).trim()
  if (!trimmed) return id as unknown as number
  // Jika 24 hex => Mongo ObjectId, biarkan string
  if (isObjectId(trimmed)) return trimmed
  // Hanya parse jika murni digit (hindari "123abc" -> 123)
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10)
    return Number.isNaN(n) ? trimmed : n
  }
  return trimmed
}

/**
 * ID siap pakai untuk klausa Prisma, aman di kedua skema.
 *
 * Kenapa ada: skema Prisma di repo ini adalah MongoDB (`id String @db.ObjectId`),
 * sedangkan jalur migrasi PostgreSQL/SQLite memakai `id Int`. `toPrismaId()`
 * mengembalikan `string | number` — dan gabungan itu TIDAK bisa langsung
 * ditempatkan di `where`, karena tipe yang dihasilkan Prisma hanya menerima
 * salah satunya. Akibatnya setiap pemanggil menulis cast sendiri:
 * `as unknown as number & string`, 40 kali di 15 berkas, plus sepuluh varian
 * `{ id: string | number } & { id: string }` yang ditulis hanya untuk menutupi
 * hal yang sama.
 *
 * Satu cast tidak menjadi lebih aman karena diulang 40 kali; ia hanya menjadi
 * lebih sulit diaudit. Menyatukannya di sini memberi jembatan dual-skema itu
 * satu tempat yang bisa didokumentasikan, dan membuat `@ts-ignore` di klausa
 * `where`/`data` tidak lagi diperlukan — `number & string` dapat ditugaskan ke
 * field `Int` maupun `String`.
 *
 * Nilai runtime yang dikembalikan identik dengan `toPrismaId()`.
 */
export function prismaId(id: string): number & string {
  return toPrismaId(id) as number & string
}

// Bandingkan dua ID (bisa string atau number) sebagai string.
//
// Dua penjagaan yang disengaja:
// 1. ID yang tidak ada TIDAK PERNAH dianggap sama. Tanpa ini sameId(null, null)
//    bernilai true karena String(null) === "null", dan itu cukup untuk
//    meloloskan cek kepemilikan di route API.
// 2. NaN TIDAK PERNAH dianggap sama. Kalau suatu saat Number(ObjectId) dipakai
//    lagi dan menghasilkan NaN, perbandingan NaN === NaN justru akan lolos
//    dan menyembunyikan bug yang sama persis.
export function sameId(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false
  if (typeof a === "number" && !Number.isFinite(a)) return false
  if (typeof b === "number" && !Number.isFinite(b)) return false
  return String(a) === String(b)
}
