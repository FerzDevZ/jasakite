import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { REGENCIES, REGENCY_CITIES } from "@/lib/provinces"

/**
 * Pagar cakupan wilayah pada data demo (`prisma/seed.js`).
 *
 * Cakupan aplikasi dipersempit ke Provinsi Kepulauan Bangka Belitung: 7
 * kabupaten/kota, bukan 38 provinsi. Dua jenis kesalahan tidak terlihat dari
 * layar dan karena itu diperiksa di sini, bukan diandalkan pada mata:
 *
 *  1. **Data di luar provinsi.** Alamat penyedia/pelanggan yang masih menyebut
 *     kota nasional membuat filter lokasi (yang mencocokkan `provider.city`)
 *     diam-diam menyimpan daerah yang tidak pernah muncul di UI mana pun —
 *     sekaligus menggelembungkan KPI "daerah terlayani".
 *  2. **Judul jasa ≠ daerah penyedia.** Judul jasa diturunkan dari slug,
 *     sedangkan filter lokasi memakai `city` penyedia. Slug yang menyebut
 *     daerah lain membuat demo bertengkar dengan dirinya sendiri: menyaring
 *     "Kabupaten Bangka" menampilkan jasa berjudul "… Pangkal Pinang".
 *     Total hasilnya tetap BENAR, jadi tidak ada gejolak angka yang bisa
 *     menyadarkan siapa pun.
 *
 * Test ini membaca berkas seed sebagai teks (tanpa menjalankan seed — tidak
 * ada database di lingkungan test) dan menegakkan aturan yang sama dengan
 * penjaga runtime di dalam seed, sehingga penyimpangan tertangkap di sini
 * tanpa perlu menyentuh MongoDB.
 */

const SEED_PATH = join(process.cwd(), "prisma", "seed.js")
const seedSource = readFileSync(SEED_PATH, "utf8")

/** Nama daerah yang TIDAK ambigu: menyimpulkan tepat satu kabupaten/kota. */
const AREA_TOKENS: Record<string, string> = {
  "pangkal-pinang": "pangkal pinang",
  sungailiat: "kabupaten bangka",
  muntok: "kabupaten bangka barat",
  koba: "kabupaten bangka tengah",
  toboali: "kabupaten bangka selatan",
  "tanjung-pandan": "kabupaten belitung",
  manggar: "kabupaten belitung timur",
}

/**
 * Nama kota/kabupaten nasional yang tidak boleh muncul di data demo.
 * "bangka" dan "belitung" sengaja TIDAK ada di sini: keduanya adalah wilayah
 * provinsi ini sendiri (pulau/provinsi), bukan penanda luar cakupan.
 */
const OUT_OF_SCOPE = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Denpasar",
  "Medan",
  "Makassar",
  "Semarang",
  "Yogyakarta",
  "Palembang",
  "Batam",
  "Pekanbaru",
  "Bogor",
  "Bekasi",
  "Tangerang",
  "Malang",
  "Lampung",
  "Mataram",
  "Kupang",
  "Ambon",
  "Banjarmasin",
  "Samarinda",
  "Manado",
  "Jayapura",
  "Pontianak",
  "Balikpapan",
]

type SeedUser = { email: string; role: string; city: string | null }
type SeedService = { slug: string; providerEmail: string; description: string }

function sliceBetween(startMarker: string, endMarker: string): string {
  const start = seedSource.indexOf(startMarker)
  const end = seedSource.indexOf(endMarker)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(
      `Parser seed rusak: penanda ${JSON.stringify(startMarker)} / ${JSON.stringify(endMarker)} tidak ditemukan di prisma/seed.js. ` +
        "Kalau blok data itu memang dipindah atau diubah namanya, perbarui penanda di test ini — jangan hapus pemeriksaannya."
    )
  }
  return seedSource.slice(start, end)
}

/** Mencerminkan `cityFromLocation` di lib/location.ts: segmen setelah koma terakhir. */
function cityOf(location: string | null): string | null {
  if (!location) return null
  const segments = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return null
  return segments[segments.length - 1].trim().toLowerCase()
}

function parseUsers(): SeedUser[] {
  const block = sliceBetween("const userData", "const users = {}")
  const rows = [
    ...block.matchAll(
      /\["([^"]+@email\.com)", "[^"]+", "(PROVIDER|CUSTOMER|ADMIN)", (?:"([^"]*)"|(null))/g
    ),
  ]
  return rows.map((m) => ({
    email: m[1],
    role: m[2],
    city: cityOf(m[3] ?? null),
  }))
}

