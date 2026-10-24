"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, X, ArrowRight, Clock } from "lucide-react"
import { searchPlaceholder } from "@/lib/search-copy"

type Suggestion = { title: string; slug: string }

const RECENT_SEARCHES_KEY = "jasakite-recent-searches"
const MAX_RECENT = 5

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]")
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return
  const recent = getRecentSearches().filter((r) => r !== query.trim())
  recent.unshift(query.trim())
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error("fail")
        const data = await res.json()
        setSuggestions(data.suggestions ?? [])
      } catch {
        if (!ctrl.signal.aborted) setSuggestions([])
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  return { suggestions, loading }
}

function RecentSearches({
  onSelect,
  fallback,
}: {
  onSelect: (q: string) => void
  /**
   * Ditampilkan ketika belum ada riwayat pencarian sama sekali. Tanpa ini,
   * pengguna yang baru pertama kali memakai situs melihat panel KOSONG setelah
   * mengetik satu huruf — tidak ada satu pun petunjuk bahwa panjang minimumnya
   * dua huruf, dan mengetik terasa seperti tidak ada reaksi.
   */
  fallback?: React.ReactNode
}) {
  const [recent, setRecent] = React.useState<string[]>([])

  React.useEffect(() => {
    setRecent(getRecentSearches())
  }, [])

  if (recent.length === 0) return <>{fallback ?? null}</>

  return (
    <div>
      <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
        <span className="text-xs font-medium text-muted-foreground">Pencarian Terakhir</span>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(RECENT_SEARCHES_KEY)
            setRecent([])
          }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Hapus
        </button>
      </div>
      {recent.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-accent/60"
        >
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
          <span className="truncate text-foreground/80">{q}</span>
        </button>
      ))}
    </div>
  )
}

