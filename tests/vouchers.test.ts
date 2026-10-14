import { describe, expect, it } from "vitest"
import { checkVoucher, computeVoucherDiscount, totalAfterDiscount } from "@/lib/vouchers"

const NOW = new Date("2026-03-01T10:00:00Z")

function baseVoucher(overrides: Partial<Parameters<typeof checkVoucher>[0]> = {}) {
  return {
    code: "HEMAT",
    type: "PERCENT" as const,
    value: 20,
    minSpend: 0,
    maxDiscount: null,
    scopeCity: null,
    isActive: true,
    startsAt: new Date("2026-01-01T00:00:00Z"),
    endsAt: new Date("2026-12-31T00:00:00Z"),
    quota: null,
    usedCount: 0,
    perUser: 1,
    userRedemptions: 0,
    ...overrides,
  }
}

describe("computeVoucherDiscount", () => {
  it("menghitung persen dari subtotal", () => {
    expect(computeVoucherDiscount({ type: "PERCENT", value: 20, maxDiscount: null }, 500_000)).toBe(
      100_000
    )
  })

  it("membatasi persen dengan plafon", () => {
    expect(
      computeVoucherDiscount({ type: "PERCENT", value: 50, maxDiscount: 40_000 }, 1_000_000)
    ).toBe(40_000)
  })

  it("potongan nominal tetap apa adanya", () => {
    expect(computeVoucherDiscount({ type: "FIXED", value: 25_000, maxDiscount: null }, 300_000)).toBe(
      25_000
    )
  })

  it("tidak pernah melebihi subtotal", () => {
    expect(computeVoucherDiscount({ type: "FIXED", value: 500_000, maxDiscount: null }, 100_000)).toBe(
      100_000
    )
  })

  it("pembulatan ke bawah agar toko tidak menanggung kelebihan", () => {
    // 15% dari 99.999 = 14.999,85 → 14.999
    expect(computeVoucherDiscount({ type: "PERCENT", value: 15, maxDiscount: null }, 99_999)).toBe(
      14_999
    )
  })

  it("mengembalikan 0 untuk nilai tidak masuk akal", () => {
    expect(computeVoucherDiscount({ type: "PERCENT", value: 0, maxDiscount: null }, 100_000)).toBe(0)
    expect(computeVoucherDiscount({ type: "PERCENT", value: 10, maxDiscount: null }, 0)).toBe(0)
    expect(computeVoucherDiscount({ type: "PERCENT", value: 10, maxDiscount: null }, Number.NaN)).toBe(
      0
    )
  })
})

describe("checkVoucher", () => {
  it("menerima voucher yang sah dan menghitung potongannya", () => {
    const result = checkVoucher(baseVoucher(), 500_000, null, NOW)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.discount).toBe(100_000)
  })

  it("menolak voucher tidak aktif", () => {
    const result = checkVoucher(baseVoucher({ isActive: false }), 500_000, null, NOW)
    expect(result).toEqual({ ok: false, reason: "Voucher sudah tidak aktif" })
  })

  it("menolak voucher yang belum berlaku", () => {
    const result = checkVoucher(
      baseVoucher({ startsAt: new Date("2026-06-01T00:00:00Z") }),
      500_000,
      null,
      NOW
    )
    expect(result).toEqual({ ok: false, reason: "Voucher belum berlaku" })
  })

  it("menolak voucher kedaluwarsa", () => {
    const result = checkVoucher(
      baseVoucher({ endsAt: new Date("2026-02-01T00:00:00Z") }),
      500_000,
      null,
      NOW
    )
    expect(result).toEqual({ ok: false, reason: "Voucher sudah kedaluwarsa" })
  })

  it("menolak voucher yang kuotanya habis", () => {
    const result = checkVoucher(baseVoucher({ quota: 10, usedCount: 10 }), 500_000, null, NOW)
    expect(result).toEqual({ ok: false, reason: "Kuota voucher sudah habis" })
  })

  it("membedakan batas sekali pakai dan batas berulang", () => {
    const once = checkVoucher(baseVoucher({ perUser: 1, userRedemptions: 1 }), 500_000, null, NOW)
    expect(once).toEqual({ ok: false, reason: "Voucher ini hanya bisa dipakai sekali" })

    const thrice = checkVoucher(
      baseVoucher({ perUser: 3, userRedemptions: 3 }),
      500_000,
      null,
      NOW
    )
    expect(thrice).toEqual({ ok: false, reason: "Voucher ini maksimal dipakai 3 kali" })
  })

  it("menolak subtotal di bawah minimum, dengan nominal yang bisa dibaca", () => {
    const result = checkVoucher(baseVoucher({ minSpend: 300_000 }), 150_000, null, NOW)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toContain("300.000")
  })

  it("menolak voucher yang terikat kota lain", () => {
    const result = checkVoucher(
      baseVoucher({ scopeCity: "kabupaten belitung" }),
      500_000,
      "pangkal pinang",
      NOW
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/hanya berlaku di Kabupaten Belitung/i)
  })

  it("mencocokkan kota tanpa peduli kapitalisasi", () => {
    const result = checkVoucher(
      baseVoucher({ scopeCity: "Pangkal Pinang" }),
      500_000,
      "pangkal pinang",
      NOW
    )
    expect(result.ok).toBe(true)
  })

  it("tidak menolak voucher tanpa batas kota meski kota pesanan tidak diketahui", () => {
    expect(checkVoucher(baseVoucher(), 500_000, null, NOW).ok).toBe(true)
  })
})

describe("totalAfterDiscount", () => {
  it("mengurangi subtotal dengan potongan", () => {
    expect(totalAfterDiscount(500_000, 100_000)).toBe(400_000)
  })

  it("tidak pernah negatif", () => {
    expect(totalAfterDiscount(100_000, 250_000)).toBe(0)
  })

  it("membulatkan ke rupiah penuh", () => {
    expect(totalAfterDiscount(99_999.4, 0)).toBe(99_999)
  })
})
