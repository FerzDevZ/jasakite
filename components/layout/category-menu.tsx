"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, LayoutGrid } from "lucide-react"

/**
 * Mega-menu kategori desktop: daftar kategori dalam satu panel dropdown.
 * Aksesibel dengan klik (bukan hover murni): aria-expanded, Escape menutup,
 * klik di luar menutup, fokus kembali ke pemicu.
 */
export function CategoryMenu({
  categories,
}: {
  categories: { id: string; name: string }[]
}) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (categories.length === 0) return null

  return (
    <div className="relative hidden lg:block" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="focus-ring flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Kategori
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Kategori jasa"
          className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-card-lg"
        >
          <Link
            href="/services"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="focus-ring flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary/10"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden />
            Semua kategori
          </Link>
          <div className="mt-1 space-y-0.5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/services?category=${cat.id}`}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="focus-ring block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
