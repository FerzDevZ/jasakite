"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Segmented control — pemilih satu-dari-beberapa yang selalu terlihat.
 *
 * Dipakai untuk urutan katalog ("Terbaru/Terlaris/Termurah") dan pemilih
 * jadwal. Sebelumnya pola ini ditulis sebagai deretan tombol dengan
 * `aria-pressed`; itu sah untuk filter, tetapi salah untuk pilihan tunggal
 * (pembaca layar mengumumkannya sebagai tombol sakelar, bukan pilihan).
 *
 * Di sini semantiknya radiogroup + panah kiri/kanan, sehingga bisa dipakai
 * tanpa mouse (WCAG 2.1.1) dan hanya satu item yang masuk urutan Tab.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  size = "md",
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
  size?: "sm" | "md"
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([])

  const move = (index: number, direction: 1 | -1) => {
    const next = (index + direction + options.length) % options.length
    const el = refs.current[next]
    el?.focus()
    onChange(options[next].value)
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-muted/60 p-1",
        className
      )}
    >
      {options.map((option, i) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={option.hint}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault()
                move(i, 1)
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault()
                move(i, -1)
              }
            }}
            className={cn(
              "focus-ring rounded-lg font-semibold transition-[color,transform] duration-fast active:scale-95",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
