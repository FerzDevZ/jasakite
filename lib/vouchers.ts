/**
 * Aturan potongan voucher — murni fungsi, tanpa database.
 *
 * Dipisah dari route handler supaya bisa diuji langsung: kesalahan di sini
 * berujung pada uang (diskon salah hitung atau voucher dipakai di luar syarat),
 * dan itu jenis bug yang tidak boleh hanya diuji lewat UI.
 */

export type VoucherType = "PERCENT" | "FIXED"

export type VoucherRule = {
  code: string
  type: VoucherType
  value: number
  minSpend: number
  maxDiscount: number | null
  scopeCity: string | null
}

export type VoucherCheck =
  | { ok: true; discount: number }
  | { ok: false; reason: string }

/**
 * Hitung potongan untuk sebuah subtotal.
 *
 * Aturan yang dipegang:
 *  - potongan tidak pernah melebihi subtotal (total tidak boleh jadi negatif);
 *  - PERCENT dibatasi `maxDiscount` bila ada;
 *  - pembulatan ke rupiah penuh ke bawah, supaya toko tidak menanggung
 *    kelebihan pembulatan yang menumpuk;
 *  - subtotal di bawah `minSpend` ditolak dengan alasan yang bisa ditampilkan,
 *    bukan diskon nol yang membingungkan.
 */
export function computeVoucherDiscount(
  voucher: Pick<VoucherRule, "type" | "value" | "maxDiscount">,
  subtotal: number
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0
  if (!Number.isFinite(voucher.value) || voucher.value <= 0) return 0

  let discount =
    voucher.type === "PERCENT"
      ? Math.floor((subtotal * voucher.value) / 100)
      : Math.floor(voucher.value)

  if (voucher.type === "PERCENT" && typeof voucher.maxDiscount === "number") {
    discount = Math.min(discount, voucher.maxDiscount)
  }

  return Math.max(0, Math.min(discount, subtotal))
}

/** Validasi lengkap: masa berlaku, kuota, batas per pengguna, minimum, kota. */
export function checkVoucher(
  voucher: VoucherRule & {
    isActive: boolean
    startsAt: Date
    endsAt: Date | null
    quota: number | null
    usedCount: number
    perUser: number
    userRedemptions: number
  },
  subtotal: number,
  city: string | null,
  now: Date = new Date()
): VoucherCheck {
  if (!voucher.isActive) {
    return { ok: false, reason: "Voucher sudah tidak aktif" }
  }
  if (voucher.startsAt > now) {
    return { ok: false, reason: "Voucher belum berlaku" }
  }
  if (voucher.endsAt && voucher.endsAt < now) {
    return { ok: false, reason: "Voucher sudah kedaluwarsa" }
  }
  if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
    return { ok: false, reason: "Kuota voucher sudah habis" }
  }
  if (voucher.perUser > 0 && voucher.userRedemptions >= voucher.perUser) {
    return {
      ok: false,
      reason:
        voucher.perUser === 1
          ? "Voucher ini hanya bisa dipakai sekali"
          : `Voucher ini maksimal dipakai ${voucher.perUser} kali`,
    }
  }
  if (subtotal < voucher.minSpend) {
    return {
      ok: false,
      reason: `Minimal belanja Rp${formatPlain(voucher.minSpend)} untuk memakai voucher ini`,
    }
  }
  if (voucher.scopeCity && city && voucher.scopeCity.toLowerCase() !== city.toLowerCase()) {
    return {
      ok: false,
      reason: `Voucher ini hanya berlaku di ${titleCase(voucher.scopeCity)}`,
    }
  }

  const discount = computeVoucherDiscount(voucher, subtotal)
  if (discount <= 0) {
    return { ok: false, reason: "Voucher ini tidak memberi potongan untuk pesanan Anda" }
  }
  return { ok: true, discount }
}

function formatPlain(value: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(value))
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** Total yang benar-benar dibayar — tidak pernah negatif. */
export function totalAfterDiscount(subtotal: number, discount: number): number {
  return Math.max(0, Math.round(subtotal - discount))
}
