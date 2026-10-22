/**
 * Aturan pembayaran JASAKITE — fungsi murni, tanpa database.
 *
 * Model yang dijaga modul ini: **escrow**. Pelanggan membayar ke QRIS/rekening
 * platform, bukan ke penyedia. Dana ditahan platform sampai pesanan selesai,
 * lalu dilepas ke saldo penyedia setelah dipotong komisi. Karena itu satu
 * pesanan punya dua status yang terpisah:
 *
 *   - `status`        — progres pekerjaan (PENDING → IN_PROGRESS → COMPLETED)
 *   - `paymentStatus` — posisi uang (UNPAID → WAITING_VERIFICATION → PAID)
 *
 * Mencampur keduanya adalah sumber bug "pesanan selesai tapi belum dibayar",
 * jadi `canProviderStart()` menjadi satu-satunya gerbang bagi penyedia.
 */

import type { StatusTone } from "./order-status"

// ── QRIS platform ────────────────────────────────────────────────────────────

/**
 * QRIS statis milik merchant platform. Nominal TIDAK tertanam di QR (QRIS
 * statis), jadi pelanggan wajib mengetik nominal persis seperti yang
 * ditampilkan — itulah sebabnya verifikasi tetap manual oleh SUPER_ADMIN.
 *
 * Berkas sumber: `payment/qris.png`, disalin ke `public/payment/qris.png`
 * supaya bisa dirender Next/Image tanpa keluar dari bundel publik.
 */
export const PLATFORM_QRIS = {
  imagePath: "/payment/qris.png",
  merchantName: "QR QILABY CELL",
  nmid: "ID1026487778544",
  terminal: "A01",
  /** Instruksi singkat yang benar untuk QRIS statis. */
  instruction:
    "Buka aplikasi bank/e-wallet, pilih Scan QRIS, lalu masukkan nominal PERSIS seperti di atas. Simpan bukti transfer.",
} as const

// ── Metode pembayaran pesanan ────────────────────────────────────────────────

export const ORDER_PAYMENT_METHODS = ["qris", "saldo"] as const
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number]

/**
 * `transfer` adalah nilai lama dari checkout versi sebelumnya dan tetap
 * diterima sebagai alias QRIS supaya klien yang belum diperbarui tidak
 * membuat pesanan dengan metode yang tidak bisa diverifikasi. `ewallet` dan
 * `cod` sengaja DITOLAK: keduanya tidak punya bukti yang bisa dicocokkan
 * super admin, dan model escrow tidak mengenal uang tunai di luar platform.
 */
export function normalizePaymentMethod(value: unknown): OrderPaymentMethod | null {
  if (value === "saldo") return "saldo"
  if (value === "qris" || value === "transfer") return "qris"
  return null
}

const METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  qris: "QRIS / Transfer platform",
  saldo: "Saldo JASAKITE",
}

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—"
  // Pesanan lama menyimpan "transfer"; tampilkan sebagai QRIS platform,
  // bukan membocorkan nama teknis lama ke layar pengguna.
  if (method === "transfer") return METHOD_LABELS.qris
  return METHOD_LABELS[method as OrderPaymentMethod] ?? method
}

// ── Status pembayaran pesanan ────────────────────────────────────────────────

export const ORDER_PAYMENT_STATUSES = [
  "UNPAID",
  "WAITING_VERIFICATION",
  "PAID",
  "REFUNDED",
] as const
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number]

export function isOrderPaymentStatus(value: unknown): value is OrderPaymentStatus {
  return (
    typeof value === "string" &&
    (ORDER_PAYMENT_STATUSES as readonly string[]).includes(value)
  )
}

const PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  UNPAID: "Belum dibayar",
  WAITING_VERIFICATION: "Menunggu verifikasi",
  PAID: "Pembayaran terverifikasi",
  REFUNDED: "Dana dikembalikan",
}

export function paymentStatusLabel(status: string): string {
  return PAYMENT_LABELS[status as OrderPaymentStatus] ?? status
}

const PAYMENT_TONES: Record<OrderPaymentStatus, StatusTone> = {
  UNPAID: "warning",
  WAITING_VERIFICATION: "info",
  PAID: "success",
  REFUNDED: "muted",
}

