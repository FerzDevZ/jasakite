"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/toast-dynamic"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { GripVertical, Inbox, Loader2, Banknote } from "lucide-react"
import { formatIDR } from "@/lib/utils"
import { sameId } from "@/lib/ids"
import { csrfFetch } from "@/lib/csrf-fetch"
import {
  canTransition,
  isOrderStatus,
  statusShortLabel,
  type OrderStatus,
} from "@/lib/order-status"

export type ProviderOrder = {
  id: string | number
  totalPrice: number
  status: string
  createdAt: string
  orderNotes: string | null
  service: { title: string; slug: string }
  paymentMethod?: string | null
}

// Titik warna kolom memakai token status yang sama dengan OrderStatusBadge,
// jadi indikator dan badge tidak pernah bercerita hal berbeda.
const COLUMNS: { key: OrderStatus; dot: string }[] = [
  { key: "PENDING", dot: "bg-warning" },
  { key: "IN_PROGRESS", dot: "bg-info" },
  { key: "COMPLETED", dot: "bg-success" },
]

const EMPTY_HINTS: Record<Exclude<OrderStatus, "CANCELLED">, string> = {
  PENDING: "Pesanan baru akan muncul di sini.",
  IN_PROGRESS: "Tarik kartu ke sini setelah diterima.",
  COMPLETED: "Tarik kartu ke sini saat pekerjaan beres.",
}

