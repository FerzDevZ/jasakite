"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export type RadioCardOption<T extends string> = {
  value: T
  label: string
  description?: string
  /** Ikon opsional; dirender di dalam kotak di kiri kartu. */
  icon?: React.ComponentType<{ className?: string }>
}

/**
 * Grup pilihan berbentuk kartu dengan semantik radio yang benar.
 *
 * Sebelumnya pola ini disalin di dua tempat (metode pembayaran di checkout,
 * pemilihan role di register) sebagai kumpulan <button role="radio"> tanpa
 * dukungan keyboard sama sekali. Itu melanggar ARIA APG dalam dua hal:
 *
 * 1. Panah kiri/kanan/atas/bawah tidak memindahkan pilihan — padahal itu cara
 *    utama pengguna keyboard mengoperasikan radiogroup.
 * 2. Ketiga tombol masuk tab order. Radiogroup seharusnya satu tab stop:
 *    Tab masuk ke pilihan aktif, panah untuk berpindah, Tab keluar.
 *
 * Komponen ini menerapkan roving tabindex sehingga keduanya benar.
 */
export function RadioCardGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  columns = 1,
}: {
  label: string
  options: RadioCardOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  columns?: 1 | 2
}) {
  const refs = React.useRef<Map<T, HTMLButtonElement>>(new Map())

  const focusValue = (next: T) => {
    onChange(next)
    refs.current.get(next)?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const index = options.findIndex((o) => o.value === value)
    if (index === -1) return

    let nextIndex: number | null = null
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % options.length
        break
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + options.length) % options.length
        break
      case "Home":
        nextIndex = 0
        break
      case "End":
        nextIndex = options.length - 1
        break
      default:
        return
    }

    e.preventDefault()
    focusValue(options[nextIndex].value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        columns === 2 ? "grid grid-cols-2 gap-3 auto-rows-fr [&_button]:h-full [&_button]:items-start" : "space-y-3",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = option.value === value

        return (
          <button
            key={option.value}
            ref={(node) => {
              if (node) refs.current.set(option.value, node)
              else refs.current.delete(option.value)
            }}
            type="button"
            role="radio"
            aria-checked={active}
            // Roving tabindex: hanya pilihan aktif yang bisa di-Tab.
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "focus-ring flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/40"
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="block font-medium">{option.label}</span>
              {option.description && (
                <span className="block text-sm text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>

            <span
              aria-hidden
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                active ? "border-primary bg-primary" : "border-muted-foreground/40"
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
