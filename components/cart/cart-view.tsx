"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { PriceBlock } from "@/components/ui/price-block"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { MAX_CART_QTY, cartSubtotal, clampQty } from "@/lib/cart"
import { dropItem, patchCartLine, rollback } from "@/lib/optimistic"
import { haptic } from "@/lib/haptic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR } from "@/lib/utils"
import { cn } from "@/lib/utils"

type CartLine = {
  id: string
  qty: number
  note: string | null
  packageId: string | null
  packageName: string | null
  unitPrice: number
  available: boolean
  service: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    price: number
    deliveryTimeDays: number
    provider: { id: string; name: string | null; city: string | null }
    category: { name: string; slug: string }
  }
}

type CartPayload = {
  items: CartLine[]
  subtotal: number
  unavailableCount: number
}

const CART_KEY = ["cart"] as const

/**
 * Keranjang.
 *
 * Keputusan yang membentuk halaman ini:
 *
 * 1. **Tidak ada kotak centang per baris.** Aplikasi lain memakainya karena
 *    satu keranjang bisa berisi belasan penjual dan pengguna memang ingin
 *    memilih sebagian. Di sini checkout memecah keranjang menjadi satu pesanan
 *    per penyedia, dan `POST /api/orders` mengosongkan seluruh keranjang —
 *    kotak centang yang tidak mengubah apa pun adalah janji palsu, jadi tidak
 *    ditampilkan.
 *
 * 2. **Harga selalu dibaca ulang dari server** pada setiap pemuatan, bukan
 *    disimpan di baris keranjang. Kalau penyedia mengubah harga setelah item
 *    masuk keranjang, yang terlihat di sini adalah harga yang akan ditagih.
 *
 * 3. **Baris yang jasanya hilang tetap ditampilkan** dengan tanda merah dan
 *    tombol hapus. Menghilangkannya diam-diam membuat keranjang terasa
 *    "berkurang sendiri" dan pengguna kehilangan jejak apa yang tadi dipilih.
 */
