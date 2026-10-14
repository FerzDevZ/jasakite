import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Container halaman tunggal. Sebelumnya tiap halaman memilih max-w sendiri
 * (7xl / 6xl / 4xl / 3xl / 2xl) sehingga lebar konten bergeser saat pindah
 * halaman. Hanya dua lebar yang sah:
 *
 * - wide  : katalog, landing, dashboard — 80rem
 * - prose : teks panjang & form (FAQ, checkout, auth) — 48rem
 */
const WIDTHS = {
  wide: "max-w-7xl",
  prose: "max-w-3xl",
} as const

export function PageShell({
  width = "wide",
  className,
  as: Tag = "div",
  children,
}: {
  width?: keyof typeof WIDTHS
  className?: string
  as?: "div" | "main" | "section"
  children: React.ReactNode
}) {
  return (
    <Tag className={cn("mx-auto w-full px-4 sm:px-6", WIDTHS[width], className)}>
      {children}
    </Tag>
  )
}

/**
 * Judul halaman + deskripsi + slot aksi. Menyeragamkan jarak vertikal dan
 * ukuran heading yang sebelumnya berbeda di tiap halaman.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
