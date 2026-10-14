import { describe, expect, it } from "vitest"
import {
  MAX_PROOF_IMAGE_CHARS,
  PROOF_IMAGE_JPEG_QUALITY,
  PROOF_IMAGE_MAX_EDGE,
  computeEncodeQualitySteps,
  computeTargetDimensions,
  validateProofImage,
} from "@/lib/proof-image"
import {
  MIN_TOPUP_AMOUNT,
  MIN_WITHDRAW_AMOUNT,
  buildBankSnapshot,
  hasCompleteBankAccount,
  isCreditType,
  isTopupCode,
  randomTopupCode,
  roundToRupiah,
  topupStatusLabel,
  topupStatusTone,
  transactionTypeLabel,
  validateTopupAmount,
  validateWithdrawAmount,
} from "@/lib/wallet"

describe("roundToRupiah", () => {
  it("membulatkan pecahan sen ke rupiah terdekat", () => {
    expect(roundToRupiah(10_000.4)).toBe(10_000)
    expect(roundToRupiah(10_000.6)).toBe(10_001)
  })
})

describe("validateTopupAmount", () => {
  it("menerima nominal batas bawah", () => {
    expect(validateTopupAmount(MIN_TOPUP_AMOUNT)).toBeNull()
  })

  it("menolak di bawah minimum dengan alasan terbaca", () => {
    expect(validateTopupAmount(MIN_TOPUP_AMOUNT - 1)).toMatch(/Minimal/)
  })

  it("menolak di atas maksimum", () => {
    expect(validateTopupAmount(10_000_001)).toMatch(/Maksimal/)
  })

  it("menolak nominal pecahan dan tak-finite", () => {
    expect(validateTopupAmount(10_000.5)).toMatch(/rupiah/)
    expect(validateTopupAmount(Number.NaN)).toMatch(/tidak valid/)
    expect(validateTopupAmount(Number.POSITIVE_INFINITY)).toMatch(/tidak valid/)
  })
})

describe("validateWithdrawAmount", () => {
  it("menerima nominal sah di bawah saldo", () => {
    expect(validateWithdrawAmount(MIN_WITHDRAW_AMOUNT, 100_000)).toBeNull()
  })

  it("menolak melebihi saldo", () => {
    expect(validateWithdrawAmount(200_000, 100_000)).toMatch(/tidak mencukupi/)
  })

  it("menolak di bawah minimum", () => {
    expect(validateWithdrawAmount(MIN_WITHDRAW_AMOUNT - 1, 1_000_000)).toMatch(/Minimal/)
  })

  it("menolak saldo pecahan yang tidak bulat", () => {
    expect(validateWithdrawAmount(50_000.5, 1_000_000.5)).toMatch(/rupiah/)
  })
})

describe("kode top-up", () => {
  it("berbentuk JK-TOP-XXXX tanpa karakter mudah tertukar", () => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const code = randomTopupCode()
      expect(code).toMatch(/^JK-TOP-[A-Z0-9]{4}$/)
      // Hanya bagian acaknya yang dilarang memuat karakter tertukar —
      // prefix "JK-TOP" memang mengandung "O".
      expect(code.slice("JK-TOP-".length)).not.toMatch(/[01OIL5S]/)
    }
  })

  it("isTopupCode menerima bentuk sah dan menolak sisanya", () => {
    expect(isTopupCode("jk-top-2a4b")).toBe(true)
    expect(isTopupCode("JK-TOP-12345")).toBe(false)
    expect(isTopupCode("JK-2F9K3")).toBe(false)
    expect(isTopupCode("")).toBe(false)
  })
})

describe("label & tone status", () => {
  it("memetakan ketiga status top-up", () => {
    expect(topupStatusLabel("PENDING")).toBe("Menunggu verifikasi")
    expect(topupStatusLabel("VERIFIED")).toBe("Terverifikasi")
    expect(topupStatusLabel("REJECTED")).toBe("Ditolak")
    expect(topupStatusLabel("UNKNOWN")).toBe("UNKNOWN")
  })

  it("tone mengikuti pola status pesanan", () => {
    expect(topupStatusTone("PENDING")).toBe("warning")
    expect(topupStatusTone("VERIFIED")).toBe("success")
    expect(topupStatusTone("REJECTED")).toBe("destructive")
    expect(topupStatusTone("APAPUN")).toBe("muted")
  })

  it("jenis transaksi berkredit memuat TOPUP, REFUND, EARNING", () => {
    expect(isCreditType("TOPUP")).toBe(true)
    expect(isCreditType("REFUND")).toBe(true)
    expect(isCreditType("EARNING")).toBe(true)
    expect(isCreditType("PAYMENT")).toBe(false)
    expect(isCreditType("WITHDRAW")).toBe(false)
  })

  it("label jenis transaksi lengkap", () => {
    expect(transactionTypeLabel("TOPUP")).toBe("Isi saldo")
    expect(transactionTypeLabel("EARNING")).toBe("Pendapatan pesanan")
    expect(transactionTypeLabel("BUKAN")).toBe("BUKAN")
  })
})

