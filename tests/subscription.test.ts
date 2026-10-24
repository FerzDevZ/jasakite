import { describe, expect, it } from "vitest"
import {
  DEFAULT_MONTHLY_PRICE,
  MAX_MONTHLY_PRICE,
  MIN_MONTHLY_PRICE,
  SUBSCRIPTION_PERIOD_DAYS,
  canChargeSubscription,
  daysLeft,
  describeSubscription,
  formatRupiah,
  isDueForRenewal,
  isSubscriptionActive,
  nextPeriodStart,
  parseMonthlyPrice,
  periodEndFrom,
  planCharge,
  subscriptionState,
  subscriptionStateLabel,
} from "@/lib/subscription"
import { buildServicesWhere } from "@/lib/services-query"

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = new Date("2026-10-24T10:00:00.000Z")

describe("harga langganan penyedia", () => {
  it("memakai Rp10.000 sebagai harga bawaan", () => {
    expect(DEFAULT_MONTHLY_PRICE).toBe(10_000)
    expect(formatRupiah(DEFAULT_MONTHLY_PRICE)).toBe("Rp10.000")
  })

  it("menerima angka dan string dari form admin", () => {
    expect(parseMonthlyPrice(15_000)).toEqual({ ok: true, price: 15_000 })
    expect(parseMonthlyPrice(" 15000 ")).toEqual({ ok: true, price: 15_000 })
  })

  it("menolak harga di luar batas, desimal, dan bukan angka", () => {
    expect(parseMonthlyPrice(MIN_MONTHLY_PRICE - 1).ok).toBe(false)
    expect(parseMonthlyPrice(MAX_MONTHLY_PRICE + 1).ok).toBe(false)
    expect(parseMonthlyPrice(10_500.5).ok).toBe(false)
    expect(parseMonthlyPrice("sepuluh ribu").ok).toBe(false)
    expect(parseMonthlyPrice(null).ok).toBe(false)
  })

  it("menyebut batas yang dilanggar agar admin tahu cara memperbaikinya", () => {
    const tooLow = parseMonthlyPrice(500)
    const tooHigh = parseMonthlyPrice(9_000_000)
    expect(tooLow.ok).toBe(false)
    expect(tooHigh.ok).toBe(false)
    if (!tooLow.ok) expect(tooLow.error).toContain("minimal")
    if (!tooHigh.ok) expect(tooHigh.error).toContain("maksimal")
  })
})

describe("masa aktif langganan", () => {
  it("menghitung satu periode 30 hari", () => {
    const end = periodEndFrom(NOW)
    expect(end.getTime() - NOW.getTime()).toBe(SUBSCRIPTION_PERIOD_DAYS * DAY_MS)
  })

  it("membedakan belum berlangganan, aktif, dan berakhir", () => {
    expect(subscriptionState(null, NOW)).toBe("NEVER")
    expect(subscriptionState(new Date(NOW.getTime() + DAY_MS), NOW)).toBe("ACTIVE")
    expect(subscriptionState(new Date(NOW.getTime() - 1), NOW)).toBe("EXPIRED")
  })

  it("menyebut tanggal berakhir, bukan status mentah", () => {
    expect(subscriptionStateLabel(null, NOW)).toBe("Belum berlangganan")
    expect(subscriptionStateLabel(new Date("2026-11-23T10:00:00.000Z"), NOW)).toBe(
      "Aktif sampai 23 Nov 2026"
    )
    expect(subscriptionStateLabel(new Date("2026-10-20T10:00:00.000Z"), NOW)).toBe(
      "Berakhir 20 Okt 2026"
    )
  })

  it("menghitung sisa hari dibulatkan ke atas dan nol setelah lewat", () => {
    // Masih ada satu milidetik berarti masih ada hari yang dibayar; `ceil`
    // menjaga penyedia tidak kehilangan tayangan beberapa jam lebih awal.
    expect(daysLeft(new Date(NOW.getTime() + 1), NOW)).toBe(1)
    expect(daysLeft(new Date(NOW.getTime() + 2 * DAY_MS), NOW)).toBe(2)
    expect(daysLeft(new Date(NOW.getTime() - DAY_MS), NOW)).toBe(0)
    expect(daysLeft(null, NOW)).toBe(0)
  })

  it("hanya mengizinkan tayang saat masa aktif masih di depan", () => {
    expect(isSubscriptionActive(null, NOW)).toBe(false)
    expect(describeSubscription(null, NOW).canPublish).toBe(false)
    expect(
      describeSubscription(new Date(NOW.getTime() + DAY_MS), NOW).canPublish
    ).toBe(true)
  })
})

describe("perpanjangan dan auto-debit", () => {
  it("melanjutkan dari sisa masa aktif, bukan dari hari ini", () => {
    const until = new Date(NOW.getTime() + 10 * DAY_MS)
    expect(nextPeriodStart(until, NOW)).toEqual(until)
    expect(nextPeriodStart(new Date(NOW.getTime() - DAY_MS), NOW)).toEqual(NOW)
    expect(nextPeriodStart(null, NOW)).toEqual(NOW)
  })

  it("menambah 30 hari di atas sisa masa aktif saat memperpanjang lebih awal", () => {
    const until = new Date(NOW.getTime() + 10 * DAY_MS)
    const plan = planCharge(until, DEFAULT_MONTHLY_PRICE, NOW)
    expect(plan.periodStart).toEqual(until)
    expect(plan.periodEnd.getTime() - until.getTime()).toBe(
      SUBSCRIPTION_PERIOD_DAYS * DAY_MS
    )
  })

  it("hanya menagih bila saldo cukup", () => {
    expect(canChargeSubscription(10_000, 10_000)).toBe(true)
    expect(canChargeSubscription(9_999, 10_000)).toBe(false)
    expect(canChargeSubscription(0, 10_000)).toBe(false)
    expect(canChargeSubscription(Number.NaN, 10_000)).toBe(false)
  })

  it("tidak pernah menagih akun yang belum berlangganan", () => {
    expect(isDueForRenewal(null, NOW)).toBe(false)
    expect(isDueForRenewal(new Date(NOW.getTime() + 60 * DAY_MS), NOW)).toBe(false)
  })

  it("menagih mulai dua hari sebelum berakhir", () => {
    expect(isDueForRenewal(new Date(NOW.getTime() + 2 * DAY_MS), NOW)).toBe(true)
    expect(isDueForRenewal(new Date(NOW.getTime() + 3 * DAY_MS), NOW)).toBe(false)
    expect(isDueForRenewal(new Date(NOW.getTime() - DAY_MS), NOW)).toBe(true)
  })
})

describe("katalog hanya memuat jasa penyedia berlangganan", () => {
  it("menambahkan saringan langganan pada query katalog", () => {
    const where = buildServicesWhere({})
    const provider = where.provider as {
      subscriptionUntil?: { gt?: Date }
    }
    expect(provider?.subscriptionUntil?.gt).toBeInstanceOf(Date)
  })

  it("tidak menghapus saringan langganan saat filter lokasi dipakai", () => {
    const where = buildServicesWhere({ location: "Pangkal Pinang" })
    const provider = where.provider as {
      city?: unknown
      subscriptionUntil?: { gt?: Date }
    }
    expect(provider?.city).toBeDefined()
    expect(provider?.subscriptionUntil?.gt).toBeInstanceOf(Date)
  })
})
