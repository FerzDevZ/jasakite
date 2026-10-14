"use client"

import * as React from "react"
import { prefersReducedMotion } from "@/lib/motion"

/**
 * Wrapper reveal-on-scroll — kini TANPA GSAP.
 *
 * Sebelumnya: gsap.fromTo + ScrollTrigger per wrapper. Efeknya sama di mata,
 * tetapi mengimpornya mendorong GSAP (~50KB gzip, bootup berat di CPU lambat)
 * ke jalur kritis homepage — LH mobile 320px menunjukkan TBT 7,6s dengan
 * bootup GSAP ~6,7s. IntersectionObserver + CSS transition menghasilkan
 * gerakan identik dengan biaya nol JS runtime (satu observer, class toggle),
 * dan tetap hormat prefers-reduced-motion serta berjalan tanpa JS (konten
 * terlihat seketika bila JS gagal — tidak ada pre-hide permanen).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) return
    // Set state awal via JS (bukan CSS) supaya tanpa JS konten tetap terlihat.
    el.style.opacity = "0"
    el.style.transform = `translateY(${y}px)`
    el.style.transition = `opacity 0.8s cubic-bezier(.16,1,.3,1), transform 0.8s cubic-bezier(.16,1,.3,1)`
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => {
              el.style.opacity = "1"
              el.style.transform = "translateY(0)"
            }, delay * 1000)
            observer.disconnect()
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [delay, y])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
