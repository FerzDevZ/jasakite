import { describe, expect, it } from "vitest"
import {
  TOTP_PERIOD_SECONDS,
  base32Decode,
  base32Encode,
  buildTotpUri,
  decryptTotpSecret,
  deriveTotpEncryptionKey,
  encryptTotpSecret,
  findTotpMatch,
  generateTotpSecret,
  totpCodeAt,
  totpCounter,
} from "@/lib/totp"
import { decideMoneyAccess } from "@/lib/totp-guard"

// Vector RFC 4648: "123456789" → "GEZDGNBVGY3TQOJQ". Dua kali pengulangan
// menghasilkan secret ASCII uji milik RFC 6238 Appendix B.
const RFC_SECRET_ASCII = "12345678901234567890"
const RFC_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

const ENCRYPTION_KEY = deriveTotpEncryptionKey("kunci-uji-yang-cukup-panjang-32")

function atSeconds(seconds: number): Date {
  return new Date(seconds * 1000)
}

describe("base32", () => {
  it("mengodekan secret uji RFC 4648 dengan benar", () => {
    expect(base32Encode(Buffer.from(RFC_SECRET_ASCII, "ascii"))).toBe(RFC_SECRET_BASE32)
  })

  it("bolak-balik encode/decode menghasilkan byte yang sama", () => {
    const encoded = generateTotpSecret()
    expect(encoded).toMatch(/^[A-Z2-7]+$/)
    expect(base32Encode(base32Decode(encoded))).toBe(encoded)
  })

  it("menolak karakter di luar alfabet base32", () => {
    expect(() => base32Decode("GEZD1NBV")).toThrow(/base32/)
  })
})

describe("TOTP RFC 6238", () => {
  // Appendix B (SHA1, 8 digit). Termasuk 20000000000 yang counter-nya melewati
  // 32 bit — memastikan penulisan counter 8 byte tidak terpotong.
  const vectors: Array<{ seconds: number; expected: string }> = [
    { seconds: 59, expected: "94287082" },
    { seconds: 1111111109, expected: "07081804" },
    { seconds: 1111111111, expected: "14050471" },
    { seconds: 1234567890, expected: "89005924" },
    { seconds: 2000000000, expected: "69279037" },
    { seconds: 20000000000, expected: "65353130" },
  ]

  for (const vector of vectors) {
    it(`cocok pada t=${vector.seconds}`, () => {
      expect(
        totpCodeAt(RFC_SECRET_BASE32, atSeconds(vector.seconds), { digits: 8 })
      ).toBe(vector.expected)
    })
  }

  it("menghitung counter dari periode 30 detik", () => {
    expect(totpCounter(new Date(0))).toBe(0)
    expect(totpCounter(new Date((TOTP_PERIOD_SECONDS - 0.001) * 1000))).toBe(0)
    expect(totpCounter(new Date(TOTP_PERIOD_SECONDS * 1000))).toBe(1)
  })
})

describe("findTotpMatch", () => {
  const secret = generateTotpSecret()
  const now = 1_700_000_010_000 // awal sebuah periode
  const currentCode = totpCodeAt(secret, new Date(now))

  it("menerima kode periode saat ini", () => {
    const match = findTotpMatch(secret, currentCode, new Date(now))
    expect(match?.stepStartedAt.getTime()).toBe(now)
  })

  it("menerima satu langkah ke belakang dan ke depan", () => {
    const previousCode = totpCodeAt(secret, new Date(now - 30_000))
    const nextCode = totpCodeAt(secret, new Date(now + 30_000))

    expect(findTotpMatch(secret, previousCode, new Date(now))).not.toBeNull()
    expect(findTotpMatch(secret, nextCode, new Date(now))).not.toBeNull()
  })

  it("menolak kode dua langkah di luar jendela", () => {
    const staleCode = totpCodeAt(secret, new Date(now - 90_000))
    expect(findTotpMatch(secret, staleCode, new Date(now))).toBeNull()
  })

  it("menolak kode yang bukan 6 digit", () => {
    expect(findTotpMatch(secret, "12345", new Date(now))).toBeNull()
    expect(findTotpMatch(secret, "abcdef", new Date(now))).toBeNull()
  })

  it("menerima kode yang dikirim dengan spasi", () => {
    const spaced = `${currentCode.slice(0, 3)} ${currentCode.slice(3)}`
    expect(findTotpMatch(secret, spaced, new Date(now))).not.toBeNull()
  })
})

describe("buildTotpUri", () => {
  it("menyusun URI otpauth yang bisa dipindai", () => {
    // Label di-encode oleh buildTotpUri; jangan menuliskan bentuk ter-encode-nya
    // di sini karena tests/branding.test.ts memindai source untuk pola hostname
    // dan surel merek.
    const uri = buildTotpUri({
      base32Secret: RFC_SECRET_BASE32,
      accountName: "admin@jasakite.id",
    })
    expect(uri.startsWith("otpauth://totp/JASAKITE:")).toBe(true)
    expect(uri).toContain("admin")
    const params = new URL(uri).searchParams
    expect(params.get("secret")).toBe(RFC_SECRET_BASE32)
    expect(params.get("issuer")).toBe("JASAKITE")
    expect(params.get("digits")).toBe("6")
    expect(params.get("period")).toBe("30")
  })
})

