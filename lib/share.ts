/**
 * Pembangun pesan berbagi WhatsApp.
 *
 * Teks yang terkirim ke grup WA adalah materi promosi utama JASAKITE di
 * pasar lokal — nama jasa, harga, dan tautan harus selalu utuh dan ter-encode
 * benar. Keduanya fungsi murni (tanpa browser/window) supaya bisa diuji unit;
 * URL kanonik halaman diserahkan pemanggil agar tidak bergantung pada
 * window.location saat render server.
 */
import { formatIDR } from "@/lib/utils"

export type WhatsAppShareInput = {
  title: string
  price: number
  url: string
}

/** Teks siap kirim: pembuka + nama jasa + harga + tautan, satu per baris. */
export function buildWhatsAppShareText({
  title,
  price,
  url,
}: WhatsAppShareInput): string {
  return `Cek jasa ini di JASAKITE:\n${title}\n${formatIDR(price)}\n${url}`
}

/** Tautan wa.me dengan teks sudah di-encode (spasi, baris, & aman di URL). */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
