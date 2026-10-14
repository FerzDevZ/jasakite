"use client"

import * as React from "react"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query"
// toast ter-defer: hanya dipakai di callback geolocation (user-triggered).
import { toast } from "@/lib/toast-dynamic"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { PageShell } from "@/components/layout/page-shell"
import { SearchX, SlidersHorizontal, ChevronDown, X, MapPinned, Loader2, Check } from "lucide-react"
import dynamic from "next/dynamic"
import { type ServiceTileData } from "@/components/services/service-tile"
import {
  DenseServiceTile,
  DenseServiceTileSkeleton,
} from "@/components/services/dense-service-tile"
// Panel & drawer filter dimuat dinamis: form filter tidak dibutuhkan untuk
// paint pertama (di mobile ia bahkan di balik tombol), dan modulnya menarik
// dataset geo/provinsi (~7KB) ke chunk terpisah — memangkas evaluasi JS di
// jendela kritis TBT halaman katalog (LH mobile 320px).
const CatalogFilterPanel = dynamic(
  () => import("@/components/services/catalog-filters").then((m) => m.CatalogFilterPanel),
  {
    ssr: false,
    loading: () => <FilterSkeleton className="sticky top-24 rounded-2xl border border-border bg-card p-5" />,
  }
)
const CatalogFilterDrawer = dynamic(
  () => import("@/components/services/catalog-filters").then((m) => m.CatalogFilterDrawer),
  { ssr: false }
)
// Tipe tetap statis — type-only import tidak berkontribusi ke bundle runtime.
import type {
  CatalogFilters,
  CategoryOption,
} from "@/components/services/catalog-filters"
import type { ServicesPayload, CategoryOptionData } from "@/lib/services-query"

type ServiceItem = ServiceTileData & {
  description: string
  category: { id: string | number; name: string; slug: string }
}

type ServicesResponse = {
  services: ServiceItem[]
  total: number
  page: number
  totalPages: number
}

const SORT_OPTIONS = [
  { value: "newest", label: "Terbaru" },
  { value: "popular", label: "Terlaris" },
  { value: "price-asc", label: "Harga Terendah" },
  { value: "price-desc", label: "Harga Tertinggi" },
  { value: "rating", label: "Rating Tertinggi" },
]

const EMPTY_FILTERS: CatalogFilters = {
  category: "",
  location: "",
  minPrice: "",
  maxPrice: "",
  rating: 0,
}