describe("rekening penarikan", () => {
  it("snapshot terbentuk lengkap dan null bila ada bagian kosong", () => {
    expect(
      buildBankSnapshot({
        bankName: "BCA",
        bankAccountNumber: "1234567890",
        bankAccountName: "Dewi Lestari",
      })
    ).toBe("BCA • 1234567890 • Dewi Lestari")

    expect(
      buildBankSnapshot({ bankName: "BCA", bankAccountNumber: null, bankAccountName: "X" })
    ).toBeNull()
  })

  it("hasCompleteBankAccount menuntut ketiga kolom terisi", () => {
    expect(
      hasCompleteBankAccount({
        bankName: "BCA",
        bankAccountNumber: "1234567890",
        bankAccountName: "Dewi Lestari",
      })
    ).toBe(true)
    expect(
      hasCompleteBankAccount({ bankName: " ", bankAccountNumber: "123", bankAccountName: "X" })
    ).toBe(false)
  })
})

describe("computeTargetDimensions (bukti transfer)", () => {
  it("memotong sisi terpanjang ke batas dengan rasio terjaga", () => {
    expect(computeTargetDimensions(4032, 3024)).toEqual({
      width: PROOF_IMAGE_MAX_EDGE,
      height: Math.round((3024 * PROOF_IMAGE_MAX_EDGE) / 4032),
    })
    expect(computeTargetDimensions(3024, 4032)).toEqual({
      width: Math.round((3024 * PROOF_IMAGE_MAX_EDGE) / 4032),
      height: PROOF_IMAGE_MAX_EDGE,
    })
  })

  it("tidak meng-upscale gambar kecil", () => {
    expect(computeTargetDimensions(640, 480)).toEqual({ width: 640, height: 480 })
    expect(computeTargetDimensions(1280, 1280)).toEqual({ width: 1280, height: 1280 })
  })

  it("menolak dimensi nol, negatif, atau tak-finite", () => {
    expect(() => computeTargetDimensions(0, 100)).toThrow()
    expect(() => computeTargetDimensions(100, -1)).toThrow()
    expect(() => computeTargetDimensions(Number.NaN, 100)).toThrow()
    expect(() => computeTargetDimensions(100, Number.POSITIVE_INFINITY)).toThrow()
  })

  it("menerima batas sisi kustom", () => {
    expect(computeTargetDimensions(2000, 1000, 500)).toEqual({ width: 500, height: 250 })
  })
})

describe("computeEncodeQualitySteps (bukti transfer)", () => {
  it("menurun 0.1 per langkah dari kualitas awal hingga lantai 0.4", () => {
    expect(computeEncodeQualitySteps()).toEqual([0.8, 0.7, 0.6, 0.5, 0.4])
    expect(computeEncodeQualitySteps(0.7)).toEqual([0.7, 0.6, 0.5, 0.4])
  })

  it("kualitas default berada di bawah 1 dan lantai tidak minus", () => {
    expect(PROOF_IMAGE_JPEG_QUALITY).toBeLessThan(1)
    const steps = computeEncodeQualitySteps()
    expect(steps[0]).toBe(PROOF_IMAGE_JPEG_QUALITY)
    expect(steps[steps.length - 1]).toBeGreaterThanOrEqual(0.4)
  })
})

describe("validateProofImage (bukti transfer)", () => {
  const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
  const tinyDataUri = `data:image/png;base64,${tinyPngBase64}`

  it("menolak string kosong atau terlalu pendek", () => {
    expect(validateProofImage("").ok).toBe(false)
    expect(validateProofImage("data:image/jpeg;base64,AA").ok).toBe(false)
  })

  it("menerima data URI JPEG/PNG/WebP yang sah", () => {
    expect(validateProofImage(tinyDataUri)).toEqual({ ok: true, uri: tinyDataUri })
    expect(validateProofImage(`data:image/jpeg;base64,${tinyPngBase64}`).ok).toBe(true)
    expect(validateProofImage(`data:image/webp;base64,${tinyPngBase64}`).ok).toBe(true)
  })

  it("menolak mime lain termasuk SVG", () => {
    expect(validateProofImage(`data:image/svg+xml;base64,${tinyPngBase64}`).ok).toBe(false)
    expect(validateProofImage(`data:text/html;base64,${tinyPngBase64}`).ok).toBe(false)
    expect(validateProofImage("data:image/gif;base64,R0lGODlhAQABAAAAACs=").ok).toBe(false)
  })

  it("menolak data URI tanpa payload base64", () => {
    expect(validateProofImage("data:image/jpeg;base64,").ok).toBe(false)
    expect(validateProofImage(`data:image/jpeg;base64,${tinyPngBase64}??`).ok).toBe(false)
  })

  it("menolak melebihi batas karakter data URI", () => {
    const oversized = `data:image/jpeg;base64,${"A".repeat(MAX_PROOF_IMAGE_CHARS)}`
    expect(validateProofImage(oversized).ok).toBe(false)
  })

  it("menerima URL https dan menolak scheme lain", () => {
    expect(
      validateProofImage("https://cdn.jasakite.id/proof/abc.jpg").ok
    ).toBe(true)
    expect(validateProofImage("http://cdn.jasakite.id/proof/abc.jpg").ok).toBe(false)
    expect(validateProofImage("javascript:alert(1)").ok).toBe(false)
    expect(validateProofImage("/uploads/proof.jpg").ok).toBe(false)
  })
})
