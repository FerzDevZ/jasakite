import { describe, expect, it } from "vitest"

// Salinan logika escapeCsv dari app/api/admin/export/route.ts.
// Fungsi itu tidak diekspor (route handler), jadi diuji sebagai kontrak
// terpisah; bila implementasi di route diubah, tes ini harus diperbarui.
function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value)
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(s)
  const neutralized =
    !isPlainNumber && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }
  return neutralized
}

describe("escapeCsv", () => {
  it("meneruskan nilai biasa tanpa perubahan", () => {
    expect(escapeCsv("Service AC")).toBe("Service AC")
    expect(escapeCsv(150000)).toBe("150000")
  })

  it("mengubah null/undefined menjadi string kosong", () => {
    expect(escapeCsv(null)).toBe("")
    expect(escapeCsv(undefined)).toBe("")
  })

  it("mengutip nilai yang memuat koma atau baris baru", () => {
    expect(escapeCsv("Jakarta, Indonesia")).toBe('"Jakarta, Indonesia"')
    expect(escapeCsv("baris1\nbaris2")).toBe('"baris1\nbaris2"')
  })

  it("menggandakan tanda kutip di dalam nilai", () => {
    expect(escapeCsv('Servis "kilat"')).toBe('"Servis ""kilat"""')
  })

  it("menetralkan formula injection", () => {
    // Payload klasik: =cmd|' /C calc'!A0 dieksekusi Excel bila tidak dinetralkan.
    expect(escapeCsv("=1+1")).toBe("'=1+1")
    expect(escapeCsv("+1")).toBe("'+1")
    expect(escapeCsv("@SUM(A1)")).toBe("'@SUM(A1)")
    expect(escapeCsv("\tdata")).toBe("'\tdata")
  })

  it("menetralkan lalu mengutip payload yang juga memuat koma", () => {
    expect(escapeCsv("=HYPERLINK(1,2)")).toBe('"\'=HYPERLINK(1,2)"')
  })

  it("tidak menetralkan angka negatif agar kolom harga tetap numerik", () => {
    expect(escapeCsv(-1)).toBe("-1")
    expect(escapeCsv("-1500.5")).toBe("-1500.5")
  })

  it("tetap menetralkan string yang mirip angka tapi bukan angka", () => {
    expect(escapeCsv("-1+2")).toBe("'-1+2")
  })
})
