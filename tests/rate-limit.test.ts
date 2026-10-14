import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  RATE_LIMITS,
  __resetRateLimiter,
  clientKey,
  consume,
  rateLimitHeaders,
} from "@/lib/rate-limit"

const RULE = { limit: 3, windowMs: 60_000 }

beforeEach(() => {
  __resetRateLimiter()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"))
})

afterEach(() => {
  vi.useRealTimers()
})

describe("consume (token bucket)", () => {
  it("mengizinkan permintaan sampai batas kuota", () => {
    for (let i = 0; i < RULE.limit; i++) {
      expect(consume("a", RULE).ok).toBe(true)
    }
  })

  it("menolak permintaan setelah kuota habis", () => {
    for (let i = 0; i < RULE.limit; i++) consume("a", RULE)
    const blocked = consume("a", RULE)
    expect(blocked.ok).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("menghitung remaining secara menurun", () => {
    expect(consume("a", RULE).remaining).toBe(2)
    expect(consume("a", RULE).remaining).toBe(1)
    expect(consume("a", RULE).remaining).toBe(0)
  })

  it("memisahkan kuota antar key", () => {
    for (let i = 0; i < RULE.limit; i++) consume("a", RULE)
    expect(consume("a", RULE).ok).toBe(false)
    expect(consume("b", RULE).ok).toBe(true)
  })

  it("mengisi ulang token seiring waktu", () => {
    for (let i = 0; i < RULE.limit; i++) consume("a", RULE)
    expect(consume("a", RULE).ok).toBe(false)

    // Satu token terisi setelah windowMs / limit.
    vi.advanceTimersByTime(RULE.windowMs / RULE.limit)
    expect(consume("a", RULE).ok).toBe(true)
  })

  it("kuota penuh kembali setelah satu jendela penuh", () => {
    for (let i = 0; i < RULE.limit; i++) consume("a", RULE)
    vi.advanceTimersByTime(RULE.windowMs)
    for (let i = 0; i < RULE.limit; i++) {
      expect(consume("a", RULE).ok).toBe(true)
    }
  })

  it("tidak mengakumulasi token di atas limit saat idle panjang", () => {
    consume("a", RULE)
    vi.advanceTimersByTime(RULE.windowMs * 10)
    for (let i = 0; i < RULE.limit; i++) {
      expect(consume("a", RULE).ok).toBe(true)
    }
    expect(consume("a", RULE).ok).toBe(false)
  })
})

describe("clientKey", () => {
  it("memprioritaskan user id saat tersedia", () => {
    const req = new Request("http://localhost/api/x", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    })
    expect(clientKey(req, 42)).toBe("u:42")
  })

  it("memakai IP pertama dari x-forwarded-for untuk anonim", () => {
    const req = new Request("http://localhost/api/x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    expect(clientKey(req)).toBe("ip:1.2.3.4")
  })

  it("jatuh ke 'unknown' bila tidak ada header IP", () => {
    expect(clientKey(new Request("http://localhost/api/x"))).toBe("ip:unknown")
  })
})

describe("rateLimitHeaders", () => {
  it("menyertakan Retry-After hanya saat ditolak", () => {
    const allowed = consume("a", RULE)
    expect(rateLimitHeaders(allowed)).not.toHaveProperty("Retry-After")

    for (let i = 0; i < RULE.limit; i++) consume("a", RULE)
    const blocked = consume("a", RULE)
    expect(rateLimitHeaders(blocked)).toHaveProperty("Retry-After")
  })
})

describe("RATE_LIMITS", () => {
  it("semua aturan punya limit dan jendela yang positif", () => {
    for (const [name, rule] of Object.entries(RATE_LIMITS)) {
      expect(rule.limit, name).toBeGreaterThan(0)
      expect(rule.windowMs, name).toBeGreaterThan(0)
    }
  })

  it("pendaftaran akun lebih ketat dari pencarian", () => {
    const perMs = (r: { limit: number; windowMs: number }) =>
      r.limit / r.windowMs
    expect(perMs(RATE_LIMITS.register)).toBeLessThan(
      perMs(RATE_LIMITS.search)
    )
  })
})