function OrderCard({
  order,
  busy,
  onTransition,
  dragging = false,
}: {
  order: ProviderOrder
  busy?: boolean
  onTransition?: (order: ProviderOrder, next: OrderStatus) => void
  dragging?: boolean
}) {
  return (
    <article
      className={
        dragging
          ? "w-full rotate-2 rounded-lg border border-primary/40 bg-card p-4 shadow-card-lg"
          : "rounded-lg border border-border bg-card p-4 shadow-sm"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/orders/${order.id}`}
          className="focus-ring rounded font-medium leading-snug hover:text-primary-strong"
          // Saat kartu di-drag, tautan tidak boleh ikut aktif.
          onClick={dragging ? (e) => e.preventDefault() : undefined}
          tabIndex={dragging ? -1 : undefined}
        >
          {order.service.title}
        </Link>
        <div className="shrink-0 text-sm font-bold text-primary-strong">
          {formatIDR(order.totalPrice)}
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Pesanan #{order.id} •{" "}
        {new Date(order.createdAt).toLocaleDateString("id-ID")}
      </p>

      {order.paymentMethod === "cash" && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-2 text-xs font-semibold text-warning">
          <Banknote className="h-3.5 w-3.5" aria-hidden /> TUNAI — dibayar
          langsung oleh pelanggan saat selesai, tanpa potongan.
        </p>
      )}

      {order.orderNotes && (
        <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs">
          {order.orderNotes}
        </p>
      )}

      {!dragging && order.status === "PENDING" && (
        <Button
          size="sm"
          className="mt-3 w-full"
          disabled={busy}
          onClick={() => onTransition?.(order, "IN_PROGRESS")}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Terima &amp; Kerjakan
        </Button>
      )}

      {!dragging && order.status === "IN_PROGRESS" && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          disabled={busy}
          onClick={() => onTransition?.(order, "COMPLETED")}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Tandai Selesai
        </Button>
      )}
    </article>
  )
}

function DraggableCard({
  order,
  busy,
  onTransition,
  onFocus,
}: {
  order: ProviderOrder
  busy?: boolean
  onTransition: (order: ProviderOrder, next: OrderStatus) => void
  onFocus?: (orderId: string | number) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={isDragging ? "opacity-40" : undefined}
      onFocus={() => onFocus?.(order.id)}
      tabIndex={0}
      // role="group", BUKAN "button".
      //
      // Aturan ARIA: seluruh keturunan elemen ber-role button dianggap
      // presentasional — peran dan nama aksesibelnya dibuang. Karena pegangan
      // drag ada DI DALAM pembungkus ini, role="button" membuatnya tidak terlihat
      // sama sekali oleh pembaca layar: tombolnya ada, bisa diklik, tetapi tidak
      // pernah diumumkan. role="group" mempertahankan label keyboard di bawah
      // sekaligus mengekspos pegangan itu sebagai tombol yang benar.
      role="group"
      aria-label={`Pesanan #${order.id} - ${order.service.title}. Gunakan panah untuk memindahkan status.`}
    >
      <div className="relative">
        {/* Pegangan drag eksplisit: tombol aksi & tautan tetap berfungsi
            normal, drag hanya dari ikon grip — pola Linear/Notion. */}
        <button
          type="button"
          aria-label={`Geser pesanan #${order.id} — tarik untuk ubah status`}
          title="Geser untuk ubah status"
          {...attributes}
          {...listeners}
          className="focus-ring absolute -left-2 -top-2 z-10 flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary hover:text-primary-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
        <OrderCard order={order} busy={busy} onTransition={onTransition} />
      </div>
    </div>
  )
}

function Column({
  col,
  items,
  isLoading,
  busyId,
  onTransition,
  activeStatus,
  onOrderFocus,
}: {
  col: { key: OrderStatus; dot: string }
  items: ProviderOrder[]
  isLoading: boolean
  busyId?: string | number
  onTransition: (order: ProviderOrder, next: OrderStatus) => void
  activeStatus?: OrderStatus | null
  onOrderFocus?: (orderId: string | number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const isValidTarget = !activeStatus || activeStatus === col.key || canTransition(activeStatus, col.key)
  const overValid = isOver && isValidTarget
  const overInvalid = isOver && !isValidTarget

  return (
    <section aria-label={statusShortLabel(col.key)}>
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${col.dot}`}
        />
        <h3 className="font-semibold">{statusShortLabel(col.key)}</h3>
        <Badge variant="outline" className="tabular-nums">
          {items.length}
        </Badge>
        {activeStatus && !isValidTarget && isOver && (
          <span className="ml-auto text-2xs font-medium text-destructive-strong">Tidak diizinkan</span>
        )}
      </div>

      <div
        ref={setNodeRef}
        aria-disabled={!isValidTarget}
        className={`min-h-32 space-y-3 rounded-2xl border-2 border-dashed p-3 transition-all duration-base ${
          overValid
            ? "scale-[1.02] border-primary/30 bg-primary/10 shadow-sm ring-2 ring-inset ring-primary/40"
            : overInvalid
              ? "border-destructive/40 bg-destructive/5"
              : "border-transparent bg-muted/50"
        }`}
      >
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Inbox
              className="h-8 w-8 text-muted-foreground/40"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">
              Tidak ada pesanan di kolom ini.
            </p>
            <p className="text-2xs text-muted-foreground/70">
              {EMPTY_HINTS[col.key as Exclude<OrderStatus, "CANCELLED">]}
            </p>
          </div>
        ) : (
          items.map((order) => (
            <DraggableCard
              key={order.id}
              order={order}
              busy={busyId !== undefined && sameId(busyId, order.id)}
              onTransition={onTransition}
              onFocus={onOrderFocus}
            />
          ))
        )}
      </div>
    </section>
  )
}

/**
 * Kanban pesanan provider: Menunggu → Dikerjakan → Selesai.
 *
 * Dua cara memindahkan kartu, keduanya melewati FSM yang sama:
 * 1. Tombol kontekstual per kartu (dipertahankan untuk aksesibilitas & E2E).
 * 2. Drag dari grip handle antar kolom — update cache secara optimistis,
 *    di-rollback + toast bila server menolak.
 */
export function OrderKanban() {
  const queryClient = useQueryClient()
  const [activeOrder, setActiveOrder] = useState<ProviderOrder | null>(null)

  // Mouse/pointer: drag baru aktif setelah geser 6px agar klik tombol/tautan
  // tidak memicu drag. Touch: long-press 250ms agar scroll layar tetap mulus.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  })
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 6 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 8 },
  })

  const { data: orders, isLoading } = useQuery<ProviderOrder[]>({
    queryKey: ["provider-orders"],
    queryFn: async () => {
      const res = await fetch("/api/provider/orders")
      if (!res.ok) throw new Error("Gagal memuat pesanan")
      return res.json()
    },
  })

  const statusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string | number
      status: OrderStatus
    }) => {
      const res = await csrfFetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error ?? "Gagal memperbarui status pesanan")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-orders"] })
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (error: Error) => {
      toast.error("Gagal memperbarui status", { description: error.message })
    },
  })

  const busyId = statusMutation.isPending
    ? statusMutation.variables?.orderId
    : undefined

  const moveOrder = (orderId: string | number, next: OrderStatus) => {
    const order = (orders ?? []).find((o) => sameId(o.id, orderId))
    if (!order || !isOrderStatus(order.status)) return
    if (order.status === next) return
    if (!canTransition(order.status, next)) {
      toast.error("Transisi tidak diizinkan", {
        description: `Tidak bisa dari "${statusShortLabel(order.status as OrderStatus)}" ke "${statusShortLabel(next)}".`,
      })
      return
    }

    // Optimistic: kartu langsung pindah kolom di cache; rollback bila gagal.
    const previous = queryClient.getQueryData<ProviderOrder[]>([
      "provider-orders",
    ])
    const prevStatus = order.status as OrderStatus
    queryClient.setQueryData<ProviderOrder[]>(["provider-orders"], (old) =>
      old?.map((o) => (sameId(o.id, orderId) ? { ...o, status: next } : o))
    )
    // Haptic
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as unknown as { vibrate: (n: number) => void }).vibrate(10) } catch {}
    }
    if (next === "COMPLETED" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      import("canvas-confetti").then(({ default: confetti }) => confetti({ particleCount: 45, spread: 60, origin: { y: 0.6 }, colors: ["#22c55e", "#FBBF24"] }))
    }
    const canUndo = canTransition(next, prevStatus)
    toast.success(
      next === "COMPLETED" ? "Pesanan ditandai selesai" : next === "CANCELLED" ? "Pesanan dibatalkan" : "Pesanan dipindahkan",
      canUndo
        ? {
            action: {
              label: "Urungkan",
              onClick: () => {
                queryClient.setQueryData<ProviderOrder[]>(["provider-orders"], (old) =>
                  old?.map((o) => (sameId(o.id, orderId) ? { ...o, status: prevStatus } : o))
                )
                statusMutation.mutate({ orderId, status: prevStatus })
              },
            },
            duration: 5000,
          }
        : { duration: 3000 }
    )
    statusMutation.mutate(
      { orderId, status: next },
      {
        onError: () => {
          if (previous) {
            queryClient.setQueryData(["provider-orders"], previous)
          }
        },
      }
    )
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveOrder(
      (orders ?? []).find((o) => sameId(o.id, String(event.active.id))) ?? null
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null)
    const { active, over } = event
    if (!over) return
    const orderId = String(active.id)
    const target = over.id as OrderStatus
    moveOrder(orderId, target)
  }

  const all = orders ?? []
  const activeStatus = activeOrder?.status as OrderStatus | undefined

  // Keyboard shortcuts for kanban navigation
  const [focusedOrderId, setFocusedOrderId] = useState<string | number | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!focusedOrderId) return
      const order = all.find((o) => sameId(o.id, focusedOrderId))
      if (!order || !isOrderStatus(order.status)) return

      const currentStatus = order.status as OrderStatus

      // Panah memakai tangga status yang sama dengan drag. Transisi yang
      // ditolak FSM TIDAK boleh diam saja: pengguna keyboard harus tahu
      // kenapa kartu tidak pindah — toast yang sama dengan jalur drag.
      const ladder = ["PENDING", "IN_PROGRESS", "COMPLETED"]
      const currentIdx = ladder.indexOf(currentStatus)

      if (e.key === "ArrowRight" && currentIdx < ladder.length - 1) {
        e.preventDefault()
        const next = ladder[currentIdx + 1] as OrderStatus
        if (canTransition(currentStatus, next)) {
          moveOrder(order.id, next)
        } else {
          toast.error("Transisi tidak diizinkan", {
            description: `${currentStatus} tidak bisa pindah ke ${next}.`,
          })
        }
      }

      if (e.key === "ArrowLeft" && currentIdx > 0) {
        e.preventDefault()
        const prev = ladder[currentIdx - 1] as OrderStatus
        if (canTransition(currentStatus, prev)) {
          moveOrder(order.id, prev)
        } else {
          toast.error("Transisi tidak diizinkan", {
            description: `${currentStatus} tidak bisa pindah ke ${prev}.`,
          })
        }
      }

      // Enter: Open order details
      if (e.key === "Enter") {
        e.preventDefault()
        window.location.href = `/orders/${order.id}`
      }
    },
    [focusedOrderId, all, moveOrder]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  return (
    <DndContext
      sensors={[pointerSensor, mouseSensor, touchSensor]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveOrder(null)}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            col={col}
            items={all.filter((o) => o.status === col.key)}
            isLoading={isLoading}
            busyId={busyId}
            activeStatus={activeStatus ?? null}
            onTransition={(order, next) => moveOrder(order.id, next)}
            onOrderFocus={setFocusedOrderId}
          />
        ))}
      </div>

      {all.filter((o) => o.status === "CANCELLED").length > 0 && (
        <details className="mt-6 rounded-2xl border border-border bg-card p-4">
          <summary className="cursor-pointer list-none text-sm font-medium flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-destructive" aria-hidden /> Dibatalkan ({all.filter((o) => o.status === "CANCELLED").length})
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {all.filter((o) => o.status === "CANCELLED").map((order) => (
              <article key={order.id} className="rounded-lg border border-border bg-muted/30 p-4 opacity-70">
                <div className="truncate font-medium">{order.service.title}</div>
                <p className="text-xs text-muted-foreground">Pesanan #{order.id} • {new Date(order.createdAt).toLocaleDateString("id-ID")}</p>
                {order.orderNotes && <p className="mt-2 rounded bg-muted px-2 py-1 text-xs">{order.orderNotes}</p>}
              </article>
            ))}
          </div>
        </details>
      )}

      {/* Kartu bayangan yang mengikuti kursor saat drag */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeOrder ? (
          <OrderCard order={activeOrder} dragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