export function paymentStatusTone(status: string): StatusTone {
  return PAYMENT_TONES[status as OrderPaymentStatus] ?? "muted"
}

/**
 * Penyedia hanya boleh mulai bekerja setelah uang benar-benar diterima
 * platform. Dipakai UI (tombol) DAN route PATCH pesanan — UI saja tidak cukup
 * karena tombol bisa dilewati dengan memanggil API langsung.
 */
export function canProviderStart(paymentStatus: string): boolean {
  return paymentStatus === "PAID"
}

// ── Komisi platform ──────────────────────────────────────────────────────────

/** Batas atas yang waras; persentase di luar ini hampir pasti salah konfigurasi. */
const MAX_COMMISSION_PERCENT = 50
export const DEFAULT_COMMISSION_PERCENT = 10

/**
 * Persentase komisi dari env `PLATFORM_COMMISSION_PERCENT`. Dibaca per
 * pemanggilan (bukan konstanta modul) supaya perubahan env tidak memerlukan
 * restart dan pengujian bisa menyetelnya langsung.
 */
export function commissionPercent(): number {
  const raw = Number(process.env.PLATFORM_COMMISSION_PERCENT)
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_COMMISSION_PERCENT
  return Math.min(raw, MAX_COMMISSION_PERCENT)
}

export type OrderSplit = {
  platformFee: number
  providerPayout: number
}

/**
 * Bagi total pesanan menjadi komisi platform dan payout penyedia.
 *
 * Pembulatan dilakukan pada KOMISI, lalu payout = total − komisi. Urutan ini
 * penting: kalau keduanya dibulatkan sendiri-sendiri, hasilnya bisa tidak
 * sama dengan total dan uang hilang/berlebih satu rupiah di ledger.
 */
export function computeOrderSplit(
  totalPrice: number,
  percent: number = commissionPercent()
): OrderSplit {
  const total = Math.round(totalPrice)
  if (!Number.isFinite(total) || total <= 0) {
    return { platformFee: 0, providerPayout: 0 }
  }
  const safePercent = Math.min(Math.max(percent, 0), MAX_COMMISSION_PERCENT)
  const platformFee = Math.min(total, Math.round((total * safePercent) / 100))
  return { platformFee, providerPayout: total - platformFee }
}

/**
 * Pembagian yang tersimpan di pesanan menang atas perhitungan ulang.
 *
 * Pesanan lama (sebelum fitur komisi) punya 0/0; untuk itu pembagian dihitung
 * dengan persentase saat ini. Pesanan yang sudah punya nilai sah tidak boleh
 * berubah ketika admin menaikkan komisi di kemudian hari.
 */
export function resolveOrderSplit(
  totalPrice: number,
  storedPlatformFee: number | null | undefined,
  storedProviderPayout: number | null | undefined
): OrderSplit {
  const fee = storedPlatformFee ?? 0
  const payout = storedProviderPayout ?? 0
  const total = Math.round(totalPrice)
  const hasStoredSplit =
    fee >= 0 &&
    payout >= 0 &&
    fee + payout > 0 &&
    Math.round(fee + payout) === total
  if (hasStoredSplit) {
    return { platformFee: Math.round(fee), providerPayout: Math.round(payout) }
  }
  return computeOrderSplit(totalPrice)
}

// ── Bukti transfer ───────────────────────────────────────────────────────────

/**
 * Bukti transfer hanya boleh berupa gambar raster data URI (hasil kompresan
 * kanvas di perangkat pengguna) atau URL https. SVG `image/svg+xml` ditolak
 * karena bisa memuat skrip, dan `text/html` jelas bukan bukti transfer.
 */
const PROOF_DATA_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/
const PROOF_HTTPS_URL = /^https:\/\/[\w.-]+(:\d+)?([/?#][^\s]*)?$/

export function isAllowedProofImage(value: string | null | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.length > 300_000) return false
  return PROOF_DATA_URI.test(trimmed) || PROOF_HTTPS_URL.test(trimmed)
}
