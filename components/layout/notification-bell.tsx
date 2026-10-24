"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Bell, ClipboardList, MessageSquare, Sparkles, Tag } from "lucide-react"
import { csrfFetch } from "@/lib/csrf-fetch"
import { useMessageStream } from "@/hooks/use-message-stream"
import { cn } from "@/lib/utils"

type NotificationItem = {
  id: string
  type: "ORDER" | "MESSAGE" | "PROMO" | "SYSTEM"
  title: string
  body: string | null
  href: string | null
  read: boolean
  time: string
}

const TYPE_ICON = {
  ORDER: ClipboardList,
  MESSAGE: MessageSquare,
  PROMO: Tag,
  SYSTEM: Sparkles,
} as const

/**
 * Lonceng notifikasi.
 *
 * Perubahan yang penting di sini: daftar berasal dari model `Notification`
 * (judul, isi, tautan, status dibaca) — bukan diturunkan dari kueri pesanan.
 * Sebelumnya lonceng hanya bisa menampilkan pesan pesanan, dan tombolnya
 * menembak PATCH yang tidak punya handler sehingga angka lama selalu kembali
 * pada polling berikutnya.
 *
 * Dropdown ini hanya jendela cepat; arsip lengkapnya ada di /notifications,
 * karena notifikasi yang tidak bisa dibaca ulang sama saja dengan toast.
 *
 * Sumber pembaruannya adalah stream SSE yang sudah dipakai badge pesan —
 * satu koneksi per tab, bukan polling 60 detik milik komponen ini sendiri.
 * Fetch langsung tetap dipakai untuk tampilan pertama dan saat tab kembali
 * aktif; interval 60 detik hanya dihidupkan kalau stream benar-benar gagal.
 */
export function NotificationBell() {
  const { data: session } = useSession()
  const [count, setCount] = React.useState(0)
  const [items, setItems] = React.useState<NotificationItem[]>([])
  const [open, setOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setCount(data.unreadCount ?? data.count ?? 0)
      setItems(data.items ?? [])
    } catch {
      // polling gagal — abaikan, coba lagi di interval berikutnya
    }
  }, [session])

  const markRead = React.useCallback(async () => {
    if (!session?.user || count === 0) return
    setCount(0)
    setItems((prev) => prev.map((item) => ({ ...item, read: true })))
    try {
      await csrfFetch("/api/notifications", { method: "PATCH" })
    } catch {
      // abaikan — angka sudah 0 di UI, dan polling berikutnya akan
      // mengembalikannya bila server memang belum tersimpan
    }
  }, [session, count])

  const { status, subscribe } = useMessageStream(Boolean(session?.user))

  // Nilai pertama + penyegaran saat tab kembali aktif.
  React.useEffect(() => {
    load()
    const onVis = () => {
      if (!document.hidden) load()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [load])

  // Realtime: server mengirim daftar lonceng lewat stream yang sama dengan
  // badge pesan, dan hanya saat isinya berubah.
  React.useEffect(() => {
    return subscribe((event) => {
      if (event.type !== "notifications") return
      setCount(event.unreadCount)
      setItems(event.items)
    })
  }, [subscribe])

  // Hanya bila stream gagal total (proxy tanpa streaming): kembali ke polling.
  // Fitur turun satu tingkat, tidak hilang.
  React.useEffect(() => {
    if (status !== "failed") return
    const interval = setInterval(() => {
      if (!document.hidden) load()
    }, 60_000)
    return () => clearInterval(interval)
  }, [status, load])

  // Escape menutup dropdown — prasyarat dialog non-modal yang bisa
  // didismiss keyboard (WCAG 2.1.2). Tanpa ini, pengguna keyboard harus
  // mengklik luar atau pindah fokus untuk menutupnya.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  if (!session?.user) return null

  const visible = items.slice(0, 6)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false)
            return
          }
          setOpen(true)
          markRead()
        }}
        aria-label={count > 0 ? `${count} notifikasi baru` : "Notifikasi"}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary-strong"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold text-destructive-foreground"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
        {/* Live region untuk screen reader — memberitahu jumlah notifikasi baru */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {count > 0 ? `${count} notifikasi baru` : ""}
        </span>
      </button>

      {open && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notifikasi"
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-card-lg"
          >
            {visible.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada notifikasi
              </p>
            ) : (
              <>
                <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                  {visible.map((item) => {
                    const Icon = TYPE_ICON[item.type] ?? Bell
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href ?? "/notifications"}
                          onClick={() => setOpen(false)}
                          className="focus-ring flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                              item.read
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary-strong"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span
                                className={cn(
                                  "line-clamp-1 text-sm",
                                  item.read ? "font-medium" : "font-semibold"
                                )}
                              >
                                {item.title}
                              </span>
                              <span className="shrink-0 text-2xs text-muted-foreground">
                                {item.time}
                              </span>
                            </span>
                            {item.body && (
                              <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                                {item.body}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
                <div className="border-t border-border">
                  <Link
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className="focus-ring block px-4 py-2.5 text-center text-xs font-semibold text-primary-strong transition-colors hover:bg-accent"
                  >
                    Lihat semua notifikasi
                  </Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
