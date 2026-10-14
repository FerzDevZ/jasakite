"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ArrowUp } from "lucide-react"

/**
 * Scroll-to-top button. Muncul setelah scroll 500px.
 * Menghormati prefers-reduced-motion.
 */
export function ScrollToTop({ className }: { className?: string }) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 500)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Hide on mobile when floating CTA is visible (below lg breakpoint)
  const [isMobile, setIsMobile] = React.useState(true)
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsMobile(!mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  if (!visible || isMobile) return null

  return (
    <button
      type="button"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
      }}
      className={cn(
        "focus-ring fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card transition-all duration-300 hover:border-primary/40 hover:text-primary-strong hover:shadow-glow lg:bottom-6 lg:right-6",
        "animate-fade-up",
        className
      )}
      aria-label="Kembali ke atas"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  )
}
