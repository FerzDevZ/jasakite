/**
 * Cakupan wilayah: Provinsi Kepulauan Bangka Belitung.
 *
 * Aplikasi ini melayani SATU provinsi, jadi daftar yang dipakai filter lokasi
 * bukan 38 provinsi melainkan 7 kabupaten/kota di Bangka Belitung. `name` tiap
 * daerah adalah nilai yang tersimpan di kolom `User.city` — semua jalur tulis
 * (register route, seed, backfill) menyimpannya lowercase, sehingga filter bisa
 * memakai pencocokan EKSAK.
 *
 * Kenapa eksak penting: `contains "kabupaten bangka"` juga cocok dengan
 * "kabupaten bangka barat", "… tengah", dan "… selatan" — memilih satu
 * kabupaten diam-diam menampilkan empat. `resolveLocation()` mengembalikan mode
 * `exact` untuk nama daerah yang dikenal, dan `contains` hanya untuk ketikan
 * bebas seperti "bangka" atau "belitung".
 *
 * Sumber nama & koordinat: BPS Provinsi Kepulauan Bangka Belitung (7
 * kabupaten/kota: 1 kota + 6 kabupaten).
 */

/** Satu-satunya provinsi yang dilayani aplikasi. */
export const PROVINCE = "Kepulauan Bangka Belitung"

export type Regency = {
  /** Nama resmi kabupaten/kota — nilai yang disimpan di kolom `city`. */
  name: string
  /** Ibu kota kabupaten / kota utama, dipakai sebagai label pendek di UI. */
  capital: string
  lat: number
  lng: number
}

/** 7 kabupaten/kota Provinsi Kepulauan Bangka Belitung. */
export const REGENCIES: Regency[] = [
  { name: "Pangkal Pinang", capital: "Pangkal Pinang", lat: -2.1291, lng: 106.1138 },
  { name: "Kabupaten Bangka", capital: "Sungailiat", lat: -1.8557, lng: 106.1076 },
  { name: "Kabupaten Bangka Barat", capital: "Muntok", lat: -2.0655, lng: 105.1628 },
  { name: "Kabupaten Bangka Tengah", capital: "Koba", lat: -2.4815, lng: 106.4127 },
  { name: "Kabupaten Bangka Selatan", capital: "Toboali", lat: -3.0006, lng: 106.4636 },
  { name: "Kabupaten Belitung", capital: "Tanjung Pandan", lat: -2.7444, lng: 107.6347 },
  { name: "Kabupaten Belitung Timur", capital: "Manggar", lat: -2.8877, lng: 108.2747 },
]

/** Nama daerah lowercase — padanan nilai kolom `city` di database. */
export const REGENCY_CITIES: string[] = REGENCIES.map((r) =>
  r.name.toLowerCase()
)

/**
 * Sebutan provinsi. Nilai ini berarti "seluruh wilayah", bukan filter satu
 * daerah — tidak ada baris `city` yang berisi teks ini setelah seed wilayah
 * diisi nama kabupaten/kota.
 */
const PROVINCE_ALIASES = new Set([
  "kepulauan bangka belitung",
  "bangka belitung",
  "kep. bangka belitung",
  "kep babel",
  "babel",
])

/** Untuk autocomplete: provinsi + kabupaten/kota + ibu kotanya. */
export const LOCATION_SUGGESTIONS: string[] = [
  PROVINCE,
  ...REGENCIES.map((r) => r.name),
  ...REGENCIES.map((r) => r.capital),
]

export function searchLocations(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return LOCATION_SUGGESTIONS.filter((l) => l.toLowerCase().includes(q)).slice(
    0,
    limit
  )
}

/** True bila nilai berarti seluruh provinsi — filter lokasi harus dilepas. */
export function isProvinceWide(value: string): boolean {
  return PROVINCE_ALIASES.has(value.trim().toLowerCase())
}

/**
 * Nilai lokasi yang disimpan UI dari input pengguna: nama kabupaten/kota resmi
 * bila inputnya dikenali (termasuk ibu kota), string kosong bila berarti
 * seluruh provinsi, dan teks asli bila bebas.
 *
 * Dipakai autocomplete supaya memilih "Sungailiat" menyimpan "Kabupaten
 * Bangka" — state kanonik yang membuat chip daerah ikut tersorot, bukan nama
 * ibu kota yang tidak dicocokkan chip mana pun.
 */
export function normalizeLocationInput(raw: string): string {
  if (isProvinceWide(raw)) return ""
  return canonicalArea(raw) ?? raw.trim()
}

/**
 * Nilai yang menyimpulkan tepat satu kabupaten/kota: nama resmi DAN ibu
 * kotanya. Ibu kota wajib ikut karena itulah nama yang dicari orang:
 * "Sungailiat", bukan "Kabupaten Bangka".
 *
 * Sebelum peta ini ada, memilih "Sungailiat" dari autocomplete mengirim teks
 * itu apa adanya sebagai pencarian `contains`, sementara kolom `city` berisi
 * "kabupaten bangka" — hasilnya NOL. Chip berlabel sama tepat di bawah kolom
 * itu menampilkan enam jasa, jadi dua kontrol berlabel identik memberi hasil
 * bertolak belakang.
 */
const AREA_ALIASES = new Map<string, string>(
  REGENCIES.flatMap((r) => [
    [r.name.toLowerCase(), r.name] as const,
    [r.capital.toLowerCase(), r.name] as const,
  ])
)

export type LocationFilter =
  | { mode: "exact"; value: string }
  | { mode: "contains"; value: string }

/**
 * Terjemahkan input lokasi menjadi filter kolom `city`.
 * `null` berarti jangan saring: input kosong atau sebutan seluruh provinsi.
 *
 * Nama daerah DAN ibu kotanya memakai pencocokan eksak; hanya ketikan bebas
 * ("bangka", "belitung") yang memakai `contains`.
 */
export function resolveLocation(raw: string): LocationFilter | null {
  const value = raw.trim().toLowerCase().slice(0, 60)
  if (!value || PROVINCE_ALIASES.has(value)) return null
  const area = AREA_ALIASES.get(value)
  if (area) return { mode: "exact", value: area.toLowerCase() }
  return { mode: "contains", value }
}

/**
 * Nama resmi kabupaten/kota (huruf asli, mis. "Kabupaten Bangka") untuk sebuah
 * nilai lokasi, atau null bila nilainya tidak menunjuk satu daerah.
 */
export function canonicalArea(raw: string): string | null {
  return AREA_ALIASES.get(raw.trim().toLowerCase()) ?? null
}
