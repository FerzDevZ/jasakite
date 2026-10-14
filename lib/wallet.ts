/**
 * Aturan dompet JASAKITE — fungsi murni, tanpa database.
 *
 * Dipisah dari route handler dengan alasan yang sama seperti lib/cart.ts dan
 * lib/vouchers.ts: kesalahan di sini berujung pada uang. Saldo minus, top-up
 * dobel, atau penarikan melebihi saldo adalah jenis bug yang tidak boleh
 * hanya diuji lewat UI.
 *
 * Operasi saldo pada database (kredit/debit atomik) ada di app/api/wallet/*.
 * Aturan murni di sini menjaga: nominal sah, pembulatan rupiah, kode top-up,
 * dan transisi status top-up tidak pernah saling meleset antar pemanggil.
 */

// ── Status top-up (siklus verifikasi manual) ────────────────────────────────

export const WALLET_TOPUP_STATUSES = ["PENDING", "VERIFIED", "REJECTED"] as const
export type WalletTopupStatus = (typeof WALLET_TOPUP_STATUSES)[number]

const TOPUP_LABELS: Record<WalletTopupStatus, string> = {
  PENDING: "Menunggu verifikasi",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
}

export function topupStatusLabel(status: string): string {
  return TOPUP_LABELS[status as WalletTopupStatus] ?? status
}

// Tone visual mengikuti pola StatusTone di lib/order-status.ts, dipakai Badge.
export type WalletStatusTone = "warning" | "success" | "destructive" | "muted"

const TOPUP_TONES: Record<WalletTopupStatus, WalletStatusTone> = {
  PENDING: "warning",
  VERIFIED: "success",
  REJECTED: "destructive",
}

export function topupStatusTone(status: string): WalletStatusTone {
  return TOPUP_TONES[status as WalletTopupStatus] ?? "muted"
}

// ── Jenis transaksi dompet ───────────────────────────────────────────────────

export const WALLET_TRANSACTION_TYPES = [
  "TOPUP",
  "PAYMENT",
  "EARNING",
  "WITHDRAW",
  "REFUND",
] as const
export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number]

/** Kredit menambah saldo; debit mengurangi. Dipakai agregasi riwayat. */
export function isCreditType(type: string): boolean {
  return type === "TOPUP" || type === "REFUND" || type === "EARNING"
}

const TYPE_LABELS: Record<WalletTransactionType, string> = {
  TOPUP: "Isi saldo",
  PAYMENT: "Bayar pesanan",
  EARNING: "Pendapatan pesanan",
  WITHDRAW: "Tarik saldo",
  REFUND: "Pengembalian dana",
}

export function transactionTypeLabel(type: string): string {
  return TYPE_LABELS[type as WalletTransactionType] ?? type
}

// ── Nominal & pembulatan rupiah ──────────────────────────────────────────────

/** Top-up minimal Rp10.000 — di bawah itu biaya verifikasi manual tidak sepadan. */
export const MIN_TOPUP_AMOUNT = 10_000
/** Top-up maksimal Rp10.000.000 per pengajuan — membatasi dampak salah ketik. */
export const MAX_TOPUP_AMOUNT = 10_000_000
/** Tarik saldo minimal Rp50.000 — di bawah itu biaya transfer bank tidak sepadan. */
export const MIN_WITHDRAW_AMOUNT = 50_000

/**
 * Bulatkan ke rupiah penuh. `Math.round`, bukan `floor`: nilai ini hasil
 * penjumlahan subtotal yang masing-masing sudah bulat, bukan hasil bagi —
 * floor di sini justru memotong rupiah yang sah.
 */
export function roundToRupiah(value: number): number {
  return Math.round(value)
}

/**
 * Validasi nominal top-up. Mengembalikan alasan yang bisa langsung
 * ditampilkan, atau null bila nominal sah.
 */
