import prisma from "@/lib/prisma"

/**
 * Nomor pesanan yang bisa dibacakan manusia.
 *
 * Sebelumnya pesanan hanya dikenali lewat ObjectId Mongo — 24 karakter heksa
 * yang mustahil dibacakan lewat telepon, diingat pelanggan, atau ditulis di
 * catatan. Aplikasi marketplace selalu punya nomor pendek untuk ini.
 *
 * Alfabet sengaja membuang karakter yang mudah tertukar saat dibaca ulang:
 * 0/O, 1/I/L/5/S — termasuk "5" dan "S" yang berpalingan di telepon
 * ("lima"/"es"). Panjang 5 karakter memberi 29^5 ≈ 20 juta kombinasi —
 * cukup untuk skala provinsi, dan tetap pendek untuk dibacakan.
 *
 * Keunikannya diperiksa ke database, bukan dijamin indeks unik: MongoDB
 * menganggap `null` sebagai nilai biasa, sehingga indeks unik atas kolom yang
 * masih kosong di pesanan lama langsung gagal dibangun (E11000 dup key null).
 * Lihat catatan di prisma/schema.prisma.
 */
const ALPHABET = "2346789ABCDEFGHJKMNPQRTUVWXYZ"
const CODE_LENGTH = 5
const PREFIX = "JK"

function randomCode(): string {
  let out = ""
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `${PREFIX}-${out}`
}

/**
 * Hasilkan kode yang belum dipakai. Bila lima percobaan acak bertabrakan
 * (praktis tidak mungkin pada skala ini, tetapi tetap harus benar), jatuh ke
 * kode berbasis waktu yang panjangnya masih wajar dibaca.
 */
export async function generateOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = randomCode()
    const existing = await prisma.order.findFirst({
      where: { code: candidate },
      select: { id: true },
    })
    if (!existing) return candidate
  }
  return `${PREFIX}-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

/** Bentuk kode yang sah — dipakai validasi pencarian pesanan berdasarkan kode. */
export function isOrderCode(value: string): boolean {
  return /^JK-[A-Z0-9]{4,8}$/.test(value.trim().toUpperCase())
}
