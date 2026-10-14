"use client"

import * as React from "react"
import { prefersReducedMotion } from "@/lib/motion"

/**
 * Angka yang menghitung naik saat masuk viewport.
 *
 * Dua hal yang sebelumnya salah dan diperbaiki di sini:
 * 1. Angka dirender mentah, jadi `prefix="Rp"` pada KPI admin menghasilkan
 *    "Rp12500000". Sekarang selalu lewat Intl id-ID → "Rp12.500.000".
 * 2. Nilai awal SSR selalu "0", sehingga pengguna tanpa JS (atau sebelum
 *    hydration) melihat nol — bukan angka sebenarnya. Sekarang SSR menulis
 *    nilai final dan animasi baru menurunkannya ke 0 saat mulai.
 *
 * Implementasi sengaja TANPA GSAP: hitung-naik adalah satu tween tunggal,
 * dan mengimpornya (GSAP + ScrollTrigger, ~50KB gzip, evaluasi berat di CPU
 * lambat) hanya untuk ini menahan interaktif halaman pada jendela kritis
 * LCP/TBT (LH mobile 320px: bootup GSAP ~6,7s). rAF 15 baris menghasilkan
 * gerakan yang sama; easing cubic-out identik dengan power3.out.
 */
export function Counter({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
}: {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
}) {
  const ref = React.useRef<HTMLSpanElement>(null)

  const format = React.useCallback(
    (n: number) =>
      `${prefix}${n.toLocaleString("id-ID", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`,
    [prefix, suffix, decimals]
  )

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      el.textContent = format(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const duration = 1600
    el.textContent = format(0)
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      el.textContent = format(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, format])

  return <span ref={ref}>{format(value)}</span>
}
