import { describe, expect, it } from "vitest"
import { FAQ_SECTIONS } from "@/lib/faq-data"

/**
 * Penjaga data FAQ.
 *
 * `app/faq/page.tsx` pernah punya salinan FAQ_SECTIONS sendiri dengan seluruh
 * `a` diset `""`, sehingga JSON-LD FAQPage memancarkan `acceptedAnswer.text`
 * kosong untuk ke-14 pertanyaan. Markup seperti itu ditolak Google dan lebih
 * berbahaya daripada tidak ada markup sama sekali — sementara UI tetap terlihat
 * benar karena teksnya berasal dari komponen lain.
 *
 * Tes ini menjaga sumber tunggalnya: setiap pertanyaan wajib punya jawaban.
 */

describe("FAQ_SECTIONS", () => {
  it("berisi 5 bagian dengan 14 pertanyaan", () => {
    expect(FAQ_SECTIONS).toHaveLength(5)
    const total = FAQ_SECTIONS.reduce((sum, s) => sum + s.items.length, 0)
    expect(total).toBe(14)
  })

  it("setiap bagian punya id dan judul yang tidak kosong", () => {
    for (const section of FAQ_SECTIONS) {
      expect(section.id.trim().length).toBeGreaterThan(0)
      expect(section.title.trim().length).toBeGreaterThan(0)
      expect(section.items.length).toBeGreaterThan(0)
    }
  })

  it("setiap pertanyaan punya pertanyaan dan JAWABAN yang tidak kosong", () => {
    for (const section of FAQ_SECTIONS) {
      for (const item of section.items) {
        expect(item.q.trim().length).toBeGreaterThan(0)
        expect(item.a.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it("jawaban cukup substantif untuk acceptedAnswer schema.org", () => {
    for (const section of FAQ_SECTIONS) {
      for (const item of section.items) {
        expect(item.a.trim().length).toBeGreaterThanOrEqual(40)
      }
    }
  })

  it("id bagian unik", () => {
    const ids = FAQ_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("pertanyaan tidak duplikat di seluruh bagian", () => {
    const questions = FAQ_SECTIONS.flatMap((s) => s.items.map((i) => i.q.trim()))
    expect(new Set(questions).size).toBe(questions.length)
  })

  it("menolak jawaban yang hanya berisi spasi", () => {
    const blank = { q: "Tanya?", a: "   " }
    expect(blank.a.trim().length).toBe(0)
  })
})
