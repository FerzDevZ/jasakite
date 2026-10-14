/**
 * Normalisasi lokasi penyedia jasa.
 *
 * Kolom `User.location` di database bercampur dua bentuk: nama daerah polos
 * ("Pangkal Pinang") dan alamat lengkap ("Jl. Depati Amir No.5, Pangkal
 * Pinang"). Menghitung daerah unik dengan `new Set(locations)` mentah membuat
 * satu kabupaten/kota terhitung berkali-kali hanya karena penulisan alamatnya
 * berbeda, sehingga jumlah daerah di landing page lebih besar dari 7 yang
 * benar-benar dilayani.
 *
 * Aturan: ambil segmen setelah koma TERAKHIR sebagai nama daerah, karena
 * format alamat Indonesia menaruh kota/kabupaten di akhir
 * ("Jl. X No.1, Kelurahan, Pangkal Pinang").
 *
 * Catatan cakupan: seed menaruh nama KABUPATEN di segmen terakhir (mis.
 * "Sungailiat, Kabupaten Bangka") — bukan nama ibu kotanya — supaya nilai ini
 * sama persis dengan daftar di lib/provinces.ts yang dipakai filter katalog.
 */
export function cityFromLocation(location: string | null | undefined): string | null {
  if (!location) return null

  const segments = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (segments.length === 0) return null

  const city = segments[segments.length - 1].trim()

  // Segmen yang masih berupa penggal jalan bukan nama daerah. Kalau seluruh
  // string hanya alamat tanpa kota, lebih baik null daripada mencemari hitungan.
  if (/^(jl\.?|jalan|gg\.?|gang|no\.?|rt|rw|blok)\b/i.test(city)) return null

  return city.trim()
}

/** Jumlah kota unik dari daftar lokasi mentah, case-insensitive & trim. */
export function countUniqueCities(
  locations: (string | null | undefined)[]
): number {
  const cities = new Set<string>()

  for (const location of locations) {
    const city = cityFromLocation(location)
    if (city) cities.add(city.trim().toLowerCase())
  }

  return cities.size
}