export function CartView() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = React.useState("")
  const [editingNote, setEditingNote] = React.useState<string | null>(null)

  const { data, isLoading, isError } = useQuery<CartPayload>({
    queryKey: CART_KEY,
    queryFn: async () => {
      const res = await fetch("/api/cart", { cache: "no-store" })
      if (res.status === 401) {
        router.replace("/login")
        throw new Error("Sesi berakhir")
      }
      if (!res.ok) throw new Error("Gagal memuat keranjang")
      return res.json()
    },
    staleTime: 5_000,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CART_KEY })

  // Tiga mutasi di bawah semuanya optimistik ala kanban: cache lokal diubah
  // seketika di onMutate (baris bergerak, kartu hilang, qty bertambah) dan
  // server dikonfirmasi via invalidate di onSettled. Subtotal TIDAK dihitung
  // lokal dari qty × unitPrice untuk menggantikan angka server — voucher dan
  // koreksi harga server tidak ikut dalam hitungan itu — jadi onSettled
  // mereconcile-nya dengan angka resmi secepat refetch selesai.
  const patchLine = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string
      body: { qty?: number; note?: string | null }
    }) => {
      const res = await csrfFetch(`/api/cart/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? "Gagal memperbarui keranjang")
      }
      return res.json()
    },
    onMutate: async ({
      id,
      body,
    }: {
      id: string
      body: { qty?: number; note?: string | null }
    }) => {
      await queryClient.cancelQueries({ queryKey: CART_KEY })
      const previous = queryClient.getQueryData<CartPayload>(CART_KEY)
      queryClient.setQueryData<CartPayload>(CART_KEY, (old) => {
        if (!old) return old
        const items = patchCartLine(old.items, id, body, clampQty)
        return { ...old, items, subtotal: cartSubtotal(items) }
      })
      haptic()
      return { previous: rollback(previous ? [previous] : []) }
    },
    onSettled: invalidate,
    onSuccess: invalidate,
    onError: (e: Error, _vars, context) => {
      queryClient.setQueryData(CART_KEY, context?.previous?.[0])
      setError(e.message)
    },
  })

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const res = await csrfFetch(`/api/cart/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus item")
      return res.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: CART_KEY })
      const previous = queryClient.getQueryData<CartPayload>(CART_KEY)
      queryClient.setQueryData<CartPayload>(CART_KEY, (old) => {
        if (!old) return old
        const items = dropItem(old.items, (line) => line.id === id)
        return { ...old, items, subtotal: cartSubtotal(items) }
      })
      haptic()
      return { previous: rollback(previous ? [previous] : []) }
    },
    onSettled: invalidate,
    onSuccess: invalidate,
    onError: (e: Error, _id, context) => {
      queryClient.setQueryData(CART_KEY, context?.previous?.[0])
      setError(e.message)
    },
  })

  const clearCart = useMutation({
    mutationFn: async () => {
      const res = await csrfFetch("/api/cart", { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal mengosongkan keranjang")
      return res.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: CART_KEY })
      const previous = queryClient.getQueryData<CartPayload>(CART_KEY)
      queryClient.setQueryData<CartPayload>(CART_KEY, (old) =>
        old ? { ...old, items: [], subtotal: 0 } : old
      )
      haptic()
      return { previous: rollback(previous ? [previous] : []) }
    },
    onSettled: invalidate,
    onSuccess: invalidate,
    onError: (e: Error, _vars, context) => {
      queryClient.setQueryData(CART_KEY, context?.previous?.[0])
      setError(e.message)
    },
  })

  const items = data?.items ?? []
  const availableItems = items.filter((line) => line.available)
  const blocked = items.some((line) => !line.available)
  const busy = patchLine.isPending || removeLine.isPending || clearCart.isPending

  if (isLoading) return <CartSkeleton />

  if (isError) {
    return (
      <PageShell className="py-8">
        <h1 className="text-3xl font-bold tracking-tight">Keranjang</h1>
        <EmptyState
          className="mt-6"
          icon={AlertTriangle}
          title="Keranjang gagal dimuat"
          description="Koneksi ke server terputus. Coba muat ulang halaman ini."
          action={
            <Button onClick={() => invalidate()}>Coba lagi</Button>
          }
        />
      </PageShell>
    )
  }

  if (items.length === 0) {
    return (
      <PageShell className="py-8">
        <h1 className="text-3xl font-bold tracking-tight">Keranjang</h1>
        <EmptyState
          className="mt-6"
          icon={ShoppingCart}
          title="Keranjang masih kosong"
          description="Tambahkan jasa dari katalog, lalu selesaikan semuanya dalam satu kali checkout."
          action={
            <Link href="/services">
              <Button className="shadow-glow">Cari jasa</Button>
            </Link>
          }
        />
      </PageShell>
    )
  }

  return (
    <PageShell className="py-8 pb-40 animate-content-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Keranjang
            <span className="ml-2 align-middle text-base font-semibold text-muted-foreground">
              {items.length} jasa
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {availableItems.length} siap dipesan · satu pesanan per penyedia
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError("")
            clearCart.mutate()
          }}
          className="focus-ring rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-destructive-strong disabled:opacity-50"
        >
          Kosongkan
        </button>
      </div>

      {blocked && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive-strong"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Ada jasa yang sudah tidak tayang. Hapus item bertanda merah dulu
          sebelum checkout.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-strong"
        >
          {error}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {items.map((line) => (
          <CartLineRow
            key={line.id}
            line={line}
            busy={busy}
            noteOpen={editingNote === line.id}
            onToggleNote={() =>
              setEditingNote(editingNote === line.id ? null : line.id)
            }
            onQty={(qty) => {
              setError("")
              patchLine.mutate({ id: line.id, body: { qty } })
            }}
            onNote={(note) => {
              setError("")
              patchLine.mutate({ id: line.id, body: { note } })
              setEditingNote(null)
            }}
            onRemove={() => {
              setError("")
              removeLine.mutate(line.id)
            }}
          />
        ))}
      </ul>

      {/* Bar total + aksi. Ditempelkan di atas bottom-nav mobile supaya
          keputusan "lanjut atau tidak" selalu dalam jangkauan jempol. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 lg:static lg:mt-6 lg:rounded-2xl lg:border lg:bg-card lg:px-5 lg:py-4 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <div className="text-2xs uppercase tracking-wide text-muted-foreground">
              Total
            </div>
            <div className="truncate text-lg font-extrabold tabular-nums text-primary-strong">
              {formatIDR(data?.subtotal ?? 0)}
            </div>
          </div>
          <div className="ml-auto w-full max-w-[16rem]">
            <Button
              className="w-full shadow-glow"
              size="lg"
              disabled={blocked || availableItems.length === 0}
              onClick={() => {
                setError("")
                router.push("/checkout?from=cart")
              }}
            >
              Checkout
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

function CartLineRow({
  line,
  busy,
  noteOpen,
  onToggleNote,
  onQty,
  onNote,
  onRemove,
}: {
  line: CartLine
  busy: boolean
  noteOpen: boolean
  onToggleNote: () => void
  onQty: (qty: number) => void
  onNote: (note: string) => void
  onRemove: () => void
}) {
  const [draftNote, setDraftNote] = React.useState(line.note ?? "")
  const city = line.service.provider.city
    ? line.service.provider.city
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : null

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card p-3 sm:p-4",
        line.available ? "border-border" : "border-destructive/30"
      )}
    >
      <div className="flex gap-3">
        <Link
          href={line.service.slug ? `/service/${line.service.slug}` : "/services"}
          className="focus-ring relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-accent sm:h-24 sm:w-24"
        >
          {line.service.imageUrl ? (
            <Image
              src={line.service.imageUrl}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              unoptimized={line.service.imageUrl.startsWith("data:")}
            />
          ) : (
            <Store
              className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/50"
              aria-hidden
            />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={line.service.slug ? `/service/${line.service.slug}` : "/services"}
                className="focus-ring line-clamp-2 rounded text-sm font-semibold leading-snug transition-colors hover:text-primary-strong sm:text-base"
              >
                {line.service.title}
              </Link>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {line.service.provider.name ?? "Penyedia"}
                {city ? ` · ${city}` : ""}
              </p>
              {line.packageName && (
                <span className="mt-1.5 inline-flex items-center rounded-md bg-info-soft px-1.5 py-0.5 text-2xs font-semibold text-info">
                  Paket {line.packageName}
                </span>
              )}
            </div>

            <button
              type="button"
              aria-label={`Hapus ${line.service.title} dari keranjang`}
              disabled={busy}
              onClick={onRemove}
              className="focus-ring -mt-1 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-strong disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {!line.available ? (
            <p className="mt-2 text-xs font-medium text-destructive-strong">
              Jasa ini sudah tidak tayang — hapus untuk lanjut checkout.
            </p>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <PriceBlock amount={line.unitPrice} size="md" suffix="/ item" />
              <QtyStepper
                qty={line.qty}
                disabled={busy}
                onChange={onQty}
                label={line.service.title}
              />
            </div>
          )}

          {line.available && (
            <div className="mt-2.5">
              {noteOpen ? (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    autoFocus
                    maxLength={300}
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Contoh: AC 1 PK di kamar utama, akses lewat samping"
                    aria-label={`Catatan untuk ${line.service.title}`}
                    className="focus-ring w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-xs placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onNote(draftNote.trim())}
                    >
                      Simpan catatan
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onToggleNote}
                      disabled={busy}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onToggleNote}
                  className="focus-ring rounded text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  {line.note ? `Catatan: ${line.note}` : "+ Tambah catatan"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

/**
 * Pengatur jumlah. Tombol `−` dinonaktifkan pada 1 (bukan menghapus item):
 * menekan kurang sekali lagi setelah item terakhir biasanya berarti
 * "turunkan jumlah", bukan "hapus" — penghapusan punya tombol sendiri.
 */
function QtyStepper({
  qty,
  disabled,
  onChange,
  label,
}: {
  qty: number
  disabled: boolean
  onChange: (qty: number) => void
  label: string
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-border">
      <button
        type="button"
        disabled={disabled || qty <= 1}
        aria-label={`Kurangi jumlah ${label}`}
        onClick={() => onChange(clampQty(qty - 1))}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        aria-live="polite"
        className="w-9 text-center text-sm font-semibold tabular-nums"
      >
        {qty}
      </span>
      <button
        type="button"
        disabled={disabled || qty >= MAX_CART_QTY}
        aria-label={`Tambah jumlah ${label}`}
        onClick={() => onChange(clampQty(qty + 1))}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:bg-accent disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

function CartSkeleton() {
  return (
    <PageShell className="py-8">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />
      <div className="mt-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </PageShell>
  )
}
