import { describe, expect, it } from "vitest"
import {
  LOCATION_SUGGESTIONS,
  PROVINCE,
  REGENCIES,
  REGENCY_CITIES,
  canonicalArea,
  isProvinceWide,
  normalizeLocationInput,
  resolveLocation,
  searchLocations,
} from "@/lib/provinces"

/**
 * Kontrak cakupan wilayah.
 *
 * Aplikasi melayani SATU provinsi (Kepulauan Bangka Belitung), jadi daftar
 * lokasi adalah 7 kabupaten/kota — bukan 38 provinsi. Test ini menjaga dua hal
 * yang mudah rusak tanpa terlihat:
 *   1. jumlah & keunikan daerah, agar chip filter tidak menampilkan duplikat;
 *   2. mode filter (eksak vs contains), karena `contains "kabupaten bangka"`
 *      juga cocok dengan "kabupaten bangka barat/tengah/selatan" — satu pilihan
 *      pengguna diam-diam menampilkan empat kabupaten.
 */

describe("daftar daerah", () => {
  it("berisi 7 kabupaten/kota Provinsi Kepulauan Bangka Belitung", () => {
    expect(REGENCIES).toHaveLength(7)
    expect(PROVINCE).toBe("Kepulauan Bangka Belitung")
  })

  it("nama daerah unik setelah dinormalisasi lowercase", () => {
    expect(new Set(REGENCY_CITIES).size).toBe(REGENCY_CITIES.length)
  })

  it("setiap daerah punya ibu kota, koordinat, dan nama yang bisa dipetakan lowercase", () => {
    for (const reg of REGENCIES) {
      expect(reg.capital.length, reg.name).toBeGreaterThan(0)
      expect(Number.isFinite(reg.lat), reg.name).toBe(true)
      expect(Number.isFinite(reg.lng), reg.name).toBe(true)
      expect(REGENCY_CITIES, reg.name).toContain(reg.name.toLowerCase())
    }
  })

  it("nama yang berawalan sama tetap dibedakan oleh pencocokan eksak", () => {
    // "kabupaten belitung" adalah awalan "kabupaten belitung timur"; mode
    // contains akan menampilkan keduanya, mode eksak tidak.
    expect(resolveLocation("Kabupaten Belitung")).toEqual({
      mode: "exact",
      value: "kabupaten belitung",
    })
    expect(resolveLocation("Kabupaten Belitung Timur")).toEqual({
      mode: "exact",
      value: "kabupaten belitung timur",
    })
  })
})

describe("resolveLocation", () => {
  it("memakai pencocokan EKSAK untuk nama daerah yang dikenal", () => {
    expect(resolveLocation("Kabupaten Bangka")).toEqual({
      mode: "exact",
      value: "kabupaten bangka",
    })
    expect(resolveLocation("  PANGKAL PINANG  ")).toEqual({
      mode: "exact",
      value: "pangkal pinang",
    })
  })

  it("memetakan ibu kota ke kabupatennya dengan pencocokan EKSAK", () => {
    // Orang mencari "Sungailiat", bukan "Kabupaten Bangka". Sebelum alias ini
    // ada, nilai itu dikirim sebagai `contains` sementara kolom `city` berisi
    // "kabupaten bangka" — hasilnya nol, padahal chip berlabel sama
    // menampilkan enam jasa.
    expect(resolveLocation("Sungailiat")).toEqual({
      mode: "exact",
      value: "kabupaten bangka",
    })
    expect(resolveLocation("  tanjung pandan  ")).toEqual({
      mode: "exact",
      value: "kabupaten belitung",
    })
    for (const reg of REGENCIES) {
      expect(resolveLocation(reg.capital), reg.capital).toEqual({
        mode: "exact",
        value: reg.name.toLowerCase(),
      })
    }
  })

  it("memakai pencocokan contains untuk ketikan bebas", () => {
    expect(resolveLocation("bangka")).toEqual({
      mode: "contains",
      value: "bangka",
    })
    expect(resolveLocation("belitung")).toEqual({
      mode: "contains",
      value: "belitung",
    })
  })

  it("melepas filter untuk seluruh provinsi, bukan mengirim nilai yang tak cocok", () => {
    expect(resolveLocation("Kepulauan Bangka Belitung")).toBeNull()
    expect(resolveLocation("Bangka Belitung")).toBeNull()
    expect(resolveLocation("Babel")).toBeNull()
  })

  it("memotong input panjang agar tidak dipakai sebagai kueri raksasa", () => {
    const long = "a".repeat(500)
    expect(resolveLocation(long)?.value.length).toBe(60)
  })

  // ---- Kasus negatif ----

  it("mengembalikan null untuk input kosong atau hanya spasi", () => {
    expect(resolveLocation("")).toBeNull()
    expect(resolveLocation("   ")).toBeNull()
  })

  it("menyimpan bentuk kanonik dari input pengguna", () => {
    expect(normalizeLocationInput("Sungailiat")).toBe("Kabupaten Bangka")
    expect(normalizeLocationInput("KABUPATEN BELITUNG TIMUR")).toBe(
      "Kabupaten Belitung Timur"
    )
    expect(normalizeLocationInput("babel")).toBe("")
    expect(normalizeLocationInput("bangka")).toBe("bangka")
  })

  it("tidak menandai daerah luar provinsi sebagai eksak", () => {
    const filter = resolveLocation("bandung")
    expect(filter?.mode).toBe("contains")
    expect(REGENCY_CITIES).not.toContain("bandung")
  })
})

