import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { deriveTotpEncryptionKey, encryptTotpSecret, generateTotpSecret, totpCodeAt } from "@/lib/totp"

// Prisma palsu: guard hanya butuh dua operasi, jadi tidak perlu database nyata.
const userStore = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userStore.findUnique,
      updateMany: userStore.updateMany,
    },
  },
}))

const { requireMoneyAccess } = await import("@/lib/totp-guard")

const STUB_AUTH_SECRET = "rahasia-uji-totp-yang-panjang-sekali"
const encryptionKey = deriveTotpEncryptionKey(STUB_AUTH_SECRET)
const totpSecret = generateTotpSecret()
const encryptedSecret = encryptTotpSecret(totpSecret, encryptionKey)
const now = new Date()

function account(overrides: Record<string, unknown> = {}) {
  return {
    role: "SUPER_ADMIN",
    totpEnabledAt: new Date(now.getTime() - 60_000),
    totpSecret: encryptedSecret,
    totpLastUsedAt: null,
    ...overrides,
  }
}

beforeEach(() => {
  process.env.AUTH_SECRET = STUB_AUTH_SECRET
  userStore.findUnique.mockReset()
  userStore.updateMany.mockReset()
  userStore.updateMany.mockResolvedValue({ count: 1 })
})

afterEach(() => {
  delete process.env.AUTH_SECRET
})

describe("requireMoneyAccess", () => {
  it("mengembalikan 404 bila akun tidak ada", async () => {
    userStore.findUnique.mockResolvedValue(null)
    const denied = await requireMoneyAccess("507f1f77bcf86cd799439011", "123456")
    expect(denied?.status).toBe(404)
  })

  it("menolak ADMIN biasa walau kodenya sah", async () => {
    userStore.findUnique.mockResolvedValue(account({ role: "ADMIN" }))
    const denied = await requireMoneyAccess(
      "507f1f77bcf86cd799439011",
      totpCodeAt(totpSecret, new Date())
    )
    expect(denied?.status).toBe(403)
    expect(await denied?.json()).toMatchObject({ error: expect.stringContaining("SUPER_ADMIN") })
    // Tidak boleh ada klaim langkah waktu untuk permintaan yang ditolak.
    expect(userStore.updateMany).not.toHaveBeenCalled()
  })

  it("meminta pendaftaran 2FA bila belum aktif", async () => {
    userStore.findUnique.mockResolvedValue(
      account({ totpEnabledAt: null, totpSecret: null })
    )
    const denied = await requireMoneyAccess("507f1f77bcf86cd799439011", "123456")
    expect(denied?.status).toBe(403)
    expect(await denied?.json()).toMatchObject({
      code: "totp_setup_required",
      requiresTotpSetup: true,
    })
  })

  it("menolak kode kosong dengan 400", async () => {
    userStore.findUnique.mockResolvedValue(account())
    const denied = await requireMoneyAccess("507f1f77bcf86cd799439011", "   ")
    expect(denied?.status).toBe(400)
    expect(await denied?.json()).toMatchObject({ code: "totp_required" })
  })

  it("menolak kode salah dengan 401", async () => {
    userStore.findUnique.mockResolvedValue(account())
    const wrongCode = totpCodeAt(totpSecret, now) === "000000" ? "000001" : "000000"
    const denied = await requireMoneyAccess("507f1f77bcf86cd799439011", wrongCode)
    expect(denied?.status).toBe(401)
    expect(await denied?.json()).toMatchObject({ code: "totp_invalid" })
  })

  it("mengizinkan kode sah dan menandai langkah waktunya", async () => {
    userStore.findUnique.mockResolvedValue(account())
    const validCode = totpCodeAt(totpSecret, new Date())
    const denied = await requireMoneyAccess("507f1f77bcf86cd799439011", validCode)
    expect(denied).toBeNull()
    expect(userStore.updateMany).toHaveBeenCalledTimes(1)
    const updateArgs = userStore.updateMany.mock.calls[0][0]
    expect(updateArgs.data.totpLastUsedAt).toBeInstanceOf(Date)
  })

  it("menolak kode yang sudah dipakai (klaim kalah balapan)", async () => {
    userStore.findUnique.mockResolvedValue(account())
    userStore.updateMany.mockResolvedValue({ count: 0 })
    const validCode = totpCodeAt(totpSecret, new Date())
    const denied = await requireMoneyAccess("507f1f77bcf86cd799439011", validCode)
    expect(denied?.status).toBe(401)
    expect(await denied?.json()).toMatchObject({ code: "totp_replayed" })
  })

  it("gagal-tertutup bila AUTH_SECRET tidak tersedia", async () => {
    delete process.env.AUTH_SECRET
    userStore.findUnique.mockResolvedValue(account())
    const denied = await requireMoneyAccess(
      "507f1f77bcf86cd799439011",
      totpCodeAt(totpSecret, new Date())
    )
    expect(denied?.status).toBe(500)
    expect(userStore.updateMany).not.toHaveBeenCalled()
  })
})
