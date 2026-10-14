"use client"

import * as React from "react"
import { SlidersHorizontal, MapPin, Star, X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { REGENCIES, LOCATION_SUGGESTIONS, normalizeLocationInput } from "@/lib/provinces"

function LocationAutocomplete({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const filtered = React.useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return LOCATION_SUGGESTIONS.slice(0, 8)
    return LOCATION_SUGGESTIONS.filter((loc) => loc.toLowerCase().includes(q)).slice(0, 8)
  }, [value])

  /**
   * Pilih nilai dari daftar, lalu simpan bentuk kanoniknya:
   *  - nama provinsi = "seluruh wilayah" → filter DILEPAS (string kosong), bukan
   *    dikirim sebagai nilai `city` yang tidak akan pernah cocok;
   *  - ibu kota ("Sungailiat") → nama kabupatennya ("Kabupaten Bangka"), supaya
   *    chip daerah ikut tersorot dan URL memakai nilai yang sama dengan chip;
   *  - ketikan bebas ("bangka") → apa adanya, dicocokkan `contains` di API.
   */
  const commit = (raw: string) => {
    onChange(normalizeLocationInput(raw))
    setOpen(false)
  }
  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true)
    if (filtered.length === 0) return
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % filtered.length) }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + filtered.length) % filtered.length) }
    if (e.key === "Enter" && open && filtered[active]) { e.preventDefault(); commit(filtered[active]) }
    if (e.key === "Escape") setOpen(false)
  }
  return (
    <div ref={wrapRef} className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="text"
        placeholder="Kabupaten/kota, mis. Pangkal Pinang"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="pl-9"
        aria-label="Filter lokasi"
        aria-expanded={open}
        aria-controls="lokasi-suggest"
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
      />
      {open && (
        <div id="lokasi-suggest" className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-card-lg">
          <ul role="listbox" className="py-1 max-h-56 overflow-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Tidak ada lokasi untuk “{value}”</li>
            ) : filtered.map((loc, i) => (
              <li key={loc} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(loc)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{loc}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border bg-muted/40 px-3 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Search className="h-3 w-3" aria-hidden /> 7 kabupaten/kota</span>
            <button type="button" onClick={() => { onChange(""); setOpen(false) }} className="font-medium text-primary-strong hover:underline">Hapus</button>
          </div>
        </div>
      )}
    </div>
  )
}

export type CatalogFilters = {
  category: string
  location: string
  minPrice: string
  maxPrice: string
  rating: number
}

export type CategoryOption = {
  id: string | number
  name: string
  slug: string
  _count: { services: number }
}

/**
 * Panel filter katalog. Dipisah dari page.client.tsx supaya markup yang sama
 * bisa dipakai dua kali: sidebar sticky di desktop dan drawer di mobile —
 * sebelumnya panel ini menumpuk di atas hasil di layar kecil sehingga daftar
 * jasa terdorong jauh ke bawah lipatan.
 */
export function CatalogFilterPanel({
  filters,
  categories,
  onChange,
  onReset,
  className,
}: {
  filters: CatalogFilters
  categories: CategoryOption[] | undefined
  onChange: (patch: Partial<CatalogFilters>) => void
  onReset: () => void
  className?: string
}) {
  const { category, location, minPrice, maxPrice, rating } = filters

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filter
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="focus-ring rounded text-xs font-medium text-primary-strong hover:underline"
        >
          Reset
        </button>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Kategori</p>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onChange({ category: "" })}
            aria-pressed={category === ""}              className={`focus-ring w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-fast active:scale-[0.97] ${
              category === ""
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            Semua
          </button>
          {categories?.map((cat) => {
            const active = category === String(cat.id)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange({ category: String(cat.id) })}
                aria-pressed={active}
                className={`focus-ring flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all duration-fast active:scale-[0.97] ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    active ? "text-primary-foreground/70" : "text-muted-foreground/60"
                  }`}
                >
                  {cat._count.services}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">Lokasi <span className="text-xs font-normal text-muted-foreground/70">(Kep. Bangka Belitung)</span></p>
        <LocationAutocomplete value={location} onChange={(v) => onChange({ location: v })} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REGENCIES.map((reg) => (
            <button
              key={reg.name}
              type="button"
              onClick={() => onChange({ location: location === reg.name ? "" : reg.name })}
              aria-pressed={location === reg.name}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-fast active:scale-[0.95] ${location === reg.name ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {reg.capital}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">Ketik “bangka” untuk semua kabupaten di Pulau Bangka, “belitung” untuk Pulau Belitung.</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Rentang Harga
        </p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Min"
              value={minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              aria-label="Harga minimum"
              className="pl-7"
            />
          </div>
          <span className="text-muted-foreground" aria-hidden>
            –
          </span>
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Max"
              value={maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              aria-label="Harga maksimum"
              className="pl-7"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            { label: "<100rb", min: "", max: "100000" },
            { label: "100-300rb", min: "100000", max: "300000" },
            { label: "300rb+", min: "300000", max: "" },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange({ minPrice: p.min, maxPrice: p.max })}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-fast active:scale-[0.95] ${minPrice===p.min && maxPrice===p.max ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Rating Minimal
        </p>
        <div className="flex gap-1" role="group" aria-label="Filter rating minimal">
          {[4.5, 4, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onChange({ rating: rating === r ? 0 : r })}
              aria-pressed={rating === r}
              className={`focus-ring flex items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-fast active:scale-[0.95] ${
                rating === r
                  ? "bg-rating text-background shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              <Star className="h-3 w-3 fill-current" aria-hidden />
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Drawer filter untuk mobile. */
export function CatalogFilterDrawer({
  open,
  onOpenChange,
  resultCount,
  ...panelProps
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  resultCount: number
} & React.ComponentProps<typeof CatalogFilterPanel>) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const previousFocus = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    previousFocus.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = "hidden"

    // Fokus elemen interaktif pertama di dalam drawer setelah mount.
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
      )
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
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        aria-hidden
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filter jasa"
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl border-t border-border bg-background"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/20" aria-hidden />
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="font-semibold">Filter</span>
          <button
            type="button"
            aria-label="Tutup filter"
            onClick={() => onOpenChange(false)}
            className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <CatalogFilterPanel {...panelProps} />
        </div>

        <div className="border-t border-border p-4">
          <Button
            className="w-full shadow-glow"
            onClick={() => onOpenChange(false)}
          >
            Lihat {resultCount} Jasa
          </Button>
        </div>
      </div>
    </div>
  )
}
