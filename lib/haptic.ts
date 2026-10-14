/**
 * Umpan balik haptic — satu tempat untuk semua getaran mikro.
 *
 * Duplikasi `(navigator as unknown as { vibrate: ... }).vibrate(10)` sebelumnya
 * ditulis inline di SaveButton dan OrderKanban; pola yang sama akan menyebar
 * ke setiap aksi baru. Helper ini yang memutuskan kapan boleh bergetar:
 *
 * - Hanya berjalan di browser (`typeof navigator`), tanpa crash di SSR/test.
 * - `navigator.vibrate` tidak ada di iOS Safari — try/catch menengok dan
 *   diam, karena feedback ini bersifat bonus, bukan fungsi.
 * - `prefers-reduced-motion` dihormati: pengguna yang meminta antarmuka
 *   tenang tidak perlu dibingungkan getaran yang tidak dia minta.
 */
export function haptic(durationMs = 10): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  if (!("vibrate" in navigator)) return
  try {
    ;(navigator as unknown as { vibrate: (n: number) => void }).vibrate(durationMs)
  } catch {
    // Vibration API menolak (mis. iframe tanpa izin) — abaikan, bukan error.
  }
}
