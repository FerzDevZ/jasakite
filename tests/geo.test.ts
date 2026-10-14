import { describe, expect, it } from "vitest"
import { CITIES, haversineKm, nearestCity } from "@/lib/geo"
import { REGENCY_CITIES } from "@/lib/provinces"

describe("haversineKm", () => {
  it("jarak Pangkal Pinang–Tanjung Pandan mendekati nilai peta (~160-200 km)", () => {
    const pangkal = CITIES.find((c) => c.label === "Pangkal Pinang")!
    const tanjung = CITIES.find((c) => c.label === "Tanjung Pandan")!
    const km = haversineKm(pangkal.lat, pangkal.lng, tanjung.lat, tanjung.lng)
    expect(km).toBeGreaterThan(160)
    expect(km).toBeLessThan(200)
  })

  it("titik yang sama berjarak 0", () => {
    expect(haversineKm(-2.1291, 106.1138, -2.1291, 106.1138)).toBe(0)
  })
})

describe("nearestCity", () => {
  it("koordinat di Pangkal Pinang memilih Pangkal Pinang dengan jarak ~0 km", () => {
    const result = nearestCity(-2.1291, 106.1138)
    expect(result).not.toBeNull()
    expect(result!.city.label).toBe("Pangkal Pinang")
    expect(result!.km).toBeLessThan(1)
  })

  it("koordinat di Manggar memilih daerah dengan nilai filter Kabupaten Belitung Timur", () => {
    const result = nearestCity(-2.8877, 108.2747)
    expect(result!.city.label).toBe("Manggar")
    // `area` harus berupa nilai yang benar-benar ada di kolom city seed.
    expect(result!.city.area).toBe("Kabupaten Belitung Timur")
    expect(REGENCY_CITIES).toContain(result!.city.area.toLowerCase())
  })

  it("semua daerah punya area non-kosong (kontrak filter)", () => {
    for (const city of CITIES) {
      expect(city.area.length, city.label).toBeGreaterThan(0)
      expect(city.area, city.label).not.toMatch(/^\s$/)
    }
  })

  it("setiap titik hanya mencakup 7 kabupaten/kota Kepulauan Bangka Belitung", () => {
    expect(CITIES).toHaveLength(7)
    for (const city of CITIES) {
      expect(REGENCY_CITIES).toContain(city.area.toLowerCase())
    }
  })

  // ---- Kasus negatif ----

  it("koordinat NaN mengembalikan null, bukan kota tebakan", () => {
    expect(nearestCity(NaN, 106.8)).toBeNull()
  })

  it("lintang di luar rentang [-90, 90] mengembalikan null", () => {
    expect(nearestCity(91, 106.8)).toBeNull()
    expect(nearestCity(-90.5, 106.8)).toBeNull()
  })

  it("bujur di luar rentang [-180, 180] mengembalikan null", () => {
    expect(nearestCity(-2.1, 181)).toBeNull()
  })

  it("daftar kota kosong mengembalikan null", () => {
    expect(nearestCity(-2.1, 106.1, [])).toBeNull()
  })
})
