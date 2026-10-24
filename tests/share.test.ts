import { describe, expect, it } from "vitest"
import {
  buildWhatsAppShareText,
  buildWhatsAppShareUrl,
} from "@/lib/share"

/**
 * Kontrak pesan berbagi WhatsApp: teks yang masuk grup WA adalah materi
 * promosi utama — nama jasa, harga, dan tautan wajib utuh, dan URL wa.me
 * wajib meng-encode seluruhnya (spasi & baris tidak boleh bocor mentah).
 */

const SHARE_INPUT = {
  title: "Antar Paket Dokumen Pangkal Pinang",
  price: 150000,
  url: "https://jasakite.example/service/antar-paket-dokumen-pangkal-pinang-15133",
}

describe("buildWhatsAppShareText", () => {
  it("menyusun nama jasa, harga, dan tautan — satu per baris", () => {
    const lines = buildWhatsAppShareText(SHARE_INPUT).split("\n")

    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe(SHARE_INPUT.title)
    // formatIDR memakai pemisah non-breaking space, jadi dicek per bagian.
    expect(lines[2]).toMatch(/Rp/)
    expect(lines[2]).toContain("150.000")
    expect(lines[3]).toBe(SHARE_INPUT.url)
  })

  it("mengikuti format rupiah yang sama dengan UI (tanpa desimal)", () => {
    const text = buildWhatsAppShareText({ ...SHARE_INPUT, price: 50000 })

    expect(text).toContain("50.000")
    expect(text).not.toContain(",00")
  })

  it("mempertahankan URL lengkap dengan slug jasa", () => {
    const text = buildWhatsAppShareText(SHARE_INPUT)

    expect(text).toContain("/service/antar-paket-dokumen-pangkal-pinang-15133")
  })
})

describe("buildWhatsAppShareUrl", () => {
  it("membangun tautan wa.me yang bisa di-decode kembali utuh", () => {
    const text = buildWhatsAppShareText(SHARE_INPUT)
    const url = buildWhatsAppShareUrl(text)

    expect(url.startsWith("https://wa.me/?text=")).toBe(true)
    const encoded = url.slice("https://wa.me/?text=".length)
    expect(decodeURIComponent(encoded)).toBe(text)
  })

  it("meng-encode spasi dan baris — tidak ada karakter mentah di URL", () => {
    const url = buildWhatsAppShareUrl("Jasa Bersih\nRumah 50.000")

    expect(url).not.toContain(" ")
    expect(url).not.toContain("\n")
    expect(url).toContain("%0A")
  })
})
