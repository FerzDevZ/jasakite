/**
 * Teks contoh di kolom pencarian beranda.
 *
 * Dulu tulisannya hardcode dengan nama layanan yang sudah tidak ada di
 * database — teks promosi yang menjanjikan sesuatu yang tidak bisa dicari.
 * Contohnya sekarang diturunkan dari kategori yang benar-benar dikirim
 * halaman, jadi tidak bisa basi.
 *
 * Fungsi murni supaya bisa diuji tanpa merender komponen klien.
 */
export const GENERIC_SEARCH_PLACEHOLDER =
  "Cari jasa, layanan, atau penyedia di sekitarmu…"

const MAX_EXAMPLES = 3

export function searchPlaceholder(categoryNames: readonly string[]): string {
  const names = categoryNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, MAX_EXAMPLES)

  // Satu contoh tidak cukup untuk menunjukkan bahwa pencarian menerima
  // beberapa kata kunci sekaligus; lebih baik kalimat umum daripada terbaca
  // seperti satu kategori yang direkomendasikan.
  if (names.length < 2) return GENERIC_SEARCH_PLACEHOLDER

  return `Cari: ${names.join(", ")}…`
}
