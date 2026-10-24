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

// Cookie palsu untuk jendela kepercayaan uang (next/headers di luar request
// melempar error — guard menelan error itu, tapi test jendela butuh isinya).
const cookieJar = vi.hoisted(() => ({
  store: new Map<string, string>(),
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieJar),
}))

const {
  requireMoneyAccess,
  signMoneyTrust,
  parseMoneyTrust,
  getMoneyTrustKey,
  MONEY_TRUST_WINDOW_MS,
} = await import("@/lib/totp-guard")

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
  cookieJar.store.clear()
  cookieJar.get.mockReset()
  cookieJar.set.mockReset()
  cookieJar.get.mockImplementation((name: string) =>
    cookieJar.store.has(name) ? { name, value: cookieJar.store.get(name) } : undefined
  )
  cookieJar.set.mockImplementation((name: string, value: string) => {
    cookieJar.store.set(name, value)
  })
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

describe("jendela kepercayaan uang (mode sudo 15 menit)", () => {
  const USER_ID = "507f1f77bcf86cd799439011"
  // Lazy: AUTH_SECRET baru di-set oleh beforeEach — jangan turunkan kunci di level modul.
  const trustKey = () => getMoneyTrustKey()

  it("token sah mengembalikan tanggal kedaluwarsa", () => {
    const until = Date.now() + 60_000
    const token = signMoneyTrust(USER_ID, until, trustKey())
    expect(parseMoneyTrust(token, trustKey(), USER_ID, new Date())).toEqual(new Date(until))
  })

  it("menolak token kedaluwarsa", () => {
    const token = signMoneyTrust(USER_ID, Date.now() - 1_000, trustKey())
    expect(parseMoneyTrust(token, trustKey(), USER_ID, new Date())).toBeNull()
  })

  it("menolak token milik pengguna lain", () => {
    const token = signMoneyTrust("user-lain", Date.now() + 60_000, trustKey())
    expect(parseMoneyTrust(token, trustKey(), USER_ID, new Date())).toBeNull()
  })

  it("menolak token yang tandatangannya dirusak", () => {
    const token = signMoneyTrust(USER_ID, Date.now() + 60_000, trustKey())
    const tampered = `${token.slice(0, -2)}xx`
    expect(parseMoneyTrust(tampered, trustKey(), USER_ID, new Date())).toBeNull()
  })

  it("menolak format aneh", () => {
    expect(parseMoneyTrust("bukan-token", trustKey(), USER_ID, new Date())).toBeNull()
    expect(parseMoneyTrust("a.b.c.d", trustKey(), USER_ID, new Date())).toBeNull()
  })

  it("jendela aktif: keputusan diizinkan TANPA kode dan tanpa klaim langkah", async () => {
    userStore.findUnique.mockResolvedValue(account())
    cookieJar.store.set(
      "jasakite-uang-trust",
      signMoneyTrust(USER_ID, Date.now() + 60_000, trustKey())
    )
    const denied = await requireMoneyAccess(USER_ID, "")
    expect(denied).toBeNull()
    // Tidak ada klaim TOTP — kode tidak dipakai sama sekali.
    expect(userStore.updateMany).not.toHaveBeenCalled()
  })

  it("jendela TIDAK melompati cek peran: ADMIN tetap ditolak", async () => {
    userStore.findUnique.mockResolvedValue(account({ role: "ADMIN" }))
    cookieJar.store.set(
      "jasakite-uang-trust",
      signMoneyTrust(USER_ID, Date.now() + 60_000, trustKey())
    )
    const denied = await requireMoneyAccess(USER_ID, "")
    expect(denied?.status).toBe(403)
  })

  it("kode sah memasang cookie jendela untuk keputusan berikutnya", async () => {
    userStore.findUnique.mockResolvedValue(account())
    const validCode = totpCodeAt(totpSecret, new Date())
    const denied = await requireMoneyAccess(USER_ID, validCode)
    expect(denied).toBeNull()
    expect(cookieJar.set).toHaveBeenCalledWith(
      "jasakite-uang-trust",
      expect.stringMatching(new RegExp(`^${USER_ID}\\.\\d+\\.`)),
      expect.objectContaining({ httpOnly: true })
    )
  })

  it("jendela selama konstanta 15 menit", () => {
    expect(MONEY_TRUST_WINDOW_MS).toBe(15 * 60 * 1000)
  })
})
