import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Empty state konsisten: ikon, judul, penjelasan langkah berikutnya, dan CTA
 * opsional. Menggantikan paragraf abu-abu satu baris yang dipakai sebelumnya
 * dan tidak memberi tahu pengguna apa yang harus dilakukan.
 *
 * Ikon memiliki animasi float halus untuk memberikan kesan hidup.
 * Menghormati prefers-reduced-motion.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  animated = true,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /** Aktifkan animasi float pada ikon. Default true. */
  animated?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center",
        className
      )}
    >
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground",
          animated && "animate-float"
        )}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </div>
      {/* Heading, bukan paragraf: judul empty state adalah penanda bagian yang
          paling ingin dituju pengguna pembaca layar lewat navigasi heading.
          Sebagai <p>, seluruh keadaan kosong hilang dari daftar heading dan
          satu-satunya cara menemukannya adalah membaca halaman berurutan.
          Level 2 karena setiap halaman sudah punya satu <h1> dari PageHeader. */}
      <h2 className="mt-4 font-semibold">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
