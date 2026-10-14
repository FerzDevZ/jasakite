"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

type Banner = {
  id: string
  title: string
  subtitle: string | null
  href: string
  tone: string
}

/**
 * Warna banner dipilih dari token semantik, bukan nilai bebas dari database.
 * `tone` di seed hanya boleh salah satu kunci di bawah; nilai tak dikenal jatuh
 * ke `primary`. Ini yang menjaga kontras teks tetap lolos AA — banner adalah
 * tempat pertama yang biasanya rusak ketika warna ditulis sebagai string bebas.
 */
const TONES: Record<string, string> = {
  primary: "bg-primary/12 text-primary-strong border-primary/25",
  info: "bg-info-soft text-info border-info/25",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning border-warning/25",
}

/**
 * Rail banner promo.
 *
 * Memakai scroll-snap, bukan carousel yang berputar otomatis: konten yang
 * bergerak sendiri tidak bisa dibaca pengguna dengan kecepatan baca lambat
 * (dan tidak bisa dijeda), sementara geser manual tetap terasa seperti app.
 * Tombol panah disediakan supaya bisa dipakai tanpa gestur geser (WCAG 2.1.1).
 */
export function PromoRail({ banners }: { banners: Banner[] }) {
  const trackRef = React.useRef<HTMLUListElement>(null)

  if (banners.length === 0) return null

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const amount = track.clientWidth * 0.85
    track.scrollBy({ left: direction * amount, behavior: "smooth" })
  }

  return (
    <section aria-labelledby="promo-heading" className="mx-auto max-w-7xl px-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="promo-heading" className="text-lg font-bold tracking-tight sm:text-xl">
          Promo &amp; penawaran
        </h2>
        {banners.length > 1 && (
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Banner sebelumnya"
              onClick={() => scrollBy(-1)}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Banner berikutnya"
              onClick={() => scrollBy(1)}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <ul
        ref={trackRef}
        className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {banners.map((banner) => (
          <li
            key={banner.id}
            className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[32%]"
          >
            <Link
              href={banner.href}
              className={cn(
                "focus-ring flex h-full min-h-[104px] flex-col justify-center rounded-2xl border p-4 transition-transform duration-fast ease-smooth hover:-translate-y-0.5",
                TONES[banner.tone] ?? TONES.primary
              )}
            >
              <p className="text-base font-extrabold leading-tight">
                {banner.title}
              </p>
              {banner.subtitle && (
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {banner.subtitle}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