describe("isProvinceWide", () => {
  it("true untuk sebutan provinsi", () => {
    expect(isProvinceWide("Kepulauan Bangka Belitung")).toBe(true)
    expect(isProvinceWide("babel")).toBe(true)
  })

  it("false untuk nama daerah", () => {
    expect(isProvinceWide("Kabupaten Belitung")).toBe(false)
    expect(isProvinceWide("")).toBe(false)
  })
})

describe("LOCATION_SUGGESTIONS", () => {
  it("memuat provinsi, seluruh daerah, dan ibu kotanya", () => {
    expect(LOCATION_SUGGESTIONS).toContain(PROVINCE)
    for (const reg of REGENCIES) {
      expect(LOCATION_SUGGESTIONS).toContain(reg.name)
      expect(LOCATION_SUGGESTIONS).toContain(reg.capital)
    }
  })

  it("setiap saran lokasi bisa dipetakan ke satu daerah — tidak ada saran buntu", () => {
    // Saran yang tidak dikenali akan dikirim apa adanya sebagai `contains` dan
    // bisa mengembalikan nol hasil; setiap saran harus bisa diselesaikan ke satu
    // kabupaten/kota (atau ke seluruh provinsi).
    for (const loc of LOCATION_SUGGESTIONS) {
      const recognized =
        isProvinceWide(loc) || canonicalArea(loc) !== null
      expect(recognized, `saran lokasi buntu: ${loc}`).toBe(true)
    }
  })

  it("searchLocations mencari tanpa peduli huruf besar-kecil", () => {
    const hits = searchLocations("manggar")
    expect(hits).toContain("Manggar")
    expect(searchLocations("")).toEqual([])
  })
})

/**
 * Validasi kota pada buku alamat.
 *
 * `POST/PATCH /api/addresses` memanggil `canonicalArea()` dan menolak bila null,
 * lalu menyimpan hasilnya lowercase. Kota di luar provinsi tidak boleh tersimpan:
 * filter katalog hanya mengenal 7 kabupaten/kota ini, jadi alamat "Bandung"
 * akan membuat pesanan yang tidak pernah cocok dengan penyedia mana pun.
 */
describe("validasi kota alamat", () => {
  it("menerima seluruh nama resmi 7 kabupaten/kota", () => {
    for (const reg of REGENCIES) {
      expect(canonicalArea(reg.name)).toBe(reg.name)
    }
  })

  it("menerima ibu kota dan menuliskannya kembali ke nama kabupaten/kotanya", () => {
    for (const reg of REGENCIES) {
      expect(canonicalArea(reg.capital)).toBe(reg.name)
    }
  })

  it("menerima input huruf kecil tanpa merusak ejaan resmi", () => {
    expect(canonicalArea("kabupaten bangka barat")).toBe("Kabupaten Bangka Barat")
    expect(canonicalArea("  pangkal pinang ")).toBe("Pangkal Pinang")
  })

  it("menolak kota di luar Provinsi Kepulauan Bangka Belitung", () => {
    for (const city of ["Jakarta Selatan", "Bandung", "Denpasar", "Surabaya", "Medan"]) {
      expect(canonicalArea(city), city).toBeNull()
    }
  })

  it("menolak sebutan provinsi — alamat harus menunjuk SATU kabupaten/kota", () => {
    // Untuk filter katalog, sebutan provinsi berarti "seluruh wilayah" dan
    // dilepas; untuk alamat, itu bukan tujuan yang bisa didatangi penyedia.
    expect(canonicalArea(PROVINCE)).toBeNull()
  })
})
