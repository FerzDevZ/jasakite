import { existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  DEFAULT_COMMISSION_PERCENT,
  PLATFORM_QRIS,
  canProviderStart,
  paymentDisplayLabel,
  commissionPercent,
  computeOrderSplit,
  isAllowedProofImage,
  normalizePaymentMethod,
  paymentMethodLabel,
  payoutBreakdown,
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
  it("default 0 — sistem komisi dinonaktifkan pemilik (2026-10-24)", () => {
    delete process.env.PLATFORM_COMMISSION_PERCENT
    expect(commissionPercent()).toBe(DEFAULT_COMMISSION_PERCENT)
    expect(DEFAULT_COMMISSION_PERCENT).toBe(0)
    // Tanpa env: seluruh nilai mengalir ke penyedia.
    expect(computeOrderSplit(150_000)).toEqual({
      platformFee: 0,
      providerPayout: 150_000,
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

  it("nilai tersimpan diabaikan — selalu persentase berjalan (komisi nonaktif)", () => {
    // Sejak komisi dinonaktifkan, pesanan tertentu yang tersimpan 10% tidak
    // boleh tetap dipotong saat selesai: sistemnya sudah dimatikan pemilik.
    process.env.PLATFORM_COMMISSION_PERCENT = "50"
    expect(resolveOrderSplit(100_000, 10_000, 90_000)).toEqual({
      platformFee: 50_000,
      providerPayout: 50_000,
    })
  })

  it("tanpa env, resolve menormalkan pesanan lama ke 0/total", () => {
    delete process.env.PLATFORM_COMMISSION_PERCENT
    expect(resolveOrderSplit(100_000, 10_000, 90_000)).toEqual({
      platformFee: 0,
      providerPayout: 100_000,
    })
  })
})

describe("rincian payout", () => {
  it("menandai pembagian yang konsisten dan menjumlah tepat", () => {
    expect(payoutBreakdown(100_000, 10_000, 90_000)).toEqual({
      totalPrice: 100_000,
      platformFee: 10_000,
      providerPayout: 90_000,
      recorded: true,
    })
  })

  it("menerima komisi 0% sebagai pembagian yang sah", () => {
    expect(payoutBreakdown(100_000, 0, 100_000).recorded).toBe(true)
  })

  it("tidak mengarang pembagian untuk pesanan lama 0/0", () => {
    expect(payoutBreakdown(100_000, 0, 0)).toEqual({
      totalPrice: 100_000,
      platformFee: 0,
      providerPayout: 0,
      recorded: false,
    })
  })

  it("menandai nilai tidak konsisten sebagai tidak tercatat", () => {
    expect(payoutBreakdown(100_000, 10_000, 80_000).recorded).toBe(false)
  })

  it("membulatkan dan menolak nilai negatif", () => {
    expect(payoutBreakdown(100_000.4, -1, 99_999.6)).toEqual({
      totalPrice: 100_000,
      platformFee: 0,
      providerPayout: 100_000,
      recorded: true,
    })
  })
})

describe("metode & status pembayaran", () => {
  it("menerima alias transfer lama sebagai QRIS", () => {
    expect(normalizePaymentMethod("transfer")).toBe("qris")
    expect(normalizePaymentMethod("qris")).toBe("qris")
    expect(normalizePaymentMethod("saldo")).toBe("saldo")
  })

  it("menerima tunai dan menolak yang tak bisa diverifikasi", () => {
    expect(normalizePaymentMethod("cash")).toBe("cash")
    expect(normalizePaymentMethod("cod")).toBeNull()
    expect(normalizePaymentMethod("ewallet")).toBeNull()
    expect(normalizePaymentMethod(undefined)).toBeNull()
  })

  it("label metode tidak pernah kosong untuk nilai tak dikenal", () => {
    expect(paymentMethodLabel("qris")).toMatch(/QRIS/)
    expect(paymentMethodLabel(null)).toBe("—")
    expect(paymentMethodLabel("lain")).toBe("lain")
  })

  it("penyedia hanya boleh mulai setelah PAID — kecuali pesanan tunai", () => {
    expect(canProviderStart("PAID")).toBe(true)
    expect(canProviderStart("UNPAID")).toBe(false)
    expect(canProviderStart("WAITING_VERIFICATION")).toBe(false)
    expect(canProviderStart("REFUNDED")).toBe(false)
    // Tunai: tidak ada dana ditahan platform, gerbang escrow dilonggarkan.
    expect(canProviderStart("UNPAID", "cash")).toBe(true)
    expect(canProviderStart("WAITING_VERIFICATION", "cash")).toBe(true)
    // Metode lain tetap ketat.
    expect(canProviderStart("UNPAID", "qris")).toBe(false)
    expect(canProviderStart("", undefined)).toBe(false)
  })

  it("label status pembayaran sadar metode tunai", () => {
    expect(paymentDisplayLabel("UNPAID", "cash")).toMatch(/Tunai/)
    expect(paymentDisplayLabel("PAID", "cash")).toMatch(/tunai/i)
    expect(paymentDisplayLabel("UNPAID", "qris")).toMatch(/Belum/)
    expect(paymentDisplayLabel("PAID", undefined)).toMatch(/terverifikasi/)
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
