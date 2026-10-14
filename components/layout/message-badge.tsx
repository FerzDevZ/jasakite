"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { MessageCircle } from "lucide-react"
import { useMessageStream } from "@/hooks/use-message-stream"

/**
 * Satu sumber angka pesan belum-dibaca untuk Navbar (desktop) dan
 * BottomNav (mobile). Realtime via SSE singleton; saat stream gagal, hook
 * stream otomatis turun ke polling 60s — angka tetap segar tanpa tiap
 * komponen memutar interval sendiri.
 */
export function useUnreadMessages() {
  const { data: session } = useSession()
  const [count, setCount] = React.useState(0)

  const load = React.useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch("/api/messages/inbox", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setCount(data.unreadTotal ?? 0)
    } catch {
      // polling gagal — abaikan, coba lagi di interval berikutnya
    }
  }, [session])

  // Nilai awal (dan setelah login): satu fetch langsung.
  React.useEffect(() => {
    if (!session?.user) return
    load()
  }, [load, session])

  // Realtime: badge mengikuti event SSE. Kalau stream gagal, hook internal
  // otomatis mengganti dengan polling 60s yang memancarkan event unread
  // yang sama — komponen ini tidak perlu tahu bedanya.
  const { subscribe } = useMessageStream(Boolean(session?.user))
  React.useEffect(() => {
    if (!session?.user) return
    return subscribe((event) => {
      if (event.type === "unread") setCount(event.count)
    })
  }, [session, subscribe])

  return count
}

export function MessageBadge() {
  const { data: session } = useSession()
  const count = useUnreadMessages()

  if (!session?.user) return null

  return (
    <Link
      href="/messages"
      aria-label={
        count > 0 ? `${count} pesan belum dibaca` : "Pesan"
      }
      className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary-strong"
    >
      <MessageCircle className="h-4 w-4" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold text-destructive-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
      {/* Live region untuk screen reader */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {count > 0 ? `${count} pesan belum dibaca` : ""}
      </span>
    </Link>
  )
}
