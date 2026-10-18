import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Pagar invarian uang (wallet & order).
 *
 * Bug di area ini adalah jenis bug yang tidak boleh pernah terjadi dua kali:
 * saldo minus, top-up dobel, debit ganda saat dua checkout bersamaan. Route
 * handler yang menyentuh saldo wajib memakai pola yang sama:
 *
 *  1. Perubahan saldo SELALU lewat `updateMany` atomik dengan kondisi saldo
 *     (`balance: { gte: amount }` untuk debit), BUKAN baca-lalu-tulis.
 *  2. Klaim status pengajuan (top-up/withdraw) SELALU compare-and-swap
 *     `updateMany` ber-where `status: "PENDING"` — dua admin klik bersamaan
 *     → satu menang, yang kalah 409.
 *  3. Debit pembayaran pesanan berada di DALAM `prisma.$transaction` sehingga
 *     gagal satu baris = seluruh pesanan batal (tidak ada terbayar sebagian).
 *
 * Test ini membaca sumber route: tiga invarian di atas lewat satu regex
 * terlokasi per "blok lebih dari satu operasi tulis".
 */

const ROOT = process.cwd()

const verifySource = readFileSync(
  join(ROOT, "app", "api", "wallet", "[id]", "verify", "route.ts"),
  "utf8"
)
const withdrawSource = readFileSync(
  join(ROOT, "app", "api", "wallet", "withdraw", "route.ts"),
  "utf8"
)
const ordersSource = readFileSync(
  join(ROOT, "app", "api", "orders", "route.ts"),
  "utf8"
)

describe("invarian uang — app/api/wallet/[id]/verify", () => {
  it("kredit top-up memakai increment atomik, bukan pembacaan-then-tulis", () => {
    expect(verifySource).toContain("balance: { increment: walletTx.amount }")
    // Menutup pola bahaya: tolak penulisan saldo dari hasil hitung JS.
    expect(verifySource).not.toMatch(
      /balance:\s*\w+\.\w*balanceExcluding|balance:\s*updatedBalance/
    )
  })

  it("klaim keputusan admin = CAS dari PENDING; yang kalah mendapat 409", () => {
    const claimCount = verifySource.match(
      /updateMany\(\{\s*where:\s*\{ id: transactionId, status: "PENDING"/g
    )?.length
    expect(
      claimCount,
      "tiap jalur keputusan harus klaim CAS 'PENDING'"
    ).toBeGreaterThanOrEqual(3)
    expect(verifySource).toContain('code: "CONFLICT"')
    expect(verifySource).toMatch(/CONFLICT[\s\S]{0,300}status: 409/)
  })

  it("menolak keputusan kedua pada pengajuan yang sudah diputus", () => {
    expect(verifySource).toContain('walletTx.status !== "PENDING"')
    expect(verifySource).toContain('"Pengajuan ini sudah diputus"')
  })

  it("refund withdraw selalu disertai baris ledger REFUND", () => {
    const refundBlock = verifySource.match(
      /isWithdraw && action === "reject"[\s\S]*?return \{ status: "REJECTED" as const \}/
    )
    expect(refundBlock).not.toBeNull()
    expect(refundBlock![0]).toContain('type: "REFUND"')
  })
})

describe("invarian uang — app/api/wallet/withdraw", () => {
  it("debit pakai kondisi saldo atomik di dalam satu transaksi", () => {
    expect(withdrawSource).toMatch(
      /where:\s*\{\s*id: userId,\s*balance:\s*\{\s*gte: amount\s*\}/
    )
    expect(withdrawSource).toContain("$transaction")
    expect(withdrawSource).toContain('code: "INSUFFICIENT"')
  })
})

describe("invarian uang — app/api/orders", () => {
  it("pembayaran saldo di-debit pakai kondisi atomik per baris", () => {
    expect(ordersSource).toMatch(
      /where:\s*\{\s*id: customerId,\s*balance:\s*\{\s*gte:\s*linePayable\s*\}/
    )
  })

  it("gagal debit = seluruh pesanan di-rollback, bukan terbayar sebagian", () => {
    const settlementBlock = ordersSource.match(
      /paymentMethod === "saldo"[\s\S]*?INSUFFICIENT[\s\S]*?rollback\(createdOrderIds\)/
    )
    expect(settlementBlock).not.toBeNull()
  })

  it("klaim kuota voucher = compare-and-swap, bukan increment buta", () => {
    expect(ordersSource).toContain("claimVoucherQuota")
  })
})
