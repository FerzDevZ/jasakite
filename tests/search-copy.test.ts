import { describe, expect, it } from "vitest"
import {
  GENERIC_SEARCH_PLACEHOLDER,
  searchPlaceholder,
} from "@/lib/search-copy"

/**
 * Placeholder beranda dulu hardcode nama kategori yang sudah tidak ada
 * ("Service AC, Pasang Listrik, Bersih Rumah"). Teks promosi yang menyebut
 * kategori terhapus membuat pengguna mencari sesuatu yang tidak ada, dan tidak
 * ada satu pun test yang menangkapnya karena teksnya memang selalu "berhasil"
 * dirender.
 */
describe("searchPlaceholder", () => {
  it("memakai kategori yang dikirim halaman, bukan daftar hardcode", () => {
    const text = searchPlaceholder(["Jasa Antar", "Jasa Titip", "Jasa Belanja"])
    expect(text).toBe("Cari: Jasa Antar, Jasa Titip, Jasa Belanja…")
    expect(text).not.toMatch(/Service AC|Pasang Listrik|Bersih Rumah/)
  })

  it("maksimal tiga contoh supaya tidak memanjang di layar sempit", () => {
    const text = searchPlaceholder(["A", "B", "C", "D", "E"])
    expect(text).toBe("Cari: A, B, C…")
  })

  it("membuang nama kosong dan spasi berlebih", () => {
    const text = searchPlaceholder(["  Kebersihan  ", "", "   ", "Listrik"])
    expect(text).toBe("Cari: Kebersihan, Listrik…")
  })

  it("jatuh ke kalimat umum saat kategori kurang dari dua", () => {
    expect(searchPlaceholder([])).toBe(GENERIC_SEARCH_PLACEHOLDER)
    expect(searchPlaceholder(["Listrik"])).toBe(GENERIC_SEARCH_PLACEHOLDER)
    expect(searchPlaceholder(["", "  "])).toBe(GENERIC_SEARCH_PLACEHOLDER)
  })
})
