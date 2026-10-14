/**
 * Sumber tunggal easing & durasi animasi. Nilai di sini harus identik dengan
 * `transitionTimingFunction`/`transitionDuration` di tailwind.config.ts —
 * sebelumnya GSAP memakai "power3.out", Tailwind memakai cubic-bezier lain,
 * dan framer-motion memakai angka ketiga, jadi tiga sistem gerak yang tidak
 * saling tahu berjalan di halaman yang sama.
 */
export const EASE = {
  /** Keluar cepat lalu melambat — untuk masuknya elemen (reveal, fade-up). */
  smooth: "cubic-bezier(.16, 1, .3, 1)",
  /** Standar Material — untuk hover, warna, dan perubahan state kecil. */
  crisp: "cubic-bezier(.4, 0, .2, 1)",
} as const

/** Ekuivalen EASE untuk GSAP (GSAP tidak menerima string cubic-bezier CSS). */
export const GSAP_EASE = {
  smooth: "power3.out",
  crisp: "power2.inOut",
} as const

export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.45,
  /** Untuk reveal scroll yang perlu terasa tenang. */
  reveal: 0.8,
} as const

/** True jika pengguna meminta gerak dikurangi. Aman dipanggil di server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
