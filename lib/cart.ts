/**
 * Perhitungan keranjang — murni, tanpa database.
 *
 * Mungkin ini terdengar berlebihan untuk "harga × qty", tetapi keranjang punya
 * tiga sumber harga yang bisa berbeda (harga dasar jasa, harga paket, dan
 * harga yang tersimpan di baris keranjang) dan satu dari ketiganya harus
 * menang secara konsisten di setiap tempat: kartu keranjang, ringkasan
 * checkout, dan pesanan yang akhirnya dibuat. Fungsi ini yang memutuskan.
 */

export type CartLine = {
  /** Harga yang berlaku untuk baris ini (dari paket bila ada, jika tidak dari jasa). */
  unitPrice: number
  qty: number
}

/** Subtotal seluruh keranjang, dibulatkan ke rupiah. */
export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => {
    const unit = Number.isFinite(line.unitPrice) ? line.unitPrice : 0
    const qty = Number.isFinite(line.qty) && line.qty > 0 ? Math.floor(line.qty) : 0
    return sum + unit * qty
  }, 0)
}

/**
 * Harga satuan yang dipakai sebuah baris keranjang.
 * Paket yang dipilih menang atas harga dasar jasa; bila paket hilang (mis.
 * dihapus penyedia setelah dimasukkan keranjang) jatuh ke harga jasa supaya
 * pengguna tidak melihat harga 0.
 */
export function resolveUnitPrice(
  servicePrice: number,
  packagePrice: number | null | undefined
): number {
  if (typeof packagePrice === "number" && Number.isFinite(packagePrice) && packagePrice > 0) {
    return packagePrice
  }
  return Number.isFinite(servicePrice) ? servicePrice : 0
}

/**
 * Bagi potongan voucher ke beberapa pesanan sebanding dengan subtotalnya.
 *
 * Satu checkout bisa berisi beberapa jasa dari penyedia berbeda, sehingga
 * potongan harus ikut terbagi — kalau seluruh diskon ditimpakan ke pesanan
 * pertama, pesanan itu bisa jadi Rp0 sementara yang lain penuh harga, dan
 * penyedia pertama menanggung potongan yang bukan miliknya.
 *
 * Sisa pembulatan diberikan ke baris terbesar sehingga jumlah potongan seluruh
 * pesanan SELALU sama persis dengan diskon yang dijanjikan (tidak ada rupiah
 * yang hilang atau muncul entah dari mana).
 */
export function apportionDiscount(lineSubtotals: number[], discount: number): number[] {
  const total = lineSubtotals.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (total <= 0 || discount <= 0) return lineSubtotals.map(() => 0)

  const capped = Math.min(discount, total)
  const shares = lineSubtotals.map((value) =>
    Math.floor((Math.max(0, value) / total) * capped)
  )

  let remainder = capped - shares.reduce((sum, value) => sum + value, 0)
  if (remainder > 0) {
    let largest = 0
    for (let i = 1; i < lineSubtotals.length; i++) {
      if (lineSubtotals[i] > lineSubtotals[largest]) largest = i
    }
    shares[largest] += remainder
    remainder = 0
  }
  return shares
}

/** Batas jumlah per baris — mencegah keranjang berisi 999 unit dari salah ketik. */
export const MAX_CART_QTY = 20
/** Batas jumlah baris agar checkout tidak menjadi ratusan pesanan sekaligus. */
export const MAX_CART_LINES = 10

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return 1
  return Math.min(MAX_CART_QTY, Math.max(1, Math.floor(qty)))
}