function useDebouncedValue<T>(value: T, delay = 500) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function CatalogSkeleton() {
  return (
    <PageShell className="py-8">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </aside>
        <div className="flex-1">
          <div className="mb-6 h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <DenseServiceTileSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}

/** Skeleton sidebar saat chunk filter dimuat — bentuk sama dengan asli. */
function FilterSkeleton({ className }: { className?: string }) {
  return <div className={`h-96 animate-pulse rounded-2xl bg-muted ${className ?? ""}`} />
}

function CatalogContent({
  initialData,
  initialCategories,
}: {
  initialData?: ServicesPayload
  initialCategories?: CategoryOptionData[]
}) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [search, setSearch] = useState(searchParams.get("search") ?? "")
  const debouncedSearch = useDebouncedValue(search)
  const [filters, setFilters] = useState<CatalogFilters>({
    ...EMPTY_FILTERS,
    category: searchParams.get("category") ?? "",
    location: searchParams.get("location") ?? "",
  })
  const debouncedFilters = useDebouncedValue(filters, 400)
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [locating, setLocating] = useState(false)

  // Infinite scroll menggantikan paginasi: setiap perubahan filter mengembalikan
  // akumulasi ke halaman 1 — tanpa ini pengguna bisa melihat sisa hasil lama
  // dari kombinasi filter sebelumnya.
  const updateFilters = useCallback((patch: Partial<CatalogFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setSearch("")
    setFilters(EMPTY_FILTERS)
    setSort("newest")
  }, [])

  // Terdekat: geolokasi JUJUR — hanya menghitung jarak ke pusat kabupaten/
  // kota (database tidak punya koordinat penyedia), lalu memakai daerah itu
  // sebagai filter lokasi yang sudah ada. Label toast menyebut "daerah
  // terdekat".
  const locateNearest = useCallback(() => {
    if (!("geolocation" in navigator)) {
      toast.error("Perangkat tidak mendukung lokasi", {
        description:        "Pilih kabupaten/kota manual dari filter Lokasi.",
      })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false)
        // Dynamic import: hitung jarak hanya saat tombol ditekan — modul geo
        // (koordinat 7 kab/kota) tidak perlu ada di bundle awal katalog.
        const { nearestCity } = await import("@/lib/geo")
        const result = nearestCity(pos.coords.latitude, pos.coords.longitude)
        if (!result) {
          toast.error("Lokasi tidak terbaca", {
            description: "Pilih kabupaten/kota manual dari filter Lokasi.",
          })
          return
        }
        const km = Math.round(result.km)
        toast.success(`Daerah terdekat: ${result.city.label}`, {
          description:
            km < 1
              ? "Berada di sekitar Anda — menyaring jasa daerah ini."
              : `Sekitar ${km} km dari posisi Anda — menyaring jasa daerah ini.`,
        })
        updateFilters({ location: result.city.area })
      },
      () => {
        setLocating(false)
        toast.error("Izin lokasi ditolak", {
          description: "Pilih kabupaten/kota manual dari filter Lokasi.",
        })
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    )
  }, [updateFilters])

  const { category, location, minPrice, maxPrice, rating } = debouncedFilters

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (category) params.set("category", category)
    if (location) params.set("location", location)
    if (minPrice) params.set("minPrice", minPrice)
    if (maxPrice) params.set("maxPrice", maxPrice)
    if (rating) params.set("rating", String(rating))
    if (sort !== "newest") params.set("sort", sort)
    const qs = params.toString()
    router.replace(qs ? `/services?${qs}` : "/services", { scroll: false })
  }, [
    debouncedSearch,
    category,
    location,
    minPrice,
    maxPrice,
    rating,
    sort,
    router,
  ])

  const { data: categories } = useQuery<CategoryOption[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("Gagal memuat kategori")
      return res.json()
    },
    // SSR: chips kategori langsung ter-paint dengan HTML awal — dulu elemen
    // LCP karena menunggu fetch ini di jendela kritis.
    ...(initialCategories ? { initialData: initialCategories } : {}),
  })

  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!sortOpen) return
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSortOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [sortOpen])

  const infinite = useInfiniteQuery<ServicesResponse>({
    queryKey: [
      "services",
      debouncedSearch,
      category,
      location,
      minPrice,
      maxPrice,
      rating,
      sort,
    ],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ sort, page: String(pageParam) })
      if (debouncedSearch) params.append("search", debouncedSearch)
      if (category) params.append("category", category)
      if (location) params.append("location", location)
      if (minPrice) params.append("minPrice", minPrice)
      if (maxPrice) params.append("maxPrice", maxPrice)
      if (rating) params.append("rating", String(rating))
      // Validasi client-side untuk min>max (P1-6) — tangkap sebelum request
      if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
        throw new Error("Harga minimum tidak boleh lebih besar dari maksimum")
      }
      const res = await fetch(`/api/services?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? "Gagal memuat jasa")
      }
      return res.json()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    // SSR: halaman 1 hasil render server dipakai langsung pada query default.
    // staleTime global sudah 60s, jadi tidak ada fetch ganda saat mount.
    ...(initialData
      ? {
          initialData: {
            pages: [initialData],
            pageParams: [1],
          },
        }
      : {}),
  })

  const { isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, isError, error } = infinite

  // Satu objek datar untuk seluruh render — konsumen di bawah tidak perlu
  // tahu bahwa data kini berbentuk akumulasi halaman.
  const data = useMemo(() => {
    const pages = infinite.data?.pages
    if (!pages?.length) return undefined
    return {
      services: pages.flatMap((p) => p.services),
      total: pages[0].total,
      totalPages: pages[0].totalPages,
    }
  }, [infinite.data])

  // Sentinel infinite scroll: saat masuk viewport, muat halaman berikutnya.
  // Tombol "Muat lebih banyak" tetap dirender sebagai fallback — pengguna
  // dengan reduced-motion atau browser lama tetap punya jalur eksplisit.
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !hasNextPage) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: "600px 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const activeFilterCount =
    (category ? 1 : 0) +
    (location ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    (rating ? 1 : 0)

  const panelProps = {
    filters,
    categories,
    onChange: updateFilters,
    onReset: resetFilters,
  }

  return (
    <PageShell className="py-8 pb-44 lg:pb-8 animate-content-in">
      {/* Judul halaman berada DI ATAS grid, bukan di dalam kolom hasil: dengan
          sidebar filter yang dirender lebih dulu di DOM, h2 "Filter" muncul
          sebelum h1 dan urutan heading jadi tidak logis untuk screen reader. */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jelajahi Jasa</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {isLoading
              ? "Memuat daftar jasa…"
              : `${data?.total ?? 0} jasa ditemukan`}
          </p>
        </div>
        <div ref={sortRef} className="relative shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={locateNearest}
              disabled={locating}
              aria-label="Saring jasa di kabupaten/kota terdekat"
              className="focus-ring flex h-10 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong disabled:opacity-60"
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <MapPinned className="h-4 w-4" aria-hidden />
              )}
              <span className="hidden sm:inline">Terdekat</span>
            </button>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
            aria-label="Urutkan jasa"
            id="sort-button"
            aria-controls="sort-listbox"
            onClick={() => setSortOpen((v) => !v)}
            className="focus-ring flex h-10 w-full items-center justify-between rounded-lg border border-input bg-card px-3 text-sm sm:w-48"
          >
            <span>{SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Terbaru"}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`} aria-hidden />
          </button>
          </div>
          {sortOpen && (
            <div
              role="listbox"
              id="sort-listbox"
              aria-label="Urutkan jasa"
              aria-labelledby="sort-button"
              className="absolute right-0 top-full z-20 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card-lg sm:w-48"
              onKeyDown={(e) => { if (e.key === "Tab") setSortOpen(false) }}
            >
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  role="option"
                  id={`sort-option-${o.value}`}
                  aria-selected={o.value === sort}
                  onClick={() => { setSort(o.value); setSortOpen(false) }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSort(o.value); setSortOpen(false) }
                    if (e.key === "Escape") { e.preventDefault(); setSortOpen(false); (document.getElementById("sort-button") as HTMLElement)?.focus() }
                    if (e.key === "Tab") setSortOpen(false)
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault()
                      const idx = SORT_OPTIONS.findIndex((x) => x.value === o.value)
                      const next = e.key === "ArrowDown" ? (idx + 1) % SORT_OPTIONS.length : (idx - 1 + SORT_OPTIONS.length) % SORT_OPTIONS.length
                      const el = sortRef.current?.querySelectorAll('[role="option"]')[next] as HTMLElement | undefined
                      el?.focus()
                    }
                    if (e.key === "Home") { e.preventDefault(); (sortRef.current?.querySelectorAll('[role="option"]')[0] as HTMLElement)?.focus() }
                    if (e.key === "End") { e.preventDefault(); const els = sortRef.current?.querySelectorAll('[role="option"]'); (els?.[els.length -1] as HTMLElement)?.focus() }
                  }}
                  tabIndex={o.value === sort ? 0 : -1}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors ${o.value === sort ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                >
                  {o.label}
                  {o.value === sort && <span aria-hidden>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rail chip kategori cepat — pola etalase: ganti kategori tanpa buka
          sidebar/drawer. `aria-pressed` menyatakan keadaan aktif kepada
          pembaca layar; chip "Semua" menghapus filter kategori. */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter kategori cepat">
        <button
          type="button"
          onClick={() => updateFilters({ category: "" })}
          aria-pressed={category === ""}
          className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            category === ""
              ? "border-primary bg-primary text-primary-foreground shadow-glow"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary-strong"
          }`}
        >
          {category === "" && <Check className="h-3.5 w-3.5" aria-hidden />}
          Semua
        </button>
        {(categories ?? []).map((cat) => {
          const active = category === String(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateFilters({ category: active ? "" : String(cat.id) })}
              aria-pressed={active}
              className={`focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary-strong"
              }`}
            >
              {active && <Check className="h-3.5 w-3.5" aria-hidden />}
              {cat.name}
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-64 shrink-0 lg:block">
          <CatalogFilterPanel
            {...panelProps}
            className="sticky top-24 rounded-2xl border border-border bg-card p-5"
          />
        </aside>

        <div className="min-w-0 flex-1">
          {/* Baris chip filter aktif — sticky, tanpa -mx-4 biar nggak overflow di 320 */}
          {activeFilterCount > 0 && data && data.services.length > 0 && (
            <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-2 bg-background/80 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:mx-0">
              {category && categories && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-strong">
                  {categories.find((c) => String(c.id) === category)?.name ?? category}
                  <button type="button" aria-label="Hapus filter kategori" onClick={() => updateFilters({ category: "" })} className="focus-ring ml-1 rounded-full p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-strong">
                  {location}
                  <button type="button" aria-label="Hapus filter lokasi" onClick={() => updateFilters({ location: "" })} className="focus-ring ml-1 rounded-full p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary-strong">
                  Rp {minPrice || "0"} – Rp {maxPrice || "∞"}
                  <button type="button" aria-label="Hapus filter harga" onClick={() => updateFilters({ minPrice: "", maxPrice: "" })} className="focus-ring ml-1 rounded-full p-0.5 hover:bg-primary/20"><X className="h-3 w-3" /></button>
                </span>
              )}
              {rating > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rating/15 px-3 py-1 text-xs font-medium">
                  ≥ {rating}★
                  <button type="button" aria-label="Hapus filter rating" onClick={() => updateFilters({ rating: 0 })} className="focus-ring ml-1 rounded-full p-0.5 hover:bg-rating/20"><X className="h-3 w-3" /></button>
                </span>
              )}
              <button type="button" onClick={resetFilters} className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Hapus semua</button>
            </div>
          )}

          {/* Hasil katalog dalam wrapper yang memudar saat refetch (keepPreviousData)
              — bukan skeleton blink penuh. */}
          <div className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
          {isError ? (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 p-12 text-center"
            >
              <p className="font-semibold">Gagal memuat jasa</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(error as Error)?.message ?? "Periksa koneksi Anda, lalu ubah salah satu filter untuk memuat ulang daftar."}
              </p>
              {minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice) && (
                <p className="mt-2 text-sm font-medium text-destructive-strong">Harga minimum melebihi maksimum — perbaiki filter harga.</p>
              )}
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <DenseServiceTileSkeleton key={i} />
              ))}
            </div>
          ) : data?.services.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Tidak ada jasa yang cocok"
              description={
                location
                  ? `Tidak ada jasa di "${location}". Longgarkan harga/rating, atau lihat seluruh daerah di Provinsi Kepulauan Bangka Belitung.`
                  : "Kombinasi filter Anda terlalu sempit. Longgarkan rentang harga atau hapus filter rating."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Semua Filter
                  </Button>
                  {location && (
                    <Button variant="ghost" onClick={() => updateFilters({ location: "" })}>
                      Lihat semua daerah
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <>
              {/* Kisi dua kolom di mobile. Satu kolom penuh membuat hanya
                  ~1,5 kartu terlihat per layar, sehingga membandingkan harga
                  antar jasa berarti menggulir bolak-balik; dua kolom adalah
                  kepadatan yang membuat katalog terasa seperti aplikasi
                  belanja, bukan daftar artikel. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data?.services.map((service, i) => (
                  <div
                    key={service.id}
                    className="h-full animate-rise-in"
                    style={{ animationDelay: `${Math.min(i * 50, 240)}ms`, animationFillMode: "both" } as React.CSSProperties}
                  >
                    <DenseServiceTile service={service} className="h-full" priority={i < 2} />
                  </div>
                ))}
              </div>

              {/* Sentinel: masuk viewport 600px sebelum akhir → muat otomatis. */}
              <div ref={sentinelRef} aria-hidden className="h-px" />

              {hasNextPage && (
                <div className="mt-10 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    aria-label="Muat lebih banyak jasa"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Memuat…
                      </>
                    ) : (
                      "Muat lebih banyak"
                    )}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                    Menampilkan {data?.services.length ?? 0} dari {data?.total ?? 0} jasa
                  </p>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* Action bar mobile: glass + safe-area */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/80 px-3 py-2.5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <span className="shrink-0 text-xs text-muted-foreground sm:text-sm">
            {isLoading ? "Memuat…" : `${data?.total ?? 0} jasa`}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setDrawerOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Filter
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-2xs font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      <CatalogFilterDrawer
        {...panelProps}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resultCount={data?.total ?? 0}
      />
    </PageShell>
  )
}

export default function ServicesPageClient({
  initialData,
  initialCategories,
}: {
  /**
   * Data halaman 1 yang dirender server (saat URL tanpa filter). Tanpa ini
   * katalog menunggu hydrate + fetch API — dulu penyumbang ~3.1s Load Delay
   * pada fase LCP mobile 320px.
   */
  initialData?: ServicesPayload
  /** Kategori chips di atas fold — dirender server agar tak menunggu fetch. */
  initialCategories?: CategoryOptionData[]
}) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent initialData={initialData} initialCategories={initialCategories} />
    </Suspense>
  )
}
