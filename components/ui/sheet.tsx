"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Bottom sheet — permukaan sementara yang naik dari bawah layar.
 *
 * Ini pola yang membuat aplikasi seperti GoFood/Shopee terasa "app", bukan
 * halaman web yang panjang: memilih filter, alamat, atau paket tidak
 * memindahkan pengguna ke halaman lain.
 *
 * Perilaku aksesibilitas yang WAJIB dan karena itu ada di dalam komponen, bukan
 * diserahkan ke pemanggil:
 *  - `role="dialog"` + `aria-modal` + label dari judul (WCAG 4.1.2);
 *  - Escape menutup dan fokus kembali ke elemen pemicu (2.1.2);
 *  - fokus terperangkap di dalam panel selama terbuka (2.4.3);
 *  - latar tidak bisa di-scroll selama sheet terbuka.
 *
 * Versi sebelumnya pola ini disalin ulang di drawer filter katalog; sekarang
 * satu implementasi dipakai bersama supaya perbaikan aksesibilitas tidak perlu
 * diulang di setiap tempat.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
  size = "auto",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
  /** `auto` mengikuti isi; `tall` untuk daftar panjang (maks 85vh). */
  size?: "auto" | "tall"
}) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previousFocus = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"

    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      first?.focus()
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false)
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
      previousFocus.current?.focus()
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          // dvh, bukan vh: saat keyboard Android terbuka, viewport dinamis
          // mengecil — dvh membuat sheet ikut memendek sehingga input di
          // dalamnya tetap terlihat di atas keyboard. vh tetap setinggi
          // layar penuh dan keyboard diam-diam menutupi bagian bawah sheet.
          "absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-border bg-background shadow-card-lg",
          size === "tall" ? "h-[85dvh]" : "",
          className
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" aria-hidden />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => onOpenChange(false)}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