function SuggestionList({
  suggestions,
  loading,
  query,
  onSelect,
  activeIdx,
  setActiveIdx,
  onRecentSelect,
}: {
  suggestions: Suggestion[]
  loading: boolean
  query: string
  onSelect: (s: Suggestion) => void
  activeIdx: number
  setActiveIdx: (n: number) => void
  onRecentSelect?: (q: string) => void
}) {
  if (query.trim().length < 2) {
    const hint = (
      <div className="p-3 text-xs text-muted-foreground">
        Ketik minimal 2 huruf — contoh: <span className="font-medium text-foreground">antar</span>, <span className="font-medium text-foreground">belanja</span>
      </div>
    )
    if (onRecentSelect) {
      return <RecentSearches onSelect={onRecentSelect} fallback={hint} />
    }
    return hint
  }
  if (loading) {
    return (
      <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden />
        Mencari jasa...
      </div>
    )
  }
  if (suggestions.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        Tidak ada jasa untuk <span className="font-medium text-foreground">“{query}”</span>
      </div>
    )
  }
  return (
    <ul role="listbox" className="py-1">
      {suggestions.map((s, i) => (
        <li key={s.slug} role="option" aria-selected={i === activeIdx}>
          <button
            type="button"
            onMouseEnter={() => setActiveIdx(i)}
            onClick={() => onSelect(s)}
            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors ${i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{s.title}</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * @param categories Kategori yang benar-benar ada di database. Contoh di
 * placeholder diturunkan dari daftar ini, jadi kolom pencarian tidak pernah
 * menawarkan kategori yang sudah tidak ada di katalog.
 */
export function SearchBar({ categories = [] }: { categories?: { name: string }[] }) {
  const placeholder = searchPlaceholder(categories.map((category) => category.name))
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const mobileInputRef = React.useRef<HTMLInputElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const desktopWrapRef = React.useRef<HTMLDivElement>(null)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [mobileQuery, setMobileQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [mobileSuggestOpen, setMobileSuggestOpen] = React.useState(false)
  const [activeIdx, setActiveIdx] = React.useState(0)
  const [mobileActiveIdx, setMobileActiveIdx] = React.useState(0)

  const { suggestions, loading } = useSearchSuggestions(query)
  const { suggestions: mobileSuggestions, loading: mobileLoading } = useSearchSuggestions(mobileQuery)

  const previousFocus = React.useRef<HTMLElement | null>(null)

  // Shortcut "/" untuk fokus search desktop
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (e.key === "/" && !isTyping) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Close desktop dropdown on outside click
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (desktopWrapRef.current && !desktopWrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  // Mobile trap & Escape
  React.useEffect(() => {
    if (!mobileOpen) return
    previousFocus.current = document.activeElement as HTMLElement | null
    // Gunakan position: fixed + overscroll-behavior agar background tidak
    // ter-scroll di Android Chrome (overscroll gesture).
    const scrollY = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.body.style.overflow = "hidden"
    const t = setTimeout(() => mobileInputRef.current?.focus(), 100)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileSuggestOpen) setMobileSuggestOpen(false)
        else setMobileOpen(false)
        return
      }
      if (e.key !== "Tab" || !panelRef.current) return
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener("keydown", onKey)
    return () => {
      clearTimeout(t)
      document.body.style.position = ""
      document.body.style.top = ""
      document.body.style.width = ""
      document.body.style.overflow = ""
      window.scrollTo(0, scrollY)
      window.removeEventListener("keydown", onKey)
      previousFocus.current?.focus()
    }
  }, [mobileOpen, mobileSuggestOpen])

  const handleSelect = (s: Suggestion) => {
    setOpen(false)
    setQuery(s.title)
    addRecentSearch(s.title)
    router.push(`/service/${s.slug}`)
  }
  const handleMobileSelect = (s: Suggestion) => {
    setMobileOpen(false)
    setMobileSuggestOpen(false)
    addRecentSearch(s.title)
    router.push(`/service/${s.slug}`)
  }
  const handleRecentSelect = (q: string) => {
    setQuery(q)
    setOpen(true)
    setActiveIdx(0)
  }
  const handleMobileRecentSelect = (q: string) => {
    setMobileQuery(q)
    setMobileSuggestOpen(true)
    setMobileActiveIdx(0)
  }

  const onDesktopKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true)
    if (suggestions.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length) }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length) }
    if (e.key === "Enter" && open && suggestions[activeIdx]) { e.preventDefault(); handleSelect(suggestions[activeIdx]) }
    if (e.key === "Escape") setOpen(false)
  }
  const onMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!mobileSuggestOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) setMobileSuggestOpen(true)
    if (mobileSuggestions.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setMobileActiveIdx((i) => (i + 1) % mobileSuggestions.length) }
    if (e.key === "ArrowUp") { e.preventDefault(); setMobileActiveIdx((i) => (i - 1 + mobileSuggestions.length) % mobileSuggestions.length) }
    if (e.key === "Enter" && mobileSuggestOpen && mobileSuggestions[mobileActiveIdx]) { e.preventDefault(); handleMobileSelect(mobileSuggestions[mobileActiveIdx]) }
    if (e.key === "Escape") setMobileSuggestOpen(false)
  }

  return (
    <>
      {/* ── Desktop (md ke atas): search bar inline + autocomplete ── */}
      <div ref={desktopWrapRef} className="relative mx-auto hidden w-full max-w-xl flex-1 md:block">
        <form action="/services" className="w-full" onSubmit={() => setOpen(false)}>
          <div className="group flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 focus-within:shadow-glow">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              name="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0) }}
              onFocus={() => setOpen(true)}
              onKeyDown={onDesktopKeyDown}
              aria-label="Cari jasa"
              aria-expanded={open}
              aria-controls="search-suggestions"
              aria-autocomplete="list"
              role="combobox"
              placeholder={placeholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
            <kbd className="hidden shrink-0 rounded-md border border-input bg-background px-1.5 py-0.5 text-2xs font-semibold text-foreground lg:block">/</kbd>
          </div>
        </form>
        {open && (
          <div id="search-suggestions" className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-card-lg">
            <SuggestionList suggestions={suggestions} loading={loading} query={query} onSelect={handleSelect} activeIdx={activeIdx} setActiveIdx={setActiveIdx} onRecentSelect={handleRecentSelect} />
            <div className="border-t border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Enter untuk pilih • Esc tutup</span>
              <a href={query.trim() ? `/services?search=${encodeURIComponent(query.trim())}` : "/services"} className="font-medium text-primary-strong hover:underline">Lihat semua →</a>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile (< md): tombol ikon yang membuka overlay search ── */}
      <button
        type="button"
        aria-label="Cari jasa"
        onClick={() => setMobileOpen(true)}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Overlay search mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} style={{ touchAction: 'none' }} />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian"
            className="absolute inset-x-0 top-0 border-b border-border bg-background p-3 shadow-card-lg animate-rise-in"
          >
            <form action="/services" className="flex items-center gap-2" onSubmit={() => setMobileOpen(false)}>
              <div className="group flex flex-1 items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 focus-within:shadow-glow">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <input
                  ref={mobileInputRef}
                  name="search"
                  value={mobileQuery}
                  onChange={(e) => { setMobileQuery(e.target.value); setMobileSuggestOpen(true); setMobileActiveIdx(0) }}
                  onFocus={() => setMobileSuggestOpen(true)}
                  onKeyDown={onMobileKeyDown}
                  aria-label="Cari jasa"
                  aria-expanded={mobileSuggestOpen}
                  aria-controls="mobile-search-suggestions"
                  aria-autocomplete="list"
                  role="combobox"
                  placeholder={placeholder}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  autoComplete="off"
                />
              </div>
              <button
                type="button"
                aria-label="Tutup pencarian"
                onClick={() => setMobileOpen(false)}
                className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </form>
            {mobileSuggestOpen && (
              <div id="mobile-search-suggestions" className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                <SuggestionList suggestions={mobileSuggestions} loading={mobileLoading} query={mobileQuery} onSelect={handleMobileSelect} activeIdx={mobileActiveIdx} setActiveIdx={setMobileActiveIdx} onRecentSelect={handleMobileRecentSelect} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
