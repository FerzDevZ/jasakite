/**
 * Geolokasi tingkat kabupaten/kota di Kepulauan Bangka Belitung.
 *
 * Database hanya menyimpan `User.city` berupa teks; TIDAK ada koordinat
 * penyedia, sehingga jarak user→tukang tidak mungkin dihitung. Yang bisa
 * dihitung dengan benar adalah jarak user→pusat kabupaten/kota, lalu daerah
 * itu dipakai sebagai filter katalog. UI HARUS melabeli hasilnya sebagai
 * "daerah terdekat", bukan "jasa terdekat 2 km" — itu akan berbohong.
 *
 * Titik daerah TIDAK ditulis ulang di sini: seluruhnya diturunkan dari
 * `REGENCIES` di lib/provinces.ts agar daftar filter lokasi dan titik peta
 * tidak bisa menyimpang satu sama lain.
 */

import { REGENCIES } from "./provinces"

export type CityPoint = {
  /** Nama tampilan untuk label UI (ibu kota kabupaten/kota). */
  label: string
  /** Nilai kolom `city` di database — dipakai apa adanya sebagai filter. */
  area: string
  lat: number
  lng: number
}

export const CITIES: CityPoint[] = REGENCIES.map((r) => ({
  label: r.capital,
  area: r.name,
  lat: r.lat,
  lng: r.lng,
}))

/** Jarak lingkaran besar (km) antara dua titik koordinat. */
export function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Daerah terdekat dari titik pengguna.
 *
 * Mengembalikan `null` bila koordinat tidak valid (NaN, di luar rentang
 * lintang/bujur) atau daftar daerah kosong — bukan daerah acak sebagai tebakan.
 */
export function nearestCity(
  lat: number,
  lng: number,
  cities: CityPoint[] = CITIES
): { city: CityPoint; km: number } | null {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    cities.length === 0
  ) {
    return null
  }

  let best: { city: CityPoint; km: number } | null = null
  for (const city of cities) {
    const km = haversineKm(lat, lng, city.lat, city.lng)
    if (!best || km < best.km) best = { city, km }
  }
  return best
}
