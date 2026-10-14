import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Kode pesanan diuji dengan Prisma yang dimock: satu-satunya ketergantungan
 * modul ini adalah pemeriksaan keunikan ke database, dan menghubungkan klien
 * nyata dari unit test justru membuat tes gagal di mesin tanpa DATABASE_URL.
 */
vi.mock("@/lib/prisma", () => {
  const findFirst = vi.fn()
  const client = { order: { findFirst } }
  return { prisma: client, default: client }
})

import { prisma } from "@/lib/prisma"
import { generateOrderCode, isOrderCode } from "@/lib/order-code"

const findFirst = vi.mocked(prisma.order.findFirst)

describe("isOrderCode", () => {
  it("menerima kode pesanan ber-prefix JK", () => {
    expect(isOrderCode("JK-23456")).toBe(true)
    expect(isOrderCode("JK-ABCDEF")).toBe(true)
  })

  it("menerima huruf kecil dan spasi di ujung — input pencarian manusia", () => {
    expect(isOrderCode("jk-abcde")).toBe(true)
    expect(isOrderCode("  JK-23467  ")).toBe(true)
  })

  it("menolak bentuk yang bukan kode pesanan", () => {
    for (const value of [
      "",
      "   ",
      "23456",
      "XX-23456",
      "JK-234",
      "JK-ABCDEFGHI",
      "JK-234 56",
      "JK-23456789012",
    ]) {
      expect(isOrderCode(value), value).toBe(false)
    }
  })
})

describe("generateOrderCode", () => {
  beforeEach(() => {
    findFirst.mockReset()
    findFirst.mockResolvedValue(null)
  })

  it("menghasilkan kode yang lolos validasi dan dicari ulang ke database", async () => {
    const code = await generateOrderCode()

    expect(code).toMatch(/^JK-[A-Z0-9]{5}$/)
    expect(isOrderCode(code)).toBe(true)
    expect(findFirst).toHaveBeenCalledWith({
      where: { code },
      select: { id: true },
    })
  })

  it("tidak pernah memakai karakter yang mudah tertukar saat dibacakan", async () => {
    for (let i = 0; i < 200; i++) {
      const code = await generateOrderCode()
      expect(code.slice(3)).not.toMatch(/[015ILOS]/)
    }
  })

  it("melewati kandidat yang sudah dipakai pesanan lain", async () => {
    findFirst.mockResolvedValueOnce({ id: "sudah-ada" } as never)

    const code = await generateOrderCode()

    expect(code).toMatch(/^JK-[A-Z0-9]{5}$/)
    expect(findFirst).toHaveBeenCalledTimes(2)
  })

  it("jatuh ke kode berbasis waktu bila lima percobaan bertabrakan", async () => {
    findFirst.mockResolvedValue({ id: "sudah-ada" } as never)

    const code = await generateOrderCode()

    expect(findFirst).toHaveBeenCalledTimes(5)
    expect(code.startsWith("JK-")).toBe(true)
    expect(isOrderCode(code)).toBe(true)
  })
})
