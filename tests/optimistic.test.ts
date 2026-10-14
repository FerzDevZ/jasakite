import { describe, expect, it } from "vitest"
import {
  markPending,
  dropItem,
  patchCartLine,
  markRead,
  markAllRead,
} from "@/lib/optimistic"
import { MAX_CART_QTY, clampQty } from "@/lib/cart"

/**
 * Helper update optimistik dipisah dari komponen supaya perilaku
 * instan-then-rollback bisa diuji tanpa react-query atau jaringan —
 * pola yang sama dengan cart.test.ts untuk logika keranjang murni.
 */

describe("markPending — pending satu elemen", () => {
  it("mengganti elemen yang cocok tanpa mengubah elemen lain (immutable)", () => {
    const items = [
      { id: 1, status: "ACTIVE" as const },
      { id: 2, status: "DRAFT" as const },
    ]
    const next = markPending(items, (i) => i.id === 2, { status: "ACTIVE" })
    expect(next).toEqual([
      { id: 1, status: "ACTIVE" },
      { id: 2, status: "ACTIVE" },
    ])
    // Referensi array lama tidak boleh berubah — react-query menimpa
    // datanya dengan return value, bukan mutasi di tempat.
    expect(items[1].status).toBe("DRAFT")
  })

  it("tidak mengubah apa pun bila id tidak ditemukan", () => {
    const items: { id: number; status: "ACTIVE" | "DRAFT" }[] = [
      { id: 1, status: "ACTIVE" },
    ]
    expect(markPending(items, (i) => i.id === 99, { status: "DRAFT" })).toEqual(
      items
    )
  })
})

describe("dropItem — hapus optimistik", () => {
  it("membuang baris dengan id yang cocok saja", () => {
    const items = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" },
    ]
    expect(dropItem(items, (i) => i.id === "b").map((i) => i.id)).toEqual([
      "a",
      "c",
    ])
  })

  it("kosong bila semua cocok — daftar simpanan habis tanpa error", () => {
    const items = [{ id: 1 }, { id: 2 }]
    expect(dropItem(items, (i) => i.id > 0)).toEqual([])
  })
})

describe("patchCartLine — baris keranjang optimistik", () => {
  const lines = [
    { id: "l1", qty: 2, note: null, unitPrice: 50_000 },
    { id: "l2", qty: 1, note: "hati-hati", unitPrice: 75_000 },
  ]

  it("mengubah qty satu baris; baris lain utuh", () => {
    const next = patchCartLine(lines, "l1", { qty: 5 }, clampQty)
    expect(next[0]).toMatchObject({ id: "l1", qty: 5, unitPrice: 50_000 })
    expect(next[1]).toEqual(lines[1])
  })

  it("qty di-clamp dengan aturan server (tanpa 0, tanpa melebihi batas)", () => {
    // Optimistik tidak boleh menjanjikan qty=0 — server memakai clampQty
    // yang menolak di bawah 1, jadi baris yang sama harus tetap >= 1.
    const zero = patchCartLine(lines, "l1", { qty: 0 }, clampQty)
    expect(zero[0].qty).toBe(1)
    const over = patchCartLine(lines, "l1", { qty: 999 }, clampQty)
    expect(over[0].qty).toBe(MAX_CART_QTY)
  })

  it("mengganti note dan bisa menghapusnya kembali ke null", () => {
    const changed = patchCartLine(lines, "l2", { note: "pagi ya" }, clampQty)
    expect(changed[1].note).toBe("pagi ya")
    const cleared = patchCartLine(changed, "l2", { note: null }, clampQty)
    expect(cleared[1].note).toBeNull()
  })

  it("patch pada id yang tidak ada tidak mengubah array", () => {
    expect(patchCartLine(lines, "ghost", { qty: 3 }, clampQty)).toEqual(lines)
  })
})

describe("markRead / markAllRead — notifikasi optimistik", () => {
  const items = [
    { id: "n1", read: false },
    { id: "n2", read: true },
    { id: "n3", read: false },
  ]

  it("markRead: flip satu item yang belum dibaca", () => {
    const next = markRead(items, "n3")
    expect(next.map((i) => i.read)).toEqual([false, true, true])
    // Sumber asli tidak termutasi.
    expect(items[2].read).toBe(false)
  })

  it("markRead: id tak dikenal tidak mengubah apa pun", () => {
    expect(markRead(items, "unknown")).toEqual(items)
  })

  it("markAllRead: semua jadi dibaca", () => {
    expect(markAllRead(items).every((i) => i.read)).toBe(true)
  })
})