export function validateTopupAmount(amount: number): string | null {
  if (!Number.isFinite(amount)) return "Nominal tidak valid"
  if (roundToRupiah(amount) !== amount) return "Nominal harus kelipatan rupiah penuh"
  if (amount < MIN_TOPUP_AMOUNT) {
    return `Minimal isi saldo Rp${formatPlain(MIN_TOPUP_AMOUNT)}`
  }
  if (amount > MAX_TOPUP_AMOUNT) {
    return `Maksimal isi saldo Rp${formatPlain(MAX_TOPUP_AMOUNT)}`
  }
  return null
}

/** Validasi nominal penarikan. */
export function validateWithdrawAmount(amount: number, balance: number): string | null {
  if (!Number.isFinite(amount)) return "Nominal tidak valid"
  if (roundToRupiah(amount) !== amount) return "Nominal harus kelipatan rupiah penuh"
  if (amount < MIN_WITHDRAW_AMOUNT) {
    return `Minimal tarik saldo Rp${formatPlain(MIN_WITHDRAW_AMOUNT)}`
  }
  if (amount > roundToRupiah(balance)) {
    return "Saldo tidak mencukupi"
  }
  return null
}

function formatPlain(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value)
}

// ── Kode top-up ──────────────────────────────────────────────────────────────

// Alfabet membuang karakter mudah tertukar (0/O, 1/I/L, 5/S) — pola sama
// dengan lib/order-code.ts, karena kode ini juga dibacakan/diketik ulang
// saat user mencatat berita transfer.
const TOPUP_ALPHABET = "2346789ABCDEFGHJKMNPQRTUVWXYZ"
const TOPUP_CODE_LENGTH = 4
export const TOPUP_CODE_PREFIX = "JK-TOP"

/** Bentuk kode top-up acak — keunikan dijaga oleh @@-pola per pengguna di bawah. */
export function randomTopupCode(): string {
  let out = ""
  for (let i = 0; i < TOPUP_CODE_LENGTH; i++) {
    out += TOPUP_ALPHABET[Math.floor(Math.random() * TOPUP_ALPHABET.length)]
  }
  return `${TOPUP_CODE_PREFIX}-${out}`
}

/** Bentuk kode top-up yang sah — dipakai validasi pencarian. */
export function isTopupCode(value: string): boolean {
  return /^JK-TOP-[A-Z0-9]{4}$/.test(value.trim().toUpperCase())
}

// ── Rekening platform (ditampilkan di halaman top-up) ───────────────────────

export type PlatformBankAccount = {
  bankName: string
  accountNumber: string
  accountName: string
}

/**
 * Rekening platform dari env var. Jika belum disetel, halaman top-up tetap
 * bisa menampilkan form pengajuan tetapi menandai instruksi transfer belum
 * lengkap — jangan pernah menghardcode nomor rekening di source.
 */
export function getPlatformBankAccount(): PlatformBankAccount | null {
  const bankName = process.env.PLATFORM_BANK_NAME?.trim()
  const accountNumber = process.env.PLATFORM_BANK_ACCOUNT_NUMBER?.trim()
  const accountName = process.env.PLATFORM_BANK_ACCOUNT_NAME?.trim()
  if (!bankName || !accountNumber || !accountName) return null
  return { bankName, accountNumber, accountName }
}

/**
 * Snapshot rekening penarikan — teks tunggal yang melekat pada pengajuan
 * withdraw. Rekening user boleh berubah kemudian; pengajuan tidak boleh
 * ikut berubah karenanya (pola snapshot yang sama dengan Order.packageName).
 */
export function buildBankSnapshot(account: {
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
}): string | null {
  if (!account.bankName || !account.bankAccountNumber || !account.bankAccountName) {
    return null
  }
  return `${account.bankName} • ${account.bankAccountNumber} • ${account.bankAccountName}`
}

/** True bila snapshot rekening lengkap — withdraw tanpa ini harus ditolak. */
export function hasCompleteBankAccount(account: {
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
}): boolean {
  return Boolean(
    account.bankName?.trim() &&
      account.bankAccountNumber?.trim() &&
      account.bankAccountName?.trim()
  )
}
