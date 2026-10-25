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

export const ORDER_PAYMENT_METHODS = ["qris", "saldo", "cash"] as const
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number]

/**
 * `transfer` adalah nilai lama dari checkout versi sebelumnya dan tetap
 * diterima sebagai alias QRIS supaya klien yang belum diperbarui tidak
 * membuat pesanan dengan metode yang tidak bisa diverifikasi.
 *
 * `cash` = BAYAR TUNAI pelanggan → penyedia, langsung saat pekerjaan selesai:
 * tidak lewat platform, tanpa top-up, tanpa bukti, tanpa potongan. Risiko
 * penagihan bergeser ke penyedia (ia melihat badge TUNAI sebelum menerima),
 * dan `canProviderStart` melonggarkan gerbang escrow khusus metode ini.
 * `ewallet` tetap DITOLAK: tidak punya bukti yang bisa dicocokkan super admin.
 */
export function normalizePaymentMethod(value: unknown): OrderPaymentMethod | null {
  if (value === "saldo") return "saldo"
  if (value === "cash") return "cash"
  if (value === "qris" || value === "transfer") return "qris"
  return null
}

const METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  qris: "QRIS / Transfer platform",
  saldo: "Saldo JASAKITE",
  cash: "Bayar Tunai",
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
 *
 * Pengecualian `cash`: tidak ada uang yang ditahan platform, jadi gerbang
 * escrow tidak berlaku — penyedia sendiri yang menanggung penagihan tunai
 * saat pekerjaan selesai (badge TUNAI di kanban membuat keputusan itu sadar).
 */
export function canProviderStart(
  paymentStatus: string,
  paymentMethod?: string | null
): boolean {
  if (paymentMethod === "cash") return true
  return paymentStatus === "PAID"
}

/**
 * Label status pembayaran yang sadar metode: pesanan tunai belum "belum
 * dibayar" dalam arti utang — uangnya baru berpindah saat pekerjaan selesai.
 */
export function paymentDisplayLabel(
  status: string,
  method?: string | null
): string {
  if (method === "cash") {
    if (status === "PAID") return "Dibayar tunai"
    if (status === "UNPAID") return "Tunai — dibayar saat selesai"
  }
  return paymentStatusLabel(status)
}

// ── Komisi platform ──────────────────────────────────────────────────────────

/** Batas atas yang waras; persentase di luar ini hampir pasti salah konfigurasi. */
const MAX_COMMISSION_PERCENT = 50
/**
 * Komisi DINONAKTIFKAN (keputusan pemilik, 2026-10-24): persentase bawaan 0,
 * seluruh nilai pesanan mengalir ke penyedia. Mekanisme pemotongannya tetap
 * utuh di kode — aktifkan kembali kapan saja dengan menyetel env
 * PLATFORM_COMMISSION_PERCENT (maksimum 50) tanpa mengubah logika.
 */
export const DEFAULT_COMMISSION_PERCENT = 0

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
 * Selalu hitung dengan persentase SAAT INI, abaikan nilai tersimpan.
 *
 * Dulu nilai tersimpan menang (pesanan lama tidak boleh berubah ketika komisi
 * dinaikkan). Sejak komisi dinonaktifkan pemilik (2026-10-24), aturan itu
 * justru menyesatkan: pesanan tertunda yang tersimpan 10% akan tetap
 * dipotong padahal sistem komisinya sudah dimatikan. Pesanan yang selesai
 * setelah penonaktifan dinormalisasi ke pembagian berlaku (0/total), dan
 * nilai tersimpannya ikut diperbarui saat penyelesaian.
 */
export function resolveOrderSplit(
  totalPrice: number,
  _storedPlatformFee: number | null | undefined,
  _storedProviderPayout: number | null | undefined
): OrderSplit {
  return computeOrderSplit(totalPrice)
}

/**
 * Rincian payout untuk ditampilkan, bukan untuk menghitung ulang.
 *
 * Berbeda dari `resolveOrderSplit`, fungsi ini TIDAK mengganti nilai 0/0 dengan
 * persentase saat ini: pesanan lama yang dibuat sebelum fitur komisi memang
 * tidak punya pembagian tersimpan, dan menampilkan angka hasil hitung ulang
 * akan menyesatkan. `recorded` menandai apakah nilainya layak dipercaya.
 */
export type PayoutBreakdown = {
  totalPrice: number
  platformFee: number
  providerPayout: number
  recorded: boolean
}

export function payoutBreakdown(
  totalPrice: number,
  platformFee: number | null | undefined,
  providerPayout: number | null | undefined
): PayoutBreakdown {
  const total = Math.max(0, Math.round(totalPrice))
  const fee = Math.max(0, Math.round(platformFee ?? 0))
  const payout = Math.max(0, Math.round(providerPayout ?? 0))
  return {
    totalPrice: total,
    platformFee: fee,
    providerPayout: payout,
    recorded: fee + payout > 0 && Math.round(fee + payout) === total,
  }
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
