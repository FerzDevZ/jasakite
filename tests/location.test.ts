import { describe, expect, it } from "vitest"
import { countUniqueCities, cityFromLocation } from "@/lib/location"

/**
 * Kontrak parsing lokasi.
 *
 * Aturan yang sama disalin di TIGA tempat karena keduanya harus berjalan tanpa
 * build step (Node polos):
 *   - lib/location.ts        (dipakai aplikasi & API register)
 *   - prisma/backfill-city.js
 *   - prisma/seed.js
 *
 * Test ini adalah pagarnya: kalau salah satu salinan menyimpang, kasus di sini
 * yang menangkapnya. Kalau aturan berubah, ubah di tiga tempat itu sekaligus.
 *
 * Contoh alamat memakai kabupaten/kota Kepulauan Bangka Belitung — cakupan
 * wilayah aplikasi — agar fixture mencerminkan data yang benar-benar ada.
 */

describe("cityFromLocation", () => {
  it("mengembalikan nama kota polos apa adanya", () => {
    expect(cityFromLocation("Pangkal Pinang")).toBe("Pangkal Pinang")
    expect(cityFromLocation("Kabupaten Bangka")).toBe("Kabupaten Bangka")
  })

  it("mengambil kota dari alamat lengkap (segmen setelah koma terakhir)", () => {
    expect(cityFromLocation("Jl. Pemuda No.9, Sungailiat, Kabupaten Bangka")).toBe(
      "Kabupaten Bangka"
    )
    expect(cityFromLocation("Jl. Depati Amir No.5, Pangkal Pinang")).toBe(
      "Pangkal Pinang"
    )
    expect(
      cityFromLocation("Jl. X No.1, Kelurahan Koba, Kabupaten Bangka Tengah")
    ).toBe("Kabupaten Bangka Tengah")
  })

  it("merapikan spasi berlebih", () => {
    expect(cityFromLocation("  Jl. A No.1 ,   Muntok  ")).toBe("Muntok")
  })

  it("mengembalikan null untuk input kosong", () => {
    expect(cityFromLocation(null)).toBeNull()
    expect(cityFromLocation(undefined)).toBeNull()
    expect(cityFromLocation("")).toBeNull()
    expect(cityFromLocation("   ")).toBeNull()
    expect(cityFromLocation(",,,")).toBeNull()
  })

  it("mengembalikan null bila segmen terakhir masih penggal jalan", () => {
    expect(cityFromLocation("Jl. Melati No.12")).toBeNull()
    expect(cityFromLocation("Perumahan Indah, Blok C2")).toBeNull()
    expect(cityFromLocation("RT 05")).toBeNull()
  })
})

describe("countUniqueCities", () => {
  it("menyatukan alamat lengkap dengan nama kota polos", () => {
    // Kasus nyata dari seed: 14 baris, hanya 7 daerah.
    const locations = [
      "Pangkal Pinang",
      "Kabupaten Bangka",
      "Kabupaten Bangka Barat",
      "Kabupaten Bangka Tengah",
      "Kabupaten Bangka Selatan",
      "Kabupaten Belitung",
      "Kabupaten Belitung Timur",
      "Jl. Depati Amir No.5, Pangkal Pinang",
      "Jl. Pemuda No.9, Sungailiat, Kabupaten Bangka",
      "Jl. Pelabuhan No.4, Muntok, Kabupaten Bangka Barat",
      "Jl. Raya Koba No.12, Koba, Kabupaten Bangka Tengah",
      "Jl. Pahlawan No.11, Toboali, Kabupaten Bangka Selatan",
      "Jl. Hang Tuah No.8, Tanjung Pandan, Kabupaten Belitung",
      "Jl. Raya Manggar No.5, Manggar, Kabupaten Belitung Timur",
    ]
    expect(countUniqueCities(locations)).toBe(7)
  })

  it("tidak membedakan huruf besar-kecil", () => {
    expect(
      countUniqueCities(["pangkal pinang", "Pangkal Pinang", "PANGKAL PINANG"])
    ).toBe(1)
  })

  it("mengabaikan nilai kosong dan alamat tanpa kota", () => {
    expect(
      countUniqueCities([null, undefined, "", "Jl. Melati No.12", "Muntok"])
    ).toBe(1)
  })

  it("mengembalikan 0 untuk daftar kosong", () => {
    expect(countUniqueCities([])).toBe(0)
  })
})

describe("konsistensi filter katalog", () => {
  // Regresi yang diperbaiki oleh kolom `city`: filter dulu memakai
  // `location contains <query>`, sehingga penggal alamat mencocokkan semuanya.
  const SEED_LOCATIONS = [
    "Jl. Depati Amir No.5, Pangkal Pinang",
    "Jl. Pemuda No.9, Sungailiat, Kabupaten Bangka",
    "Jl. Pelabuhan No.4, Muntok, Kabupaten Bangka Barat",
  ]

  const asCity = (location: string) =>
    (cityFromLocation(location) ?? "").toLowerCase()

  it('kueri "jl" tidak lagi mencocokkan kota mana pun', () => {
    const matches = SEED_LOCATIONS.filter((l) => asCity(l).includes("jl"))
    expect(matches).toEqual([])
  })

  it('kueri "no" tidak lagi mencocokkan kota mana pun', () => {
    const matches = SEED_LOCATIONS.filter((l) => asCity(l).includes("no"))
    expect(matches).toEqual([])
  })

  it("kueri nama kabupaten tetap cocok tanpa peduli huruf besar-kecil", () => {
    // Nilai kolom `city` adalah nama kabupaten (segmen terakhir alamat), bukan
    // nama ibu kotanya — jadi kueri yang tepat adalah "bangka barat".
    for (const query of ["bangka barat", "Bangka Barat", "BANGKA BARAT"]) {
      const matches = SEED_LOCATIONS.filter((l) =>
        asCity(l).includes(query.toLowerCase())
      )
      expect(matches).toHaveLength(1)
    }
  })
})
