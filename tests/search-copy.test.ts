import { describe, expect, it } from "vitest"
import {
  GENERIC_SEARCH_PLACEHOLDER,
  searchPlaceholder,
} from "@/lib/search-copy"

/**
 * Placeholder beranda diturunkan dari kategori yang dikirim halaman.
 *
 * Test pertama menjaga bentuk teksnya; test sisanya menjaga aturan yang
 * membuatnya tidak bisa menunjuk kategori yang sudah tidak ada: hanya nama
 * yang benar-benar dikirim, maksimal tiga, dan tidak ada nama kosong.
 */
describe("searchPlaceholder", () => {
  it("memakai kategori yang dikirim halaman, bukan daftar hardcode", () => {
    const text = searchPlaceholder(["Jasa Antar", "Jasa Titip", "Jasa Belanja"])
    expect(text).toBe("Cari: Jasa Antar, Jasa Titip, Jasa Belanja…")
  })

  it("maksimal tiga contoh supaya tidak memanjang di layar sempit", () => {
    const text = searchPlaceholder(["A", "B", "C", "D", "E"])
    expect(text).toBe("Cari: A, B, C…")
  })

  it("membuang nama kosong dan spasi berlebih", () => {
    const text = searchPlaceholder(["  Jasa Antar  ", "", "   ", "Jasa Titip"])
    expect(text).toBe("Cari: Jasa Antar, Jasa Titip…")
  })

  it("jatuh ke kalimat umum saat kategori kurang dari dua", () => {
    expect(searchPlaceholder([])).toBe(GENERIC_SEARCH_PLACEHOLDER)
    expect(searchPlaceholder(["Jasa Belanja"])).toBe(GENERIC_SEARCH_PLACEHOLDER)
    expect(searchPlaceholder(["", "  "])).toBe(GENERIC_SEARCH_PLACEHOLDER)
  })
})
