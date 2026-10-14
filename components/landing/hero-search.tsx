"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, ArrowRight } from "lucide-react"

type Suggestion = { title: string; slug: string }

function useSuggestions(q: string) {
  const [data, setData] = React.useState<Suggestion[]>([])
  const [loading, setLoading] = React.useState(false)
  React.useEffect(() => {
    const trimmed = q.trim()
    if (trimmed.length < 2) { setData([]); return }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/search-suggestions?q=${encodeURIComponent(trimmed)}`, { signal: ctrl.signal })
        const j = await r.json()
        if (!ctrl.signal.aborted) setData(j.suggestions ?? [])
      } catch { if (!ctrl.signal.aborted) setData([]) }
      finally { if (!ctrl.signal.aborted) setLoading(false) }
    }, 260)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])
  return { data, loading }
}

export function HeroSearch() {
  const router = useRouter()
  const [q, setQ] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [idx, setIdx] = React.useState(0)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const { data, loading } = useSuggestions(q)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const goService = (s: Suggestion) => {
    setOpen(false)
    router.push(`/service/${s.slug}`)
  }
  const goSearch = () => {
    const qs = q.trim() ? `?search=${encodeURIComponent(q.trim())}` : ""
    router.push(`/services${qs}`)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true)
    if (data.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % data.length) }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + data.length) % data.length) }
    if (e.key === "Enter" && open && data[idx]) { e.preventDefault(); goService(data[idx]) }
    if (e.key === "Escape") setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <form
        action="/services"
        onSubmit={(e) => { if (open && data[idx]) { e.preventDefault(); goService(data[idx]) } }}
        className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2.5 shadow-card-lg transition-[border-color,box-shadow] duration-200 focus-within:border-primary/50 focus-within:shadow-glow sm:p-3"
      >
        <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          name="search"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setIdx(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Cari jasa"
          aria-expanded={open}
          aria-controls="hero-suggestions"
          aria-autocomplete="list"
          role="combobox"
          placeholder="Cari: Service AC, Pasang Listrik, Bersih Rumah..."
          className="w-full bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground sm:text-base"
          autoComplete="off"
        />
        <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-2xs font-medium text-muted-foreground sm:inline-flex">⌘K</kbd>
        <button
          type="submit"
          onClick={goSearch}
          className="focus-ring flex shrink-0 items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Cari <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </form>

      {open && (
        <div id="hero-suggestions" className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-card-lg">
          {q.trim().length < 2 ? (
            <div className="p-3 text-xs text-muted-foreground">Ketik minimal 2 huruf — contoh <span className="font-medium text-foreground">AC</span>, <span className="font-medium text-foreground">listrik</span></div>
          ) : loading ? (
            <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" aria-hidden /> Mencari…</div>
          ) : data.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">Tidak ada jasa untuk “{q}” — <button type="button" onClick={goSearch} className="font-medium text-primary-strong hover:underline">cari di katalog</button></div>
          ) : (
            <ul role="listbox" className="py-1">
              {data.map((s, i) => (
                <li key={s.slug} role="option" aria-selected={i === idx}>
                  <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => goService(s)} className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm ${i === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}>
                    <span className="flex items-center gap-2 truncate"><Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />{s.title}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border bg-muted/40 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>↑↓ pilih • Enter buka</span>
            <button type="button" onClick={goSearch} className="font-medium text-primary-strong hover:underline">Lihat semua →</button>
          </div>
        </div>
      )}
    </div>
  )
}
