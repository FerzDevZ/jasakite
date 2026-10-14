"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BellOff,
  ClipboardList,
  MessageSquare,
  Sparkles,
  Tag,
  CheckCheck,
} from "lucide-react"
import { PageShell, PageHeader } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Segmented } from "@/components/ui/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { csrfFetch } from "@/lib/csrf-fetch"
import { markAllRead, markRead, rollback } from "@/lib/optimistic"
import { haptic } from "@/lib/haptic"
import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast-dynamic"

type Notification = {
  id: string
  type: "ORDER" | "MESSAGE" | "PROMO" | "SYSTEM"
  title: string
  body: string | null
  href: string | null
  read: boolean
  time: string
}

const TYPE_META = {
  ORDER: { icon: ClipboardList, label: "Pesanan" },
  MESSAGE: { icon: MessageSquare, label: "Pesan" },
  PROMO: { icon: Tag, label: "Promo" },
  SYSTEM: { icon: Sparkles, label: "Info" },
} as const

type Filter = "ALL" | "UNREAD"

/**
 * Kotak masuk notifikasi.
 *
 * Lonceng navbar hanya menampilkan beberapa item terakhir karena dropdown yang
 * panjang sulit dipakai di mobile; halaman ini yang menyimpan riwayat lengkap.
 * Tanpa halaman ini, notifikasi "pesanan mulai dikerjakan" yang lewat begitu
 * saja saat pengguna sedang tidak membuka aplikasi benar-benar hilang.
 *
 * Filter "Belum dibaca" dikerjakan di server (`?unread=1`) — menyaring di
 * klien akan membuat paginasi berbohong saat ada lebih dari 50 notifikasi.
 */
export function NotificationList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [filter, setFilter] = React.useState<Filter>("ALL")

  const { data, isLoading, isError } = useQuery<{
    items: Notification[]
    unreadCount: number
  }>({
    queryKey: ["notifications", filter],
    queryFn: async () => {
      const res = await fetch(
        `/api/notifications${filter === "UNREAD" ? "?unread=1" : ""}`,
        { cache: "no-store" }
      )
      if (res.status === 401) {
        router.replace("/login")
        throw new Error("Sesi berakhir")
      }
      if (!res.ok) throw new Error("Gagal memuat notifikasi")
      return res.json()
    },
    staleTime: 15_000,
  })

  // Optimistik ala kanban: baris langsung berubah jadi "dibaca" (kartu memudar,
  // titik biru hilang, penghitung Belum dibaca turun) tanpa menunggu server.
  // onSettled tetap invalidate — query UNREAD disaring di server, jadi data
  // cache lokal tidak cukup untuk memindahkan item antar filter.
  const markAll = useMutation({
    mutationFn: async () => {
      const res = await csrfFetch("/api/notifications", { method: "PATCH" })
      if (!res.ok) throw new Error("Gagal menandai notifikasi")
      return res.json()
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      const previous = queryClient.getQueryData<{
        items: Notification[]
        unreadCount: number
      }>(["notifications", filter])
      queryClient.setQueryData<{ items: Notification[]; unreadCount: number }>(
        ["notifications", filter],
        (old) =>
          old
            ? {
                items: markAllRead(old.items),
                unreadCount: 0,
              }
            : old
      )
      haptic()
      return { previous: rollback(previous ? [previous] : []) }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai sudah dibaca")
    },
    onError: (e: Error, _vars, context) => {
      queryClient.setQueryData(["notifications", filter], context?.previous?.[0])
      toast.error(e.message)
    },
  })

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await csrfFetch(`/api/notifications/${id}`, { method: "PATCH" })
      if (!res.ok) throw new Error("Gagal menandai notifikasi")
      return res.json()
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] })
      const previous = queryClient.getQueryData<{
        items: Notification[]
        unreadCount: number
      }>(["notifications", filter])
      queryClient.setQueryData<{ items: Notification[]; unreadCount: number }>(
        ["notifications", filter],
        (old) =>
          old
            ? {
                items: markRead(old.items, id),
                unreadCount: Math.max(0, old.unreadCount - 1),
              }
            : old
      )
      haptic()
      return { previous: rollback(previous ? [previous] : []) }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
    onError: (_e: Error, _id, context) => {
      queryClient.setQueryData(["notifications", filter], context?.previous?.[0])
    },
  })

  const items = data?.items ?? []
  const unread = data?.unreadCount ?? 0

  return (
    <PageShell width="prose" className="py-8 animate-content-in">
      <PageHeader
        title="Notifikasi"
        description="Kabar pesanan, pesan baru, dan promo — tersimpan supaya bisa dibaca ulang kapan saja."
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck aria-hidden /> Tandai semua dibaca
            </Button>
          ) : null
        }
      />

      <div className="mt-5">
        <Segmented<Filter>
          ariaLabel="Saring notifikasi"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "Semua" },
            {
              value: "UNREAD",
              label: unread > 0 ? `Belum dibaca (${unread})` : "Belum dibaca",
            },
          ]}
        />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={BellOff}
            title="Notifikasi gagal dimuat"
            description="Coba muat ulang halaman ini sebentar lagi."
            action={
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })}>
                Coba lagi
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title={filter === "UNREAD" ? "Semua sudah dibaca" : "Belum ada notifikasi"}
            description={
              filter === "UNREAD"
                ? "Tidak ada kabar baru. Kami akan memberi tahu saat pesananmu bergerak."
                : "Begitu ada pesanan masuk atau pesan baru, kabarnya muncul di sini."
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const meta = TYPE_META[item.type] ?? TYPE_META.SYSTEM
              const Icon = meta.icon
              return (
                <li key={item.id}>
                  <div
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border p-3.5 transition-colors sm:p-4",
                      item.read
                        ? "border-border bg-card"
                        : "border-primary/30 bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        item.read
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary-strong"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm",
                            item.read ? "font-medium" : "font-bold"
                          )}
                        >
                          {item.title}
                        </p>
                        <span className="shrink-0 text-2xs text-muted-foreground">
                          {item.time}
                        </span>
                      </div>
                      {item.body && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {item.body}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        {item.href && (
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (!item.read) markOne.mutate(item.id)
                            }}
                            className="focus-ring rounded text-xs font-semibold text-primary-strong underline-offset-4 hover:underline"
                          >
                            Buka detail
                          </Link>
                        )}
                        {!item.read && (
                          <button
                            type="button"
                            disabled={markOne.isPending}
                            onClick={() => markOne.mutate(item.id)}
                            className="focus-ring rounded text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
                          >
                            Tandai dibaca
                          </button>
                        )}
                        <span className="text-2xs uppercase tracking-wide text-muted-foreground/70">
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    {!item.read && (
                      <span
                        aria-label="Belum dibaca"
                        className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                      />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
