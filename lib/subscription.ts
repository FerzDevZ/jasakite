/**
 * Aturan langganan penyedia — fungsi murni, tanpa database.
 *
 * Dipisah dengan alasan yang sama seperti lib/wallet.ts: kesalahan di sini
 * berhubungan langsung dengan uang dan dengan jasa yang tayang/hilang dari
 * katalog. Tanggal, pembulatan rupiah, dan keputusan "boleh ditagih" harus
 * bisa diuji tanpa menyalakan server.
 *
 * Tagihan bulanan dipotong dari saldo dompet penyedia (auto-debit), bukan
 * lewat gateway pembayaran. Karena itu satu-satunya sumber kebenaran masa
 * aktif adalah `User.subscriptionUntil`: jasa dianggap tayang selama tanggal
 * itu masih di masa depan, sehingga tidak ada cron yang bisa "lupa"
 * menyembunyikan jasa yang sudah kedaluwarsa.
 */

/** Kunci pengaturan di PlatformSetting — diubah SUPER_ADMIN dari dashboard. */
export const MONTHLY_PRICE_SETTING_KEY = "provider.monthlyPrice"

/** Harga bawaan sesuai kesepakatan produk: Rp10.000 per bulan. */
export const DEFAULT_MONTHLY_PRICE = 10_000

/**
 * Batas harga yang masuk akal. Bukan penjaga bisnis, melainkan penjaga salah
 * ketik: Rp100.000.000/"" yang diketik di kolom admin akan menagih semua
 * penyedia dengan angka yang tidak pernah disepakati.
 */
export const MIN_MONTHLY_PRICE = 1_000
export const MAX_MONTHLY_PRICE = 1_000_000

/**
 * Satu periode = 30 hari, bukan "bulan kalender".
 *
 * Bulan kalender membuat 31 Januari + 1 bulan = 3 Maret, dan penyedia yang
 * membayar di akhir bulan mendapat masa aktif lebih pendek daripada yang
 * membayar di awal. Periode tetap 30 hari membuat setiap rupiah bernilai
 * jumlah hari yang sama.
 */
export const SUBSCRIPTION_PERIOD_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export type SubscriptionState = "ACTIVE" | "EXPIRED" | "NEVER"

export type SubscriptionSnapshot = {
  state: SubscriptionState
  /** Tanggal akhir masa aktif, null bila belum pernah berlangganan. */
  until: Date | null
  /** Sisa hari (dibulatkan ke atas); 0 untuk yang sudah lewat. */
  daysLeft: number
  /** True bila jasa boleh tayang dan jasa baru boleh dibuat. */
  canPublish: boolean
}

export function isSubscriptionActive(until: Date | null, now: Date = new Date()): boolean {
  return until !== null && until.getTime() > now.getTime()
}

export function subscriptionState(
  until: Date | null,
  now: Date = new Date()
): SubscriptionState {
  if (!until) return "NEVER"
  return until.getTime() > now.getTime() ? "ACTIVE" : "EXPIRED"
}

export function daysLeft(until: Date | null, now: Date = new Date()): number {
  if (!until || until.getTime() <= now.getTime()) return 0
  return Math.ceil((until.getTime() - now.getTime()) / DAY_MS)
}

export function describeSubscription(
  until: Date | null,
  now: Date = new Date()
): SubscriptionSnapshot {
  const state = subscriptionState(until, now)
  return {
    state,
    until,
    daysLeft: daysLeft(until, now),
    canPublish: state === "ACTIVE",
  }
}

/**
 * Awal periode baru: lanjutkan dari sisa masa aktif bila masih ada, supaya
 * perpanjangan lebih awal tidak menghanguskan sisa hari yang sudah dibayar.
 */
export function nextPeriodStart(until: Date | null, now: Date = new Date()): Date {
  if (until && until.getTime() > now.getTime()) return until
  return now
}

export function periodEndFrom(start: Date): Date {
  return new Date(start.getTime() + SUBSCRIPTION_PERIOD_DAYS * DAY_MS)
}

/** Jendela "akan jatuh tempo" untuk cron: dua hari sebelum habis. */
export const RENEWAL_WINDOW_DAYS = 2

export function isDueForRenewal(
  until: Date | null,
  now: Date = new Date(),
  windowDays: number = RENEWAL_WINDOW_DAYS
): boolean {
  // `null` sengaja TIDAK dianggap jatuh tempo: akun penyedia yang belum pernah
  // menayangkan jasa tidak boleh ditagih tiap hari hanya karena belum
  // berlangganan. Mereka ditagih saat pertama kali menerbitkan jasa.
  if (!until) return false
  return until.getTime() <= now.getTime() + windowDays * DAY_MS
}

export type PriceParseResult =
  | { ok: true; price: number }
  | { ok: false; error: string }

/**
 * Validasi harga bulanan dari form admin.
 *
 * Menerima number maupun string (form HTML mengirim string). Menolak pecahan
 * rupiah: saldo dompet disimpan sebagai Float, dan harga berdesimal membuat
 * sisa saldo Rp0,5 yang tidak bisa ditagih maupun ditarik.
 */
export function parseMonthlyPrice(raw: unknown): PriceParseResult {
  const numeric =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : NaN

  if (!Number.isFinite(numeric)) {
    return { ok: false, error: "Harga harus berupa angka" }
  }
  if (!Number.isInteger(numeric)) {
    return { ok: false, error: "Harga harus rupiah bulat, tanpa desimal" }
  }
  if (numeric < MIN_MONTHLY_PRICE) {
    return {
      ok: false,
      error: `Harga minimal ${formatRupiah(MIN_MONTHLY_PRICE)} per bulan`,
    }
  }
  if (numeric > MAX_MONTHLY_PRICE) {
    return {
      ok: false,
      error: `Harga maksimal ${formatRupiah(MAX_MONTHLY_PRICE)} per bulan`,
    }
  }
  return { ok: true, price: numeric }
}

export function formatRupiah(amount: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(amount)}`
}

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
]

/** Tanggal singkat Indonesia tanpa bergantung pada locale mesin server. */
export function formatSubscriptionDate(date: Date): string {
  return `${date.getDate()} ${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`
}

export function subscriptionStateLabel(
  until: Date | null,
  now: Date = new Date()
): string {
  const state = subscriptionState(until, now)
  if (state === "NEVER") return "Belum berlangganan"
  if (state === "ACTIVE" && until) {
    return `Aktif sampai ${formatSubscriptionDate(until)}`
  }
  return until ? `Berakhir ${formatSubscriptionDate(until)}` : "Berakhir"
}

/**
 * Auto-debit hanya dijalankan bila saldo cukup. Tidak ada saldo minus dan
 * tidak ada utang yang menumpuk: kalau saldo kurang, langganan berakhir dan
 * jasa disembunyikan sampai penyedia mengisi saldo.
 */
export function canChargeSubscription(balance: number, price: number): boolean {
  return Number.isFinite(balance) && Number.isFinite(price) && price > 0 && balance >= price
}

export type ChargePlan = {
  price: number
  periodStart: Date
  periodEnd: Date
}

/** Rencana penagihan (tanpa efek samping) — dipakai UI dan cron. */
export function planCharge(
  until: Date | null,
  price: number,
  now: Date = new Date()
): ChargePlan {
  const start = nextPeriodStart(until, now)
  return { price, periodStart: start, periodEnd: periodEndFrom(start) }
}
