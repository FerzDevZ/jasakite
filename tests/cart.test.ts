import { describe, expect, it } from "vitest"
import {
  MAX_CART_LINES,
  MAX_CART_QTY,
  apportionDiscount,
  cartSubtotal,
  clampQty,
  resolveUnitPrice,
} from "@/lib/cart"

describe("cartSubtotal", () => {
  it("menjumlahkan harga satuan × qty", () => {
    expect(
      cartSubtotal([
        { unitPrice: 150_000, qty: 2 },
        { unitPrice: 75_000, qty: 1 },
      ])
    ).toBe(375_000)
  })

  it("mengabaikan baris dengan harga atau qty tidak masuk akal", () => {
    expect(
      cartSubtotal([
        { unitPrice: Number.NaN, qty: 2 },
        { unitPrice: 100_000, qty: 0 },
        { unitPrice: 100_000, qty: -3 },
        { unitPrice: 50_000, qty: 1 },
      ])
    ).toBe(50_000)
  })

  it("keranjang kosong bernilai 0", () => {
    expect(cartSubtotal([])).toBe(0)
  })

  it("qty pecahan dibulatkan ke bawah, bukan dibulatkan ke atas", () => {
    // Membulatkan ke atas berarti menagih setengah unit sebagai satu unit.
    expect(cartSubtotal([{ unitPrice: 10_000, qty: 2.9 }])).toBe(20_000)
  })
})

describe("resolveUnitPrice", () => {
  it("harga paket menang atas harga dasar jasa", () => {
    expect(resolveUnitPrice(100_000, 250_000)).toBe(250_000)
  })

  it("jatuh ke harga jasa bila paket tidak ada", () => {
    expect(resolveUnitPrice(100_000, null)).toBe(100_000)
    expect(resolveUnitPrice(100_000, undefined)).toBe(100_000)
  })

  it("mengabaikan harga paket nol atau negatif", () => {
    // Paket Rp0 hampir selalu berarti data rusak, bukan jasa gratis.
    expect(resolveUnitPrice(100_000, 0)).toBe(100_000)
    expect(resolveUnitPrice(100_000, -50_000)).toBe(100_000)
  })
})

describe("clampQty", () => {
  it("menahan qty di antara 1 dan batas maksimum", () => {
    expect(clampQty(0)).toBe(1)
    expect(clampQty(-4)).toBe(1)
    expect(clampQty(MAX_CART_QTY + 10)).toBe(MAX_CART_QTY)
    expect(clampQty(3)).toBe(3)
  })

  it("qty tidak valid menjadi 1, bukan 0", () => {
    expect(clampQty(Number.NaN)).toBe(1)
  })
})

describe("apportionDiscount", () => {
  it("total potongan sama persis dengan diskon yang dijanjikan", () => {
    const shares = apportionDiscount([100_000, 200_000, 50_000], 35_000)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(35_000)
  })

  it("membagi sebanding dengan subtotal", () => {
    const shares = apportionDiscount([100_000, 300_000], 40_000)
    expect(shares).toEqual([10_000, 30_000])
  })

  it("sisa pembulatan jatuh ke baris terbesar sehingga tidak ada rupiah hilang", () => {
    // 3 baris sama besar, diskon 10.000 → 3333 + 3333 + 3333 = 9999,
    // sisa 1 rupiah harus tetap dibayarkan oleh salah satu baris.
    const shares = apportionDiscount([10_000, 10_000, 10_000], 10_000)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10_000)
  })

  it("tidak pernah membagi lebih dari subtotal", () => {
    const shares = apportionDiscount([50_000], 80_000)
    expect(shares).toEqual([50_000])
  })

  it("mengembalikan nol untuk diskon atau subtotal nol", () => {
    expect(apportionDiscount([10_000, 20_000], 0)).toEqual([0, 0])
    expect(apportionDiscount([], 10_000)).toEqual([])
  })

  it("setiap baris mendapat potongan proporsional, bukan seluruhnya ke baris pertama", () => {
    // Kalau seluruh diskon ditimpakan ke baris pertama, penyedia pertama
    // menanggung potongan yang bukan miliknya dan bisa menerima Rp0.
    const shares = apportionDiscount([100_000, 100_000], 50_000)
    expect(shares[0]).toBeGreaterThan(0)
    expect(shares[1]).toBeGreaterThan(0)
  })
})

describe("batas keranjang", () => {
  it("punya batas baris dan batas qty yang wajar", () => {
    expect(MAX_CART_LINES).toBeGreaterThan(0)
    expect(MAX_CART_QTY).toBeGreaterThan(1)
    expect(MAX_CART_QTY).toBeLessThanOrEqual(99)
  })
})