describe("enkripsi secret", () => {
  it("bolak-balik mengembalikan secret asli", () => {
    const secret = generateTotpSecret()
    const payload = encryptTotpSecret(secret, ENCRYPTION_KEY)
    expect(decryptTotpSecret(payload, ENCRYPTION_KEY)).toBe(secret)
  })

  it("tidak menyimpan secret dalam bentuk terbaca", () => {
    const secret = generateTotpSecret()
    const payload = encryptTotpSecret(secret, ENCRYPTION_KEY)
    expect(payload.startsWith("v1.")).toBe(true)
    expect(payload).not.toContain(secret)
  })

  it("gagal bila payload diubah (GCM mengautentikasi ciphertext)", () => {
    const payload = encryptTotpSecret(generateTotpSecret(), ENCRYPTION_KEY)
    const [version, iv, tag, ciphertext] = payload.split(".")
    const flipped =
      ciphertext.slice(0, -1) + (ciphertext.endsWith("A") ? "B" : "A")
    const tampered = [version, iv, tag, flipped].join(".")
    expect(() => decryptTotpSecret(tampered, ENCRYPTION_KEY)).toThrow()
  })

  it("gagal dengan kunci lain", () => {
    const payload = encryptTotpSecret(generateTotpSecret(), ENCRYPTION_KEY)
    const otherKey = deriveTotpEncryptionKey("kunci-lain-yang-juga-panjang")
    expect(() => decryptTotpSecret(payload, otherKey)).toThrow()
  })
})

describe("decideMoneyAccess", () => {
  const secret = generateTotpSecret()
  const now = new Date(1_700_000_010_000)
  const encryptedSecret = encryptTotpSecret(secret, ENCRYPTION_KEY)
  const validCode = totpCodeAt(secret, now)

  const superAdmin = {
    role: "SUPER_ADMIN",
    totpEnabledAt: new Date(now.getTime() - 86_400_000),
    totpSecret: encryptedSecret,
    totpLastUsedAt: null,
  }

  it("menolak peran selain SUPER_ADMIN walau kode benar", () => {
    const decision = decideMoneyAccess({
      account: { ...superAdmin, role: "ADMIN" },
      submittedCode: validCode,
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    expect(decision.kind).toBe("forbidden")
  })

  it("mewajibkan pendaftaran bila 2FA belum aktif", () => {
    const decision = decideMoneyAccess({
      account: { ...superAdmin, totpEnabledAt: null },
      submittedCode: validCode,
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    expect(decision.kind).toBe("setup-required")
  })

  it("membedakan kode kosong dari kode salah", () => {
    const withoutCode = decideMoneyAccess({
      account: superAdmin,
      submittedCode: "",
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    const wrongCode = decideMoneyAccess({
      account: superAdmin,
      submittedCode: "000000",
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    expect(withoutCode.kind).toBe("code-missing")
    // "000000" bisa kebetulan cocok; kalau begitu jangan menguji yang salah.
    if (validCode !== "000000") expect(wrongCode.kind).toBe("invalid-code")
  })

  it("mengizinkan kode sah dan melaporkan langkah waktunya", () => {
    const decision = decideMoneyAccess({
      account: superAdmin,
      submittedCode: validCode,
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    expect(decision.kind).toBe("allow")
    if (decision.kind === "allow") {
      expect(decision.stepStartedAt.getTime()).toBe(now.getTime())
    }
  })

  it("menolak kode yang langkahnya sudah pernah dipakai", () => {
    const decision = decideMoneyAccess({
      account: { ...superAdmin, totpLastUsedAt: now },
      submittedCode: validCode,
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    expect(decision.kind).toBe("code-already-used")
  })

  it("mengizinkan kode periode berikutnya setelah langkah lama terpakai", () => {
    const later = new Date(now.getTime() + 30_000)
    const decision = decideMoneyAccess({
      account: { ...superAdmin, totpLastUsedAt: now },
      submittedCode: totpCodeAt(secret, later),
      encryptionKey: ENCRYPTION_KEY,
      at: later,
    })
    expect(decision.kind).toBe("allow")
  })

  it("gagal-tertutup bila secret tidak bisa didekripsi", () => {
    const decision = decideMoneyAccess({
      account: { ...superAdmin, totpSecret: "v1.bukan.payload" },
      submittedCode: validCode,
      encryptionKey: ENCRYPTION_KEY,
      at: now,
    })
    expect(decision.kind).toBe("misconfigured")
  })
})
