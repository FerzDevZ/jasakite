import { existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  DEFAULT_COMMISSION_PERCENT,
  PLATFORM_QRIS,
  canProviderStart,
  commissionPercent,
  computeOrderSplit,
  isAllowedProofImage,
  normalizePaymentMethod,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusTone,
  resolveOrderSplit,
} from "@/lib/payments"

const ORIGINAL_PERCENT = process.env.PLATFORM_COMMISSION_PERCENT

afterEach(() => {
  if (ORIGINAL_PERCENT === undefined) delete process.env.PLATFORM_COMMISSION_PERCENT
  else process.env.PLATFORM_COMMISSION_PERCENT = ORIGINAL_PERCENT
})

describe("komisi platform", () => {
  it("memakai 10% sebagai default", () => {
    delete process.env.PLATFORM_COMMISSION_PERCENT
    expect(commissionPercent()).toBe(DEFAULT_COMMISSION_PERCENT)
    expect(computeOrderSplit(150_000)).toEqual({
      platformFee: 15_000,
      providerPayout: 135_000,
    })
  })

  it("membaca persentase dari env dan membatasinya di 50%", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "15"
    expect(commissionPercent()).toBe(15)
    process.env.PLATFORM_COMMISSION_PERCENT = "999"
    expect(commissionPercent()).toBe(50)
    process.env.PLATFORM_COMMISSION_PERCENT = "-5"
    expect(commissionPercent()).toBe(DEFAULT_COMMISSION_PERCENT)
  })

  it("komisi + payout selalu sama dengan total setelah pembulatan", () => {
    for (const total of [1, 999, 12_345, 87_654, 1_000_001]) {
      for (const percent of [0, 5, 10, 12.5, 33, 50]) {
        const split = computeOrderSplit(total, percent)
        expect(split.platformFee + split.providerPayout).toBe(total)
        expect(split.platformFee).toBeGreaterThanOrEqual(0)
        expect(split.providerPayout).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("total tidak sah menghasilkan nol, bukan NaN atau minus", () => {
    expect(computeOrderSplit(Number.NaN)).toEqual({ platformFee: 0, providerPayout: 0 })
    expect(computeOrderSplit(-10)).toEqual({ platformFee: 0, providerPayout: 0 })
  })

  it("pembagian tersimpan menang atas persentase saat ini", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "50"
    expect(resolveOrderSplit(100_000, 10_000, 90_000)).toEqual({
      platformFee: 10_000,
      providerPayout: 90_000,
    })
  })

  it("pesanan lama tanpa pembagian dihitung ulang dengan persentase berjalan", () => {
    process.env.PLATFORM_COMMISSION_PERCENT = "10"
    expect(resolveOrderSplit(100_000, 0, 0)).toEqual({
      platformFee: 10_000,
      providerPayout: 90_000,
    })
  })
})

describe("metode & status pembayaran", () => {
  it("menerima alias transfer lama sebagai QRIS", () => {
    expect(normalizePaymentMethod("transfer")).toBe("qris")
    expect(normalizePaymentMethod("qris")).toBe("qris")
    expect(normalizePaymentMethod("saldo")).toBe("saldo")
  })

  it("menolak metode yang tidak bisa diverifikasi", () => {
    expect(normalizePaymentMethod("cod")).toBeNull()
    expect(normalizePaymentMethod("ewallet")).toBeNull()
    expect(normalizePaymentMethod(undefined)).toBeNull()
  })

  it("label metode tidak pernah kosong untuk nilai tak dikenal", () => {
    expect(paymentMethodLabel("qris")).toMatch(/QRIS/)
    expect(paymentMethodLabel(null)).toBe("—")
    expect(paymentMethodLabel("lain")).toBe("lain")
  })

  it("penyedia hanya boleh mulai setelah PAID", () => {
    expect(canProviderStart("PAID")).toBe(true)
    expect(canProviderStart("UNPAID")).toBe(false)
    expect(canProviderStart("WAITING_VERIFICATION")).toBe(false)
    expect(canProviderStart("REFUNDED")).toBe(false)
  })

  it("status pembayaran punya label dan tone untuk semua nilai", () => {
    expect(paymentStatusLabel("UNPAID")).toMatch(/Belum/)
    expect(paymentStatusTone("PAID")).toBe("success")
    expect(paymentStatusTone("tidak-dikenal")).toBe("muted")
  })
})

describe("bukti transfer", () => {
  it("menerima data URI gambar raster dan URL https", () => {
    expect(isAllowedProofImage("data:image/jpeg;base64,AAAA")).toBe(true)
    expect(isAllowedProofImage("https://cdn.example.com/bukti.jpg")).toBe(true)
  })

  it("menolak SVG, HTML, kosong, dan payload kebesaran", () => {
    expect(isAllowedProofImage("data:image/svg+xml;base64,AAAA")).toBe(false)
    expect(isAllowedProofImage("data:text/html;base64,AAAA")).toBe(false)
    expect(isAllowedProofImage("")).toBe(false)
    expect(isAllowedProofImage(null)).toBe(false)
    expect(isAllowedProofImage(`https://a.test/${"x".repeat(300_000)}`)).toBe(false)
  })
})

describe("aset QRIS platform", () => {
  it("berkas QRIS yang dirujuk benar-benar ada dan cukup kecil untuk bundel", () => {
    const assetPath = join(process.cwd(), "public", PLATFORM_QRIS.imagePath)
    expect(existsSync(assetPath)).toBe(true)
    expect(statSync(assetPath).size).toBeLessThan(768 * 1024)
    expect(PLATFORM_QRIS.merchantName.length).toBeGreaterThan(0)
    expect(PLATFORM_QRIS.nmid).toMatch(/^ID\d+$/)
  })
})