function parseServices(): SeedService[] {
  const block = sliceBetween("const serviceData", "PENJAGA: DAERAH DI JUDUL")
  const rows = [
    ...block.matchAll(
      /\["([a-z0-9-]+)", "[a-z-]+", "([^"]+@email\.com)", "([^"]+)"/g
    ),
  ]
  return rows.map((m) => ({
    slug: m[1],
    providerEmail: m[2],
    description: m[3],
  }))
}

/** Kabupaten/kota yang disimpulkan dari nama daerah di teks — 0, 1, atau lebih. */
function areasNamedIn(text: string): string[] {
  return [
    ...new Set(
      Object.entries(AREA_TOKENS)
        .filter(([token]) => text.includes(token))
        .map(([, city]) => city)
    ),
  ]
}

describe("cakupan wilayah data seed", () => {
  const users = parseUsers()
  const services = parseServices()
  const providers = users.filter((u) => u.role === "PROVIDER")
  const cityByEmail = new Map(providers.map((u) => [u.email, u.city]))

  it("membaca seluruh baris data seed (parser tidak diam-diam kosong)", () => {
    // Angka ini sengaja eksplisit: bila format literal seed berubah dan regex
    // di atas berhenti cocok, test harus GAGAL, bukan lulus tanpa memeriksa apa pun.
    expect(users).toHaveLength(33)
    expect(services).toHaveLength(30)
    expect(providers).toHaveLength(21)
  })

  it("menempatkan setiap penyedia dan pelanggan di salah satu dari 7 kabupaten/kota", () => {
    for (const user of users) {
      expect(user.city, `seed ${user.email} tidak punya city — filter lokasi akan melewatkannya`).not.toBeNull()
      expect(
        REGENCY_CITIES,
        `${user.email} ber-city "${user.city}" yang bukan kabupaten/kota Bangka Belitung`
      ).toContain(user.city)
    }
  })

  it("menyebar penyedia minimal 2 per kabupaten/kota", () => {
    const perCity = new Map<string, number>()
    for (const provider of providers) {
      perCity.set(provider.city!, (perCity.get(provider.city!) ?? 0) + 1)
    }
    for (const regency of REGENCIES) {
      expect(
        perCity.get(regency.name.toLowerCase()) ?? 0,
        `${regency.name} hanya punya ${perCity.get(regency.name.toLowerCase()) ?? 0} penyedia di seed`
      ).toBeGreaterThanOrEqual(2)
    }
  })

  it("menyediakan minimal 3 jasa per kabupaten/kota", () => {
    const perCity = new Map<string, number>()
    for (const service of services) {
      const city = cityByEmail.get(service.providerEmail)
      if (!city) continue
      perCity.set(city, (perCity.get(city) ?? 0) + 1)
    }
    for (const regency of REGENCIES) {
      expect(
        perCity.get(regency.name.toLowerCase()) ?? 0,
        `${regency.name} hanya punya ${perCity.get(regency.name.toLowerCase()) ?? 0} jasa di seed`
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it("tidak menyisakan nama kota di luar Provinsi Kepulauan Bangka Belitung", () => {
    const pattern = new RegExp(`\\b(${OUT_OF_SCOPE.join("|")})\\b`, "i")
    const offenders: string[] = []

    for (const service of services) {
      const hit = `${service.slug} ${service.description}`.match(pattern)
      if (hit) offenders.push(`${service.slug} → "${hit[0]}"`)
    }
    for (const user of users) {
      const hit = user.city?.match(pattern)
      if (hit) offenders.push(`${user.email} → "${hit[0]}"`)
    }

    expect(
      offenders,
      "Data demo masih menyebut daerah di luar cakupan (aplikasi hanya melayani Bangka Belitung)"
    ).toEqual([])
  })

  it("menjaga setiap jasa menyebut daerah penyedianya sendiri — bukan daerah lain", () => {
    const offenders: string[] = []
    let checked = 0

    for (const service of services) {
      const areas = areasNamedIn(`${service.slug} ${service.description}`)
      if (areas.length === 0) continue
      checked++
      const actual = cityByEmail.get(service.providerEmail)
      if (areas.length > 1) {
        offenders.push(
          `${service.slug} menyebut ${areas.join(" & ")} sekaligus — pilih satu daerah`
        )
        continue
      }
      if (areas[0] !== actual) {
        offenders.push(
          `${service.slug} menyebut ${areas[0]}, tetapi penyedianya (${service.providerEmail}) ber-city "${actual}"`
        )
      }
    }

    expect(checked, "tidak ada jasa yang diperiksa — token daerah tidak cocok sama sekali").toBeGreaterThanOrEqual(30)
    expect(
      offenders,
      "Judul/deskripsi jasa menyebut daerah yang berbeda dari daerah penyedia; filter lokasi akan menampilkannya di daerah yang salah"
    ).toEqual([])
  })

  it("memakai nama kabupaten resmi pada alamat, bukan varian bebas", () => {
    // Filter eksak membandingkan nilai `city` dengan REGENCY_CITIES, jadi
    // penulisan varian (mis. "Bangka" alih-alih "Kabupaten Bangka") akan
    // membuat jasa penyedia itu tidak muncul di chip mana pun.
    const offenders = users
      .filter((u) => !REGENCY_CITIES.includes(u.city ?? ""))
      .map((u) => `${u.email} → "${u.city}"`)
    expect(offenders).toEqual([])
  })
})
