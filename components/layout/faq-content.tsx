"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Search,
  CreditCard,
  ShieldCheck,
  Users,
  MessageCircle,
  ChevronDown,
  X,
  ThumbsUp,
  ThumbsDown,
  type LucideIcon,
} from "lucide-react"
import { FAQ_SECTIONS } from "@/lib/faq-data"

// Ikon sengaja dipisah dari data: `lib/faq-data.ts` harus tetap impor-able dari
// Server Component (JSON-LD di app/faq/page.tsx) tanpa ikon client.
const SECTION_ICONS: Record<string, LucideIcon> = {
  "cara-pesan": Search,
  pembayaran: CreditCard,
  penyedia: Users,
  kebijakan: ShieldCheck,
  tentang: MessageCircle,
}

const iconFor = (sectionId: string): LucideIcon =>
  SECTION_ICONS[sectionId] ?? MessageCircle

function FaqFeedback({ q }: { q: string }) {
  const [voted, setVoted] = useState<"up" | "down" | null>(null)
  const [count, setCount] = useState({ up: 0, down: 0 })

  const vote = useCallback((dir: "up" | "down") => {
    if (voted) return
    setVoted(dir)
    setCount((c) => ({ ...c, [dir]: c[dir] + 1 }))
  }, [voted])

  return (
    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
      <span className="text-2xs text-muted-foreground">Membantu?</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => vote("up")}
          disabled={!!voted}
          aria-label="Ya, membantu"
          className={`focus-ring flex h-7 items-center gap-1 rounded-lg border px-2 text-2xs transition-colors ${
            voted === "up"
              ? "border-success bg-success/10 text-success"
              : "border-border bg-card text-muted-foreground hover:border-primary/40"
          } ${voted && voted !== "up" ? "opacity-50" : ""}`}
        >
          <ThumbsUp className="h-3 w-3" aria-hidden />
          {count.up > 0 && count.up}
        </button>
        <button
          type="button"
          onClick={() => vote("down")}
          disabled={!!voted}
          aria-label="Tidak membantu"
          className={`focus-ring flex h-7 items-center gap-1 rounded-lg border px-2 text-2xs transition-colors ${
            voted === "down"
              ? "border-destructive bg-destructive/10 text-destructive-strong"
              : "border-border bg-card text-muted-foreground hover:border-primary/40"
          } ${voted && voted !== "down" ? "opacity-50" : ""}`}
        >
          <ThumbsDown className="h-3 w-3" aria-hidden />
          {count.down > 0 && count.down}
        </button>
      </div>
      {voted && (
        <span className="text-2xs text-success">Terima kasih!</span>
      )}
    </div>
  )
}

export function FaqContent() {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return FAQ_SECTIONS
    const q = query.toLowerCase()
    return FAQ_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) ||
          item.a.toLowerCase().includes(q)
      ),
    })).filter((section) => section.items.length > 0)
  }, [query])

  const totalResults = filtered.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <>
      {/* Search */}
      <div className="relative mx-auto mt-8 max-w-xl">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          placeholder="Cari pertanyaan..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cari pertanyaan FAQ"
          className="focus-ring w-full rounded-xl border border-border bg-card py-3 pl-12 pr-10 text-sm placeholder:text-muted-foreground transition-[border-color,box-shadow] focus:border-primary/50 focus:shadow-glow"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Hapus pencarian"
            className="focus-ring absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Quick links */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {FAQ_SECTIONS.map((section) => {
          const Icon = iconFor(section.id)
          return (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {section.title}
            </a>
          )
        })}
      </div>

      {/* Results count when searching */}
      {query && (
        <p className="mt-6 text-center text-sm text-muted-foreground" aria-live="polite">
          {totalResults === 0
            ? `Tidak ada hasil untuk "${query}"`
            : `${totalResults} hasil untuk "${query}"`}
        </p>
      )}

      {/* Sections */}
      <div className="mt-10 space-y-12">
        {filtered.map((section) => {
          const SectionIcon = iconFor(section.id)
          return (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-strong">
                <SectionIcon className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {section.title}
              </h2>
            </div>

            <div className="space-y-3">
              {section.items.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <summary className="focus-ring flex cursor-pointer items-center justify-between gap-3 rounded font-semibold marker:content-none">
                    <span className="min-w-0 flex-1 break-words text-left [overflow-wrap:anywhere]">
                      {item.q}
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                  <FaqFeedback q={item.q} />
                </details>
              ))}
            </div>
          </section>
          )
        })}
      </div>

      {/* No results */}
      {query && totalResults === 0 && (
        <div className="mt-12 rounded-3xl border border-border bg-card p-8 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground/40" aria-hidden />
          <p className="mt-3 font-semibold">Tidak ada pertanyaan yang cocok</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Coba kata kunci lain atau hubungi kami langsung.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setQuery("")}>
            Hapus Pencarian
          </Button>
        </div>
      )}

      {/* CTA */}
      <div className="mt-16 rounded-3xl border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Masih ada pertanyaan?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tim kami siap membantu. Kirim email atau jelajahi jasa sekarang.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="mailto:halo@jasakite.id">
            <Button variant="outline">Kontak Kami</Button>
          </a>
          <Link href="/services">
            <Button className="shadow-glow">Jelajahi Jasa</Button>
          </Link>
        </div>
      </div>
    </>
  )
}
