"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Search, Users, CreditCard, Truck } from "lucide-react"
import { Reveal } from "@/components/landing/reveal"

const STEPS = [
  {
    icon: Search,
    step: "01",
    title: "Cari & bandingkan",
    desc: "Jelajahi ribuan jasa di sekitar Anda. Bandingkan harga, rating, dan ulasan asli dari pelanggan sebelumnya.",
  },
  {
    icon: Users,
    step: "02",
    title: "Pilih penyedia",
    desc: "Pilih penyedia jasa yang terpercaya. Baca profil, lihat portofolio, dan chat langsung untuk klarifikasi.",
  },
  {
    icon: CreditCard,
    step: "03",
    title: "Booking & bayar",
    desc: "Konfirmasi pesanan, tambahkan catatan khusus, lalu bayar dengan aman melalui metode pilihan Anda.",
  },
  {
    icon: Truck,
    step: "04",
    title: "Jasa datang",
    desc: "Penyedia datang ke lokasi, selesaikan pekerjaan, dan beri rating serta ulasan setelahnya.",
  },
]

export function CaraKerja() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  const updateActiveIdx = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const scrollLeft = el.scrollLeft
    const cardWidth = el.scrollWidth / STEPS.length
    const idx = Math.round(scrollLeft / cardWidth)
    setActiveIdx(Math.min(Math.max(idx, 0), STEPS.length - 1))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateActiveIdx, { passive: true })
    return () => el.removeEventListener("scroll", updateActiveIdx)
  }, [updateActiveIdx])

  const scrollToIdx = (idx: number) => {
    const el = scrollRef.current
    if (!el) return
    const cardWidth = el.scrollWidth / STEPS.length
    el.scrollTo({ left: cardWidth * idx, behavior: "smooth" })
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:py-24">
      <Reveal>
        <div className="mb-12 max-w-xl">
          <h2 className="text-4xl font-bold tracking-tight">
            Dari cari jasa sampai beres, semudah itu
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Empat langkah yang dipakai setiap hari — tanpa telepon berantai.
          </p>
        </div>
      </Reveal>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible md:pb-0"
      >
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isLast = i === 3
          return (
            <Reveal key={s.step} delay={i * 0.1} className="h-full">
              <div className="group relative flex h-full min-h-[240px] min-w-[260px] snap-start flex-col rounded-3xl border border-border bg-card p-8 transition-[transform,box-shadow,border-color] duration-200 ease-smooth hover:border-primary/30 hover:shadow-card-lg hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-strong">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold tracking-widest text-primary-strong/60">
                    LANGKAH {s.step}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold leading-tight">{s.title}</h3>
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>

                <div
                  className={`mt-6 hidden items-center gap-2 text-xs font-medium md:flex ${isLast ? "invisible" : "text-muted-foreground/60"}`}
                  aria-hidden
                >
                  <div className="h-px flex-1 bg-border" />
                  <span>→</span>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>

      {/* Mobile: functional scroll indicator dots */}
      <div className="mt-6 flex justify-center gap-2 md:hidden" aria-hidden>
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => scrollToIdx(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIdx
                ? "w-7 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Langkah ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
