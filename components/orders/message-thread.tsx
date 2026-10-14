"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "@/lib/toast-dynamic"
import { Send, MessageSquare, Loader2, Check } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { sameId } from "@/lib/ids"
import { haptic } from "@/lib/haptic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { useMessageStream } from "@/hooks/use-message-stream"

type MessageItem = {
  id: string | number
  content: string
  createdAt: string
  sender: { id: string | number; name: string | null }
}

const MAX_LENGTH = 500

export function MessageThread({
  orderId,
  peerId,
  otherName,
}: {
  orderId?: string | number
  peerId?: string | number
  otherName?: string
}) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [draft, setDraft] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Dua mode: thread pesanan (orderId) atau chat lepas-pesanan (peerId).
  const threadKey =
    orderId != null ? `order-${orderId}` : `peer-${String(peerId)}`
  const getUrl =
    orderId != null
      ? `/api/orders/${orderId}/messages`
      : `/api/messages?peer=${peerId}`

  const { data, isLoading } = useQuery<{
    peer?: { id: string | number; name: string | null }
    messages: MessageItem[]
  }>({
    queryKey: ["messages", threadKey],
    queryFn: async () => {
      const res = await fetch(getUrl, { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat pesan")
      const json = await res.json()
      // Thread pesanan mengembalikan array polos; chat lepas-pesanan
      // { peer, messages } — nama lawan ikut terbawa untuk header.
      return Array.isArray(json) ? { messages: json } : json
    },
    staleTime: 5000,
    gcTime: 30_000,
    refetchOnWindowFocus: false,
  })

  // Realtime: stream memberi tahu thread mana yang mendapat pesan baru —
  // invalidate hanya untuk thread yang sedang terbuka, bukan refetch penuh
  // tiap 15 detik. threadKey klien (order-<id> / peer-<id>) identik dengan
  // yang dikirim server, jadi pencocokannya string biasa.
  // ── Indikator "sedang mengetik" (realtime via SSE) ─────────────────
  const [typingName, setTypingName] = React.useState<string | null>(null)
  const typingTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPingAt = React.useRef(0)

  const { subscribe } = useMessageStream(true)
  React.useEffect(() => {
    return subscribe((event) => {
      if (event.type === "thread" && event.threadId === threadKey) {
        queryClient.invalidateQueries({ queryKey: ["messages", threadKey] })
        // Pesan baru berarti pengetikan selesai — indikator padam seketika,
        // tidak menunggu timer 6s habis (efek "mengetik → langsung muncul").
        setTypingName(null)
        return
      }
      if (event.type === "typing" && event.threadId === threadKey) {
        setTypingName(event.name ?? "Lawan bicara")
        if (typingTimer.current) clearTimeout(typingTimer.current)
        // Server memancarkan tiap 5s selagi mengetik; entri mati sendiri
        // lewat TTL 8s di server. Klien memadamkan tampilan 6s setelah
        // event terakhir — cukup untuk jeda ketik normal, cepat untuk berhenti.
        typingTimer.current = setTimeout(() => setTypingName(null), 6000)
      }
    })
  }, [subscribe, threadKey, queryClient])

  React.useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current)
    },
    []
  )

  // Fire-and-forget: kegagalan jaringan hanya berarti indikator padam
  // lebih cepat — tidak ada yang perlu di-rollback.
  const sendTypingPing = React.useCallback(
    (done: boolean) => {
      void csrfFetch("/api/messages/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: threadKey, done }),
      }).catch(() => {})
    },
    [threadKey]
  )

  const messages = data?.messages
  const displayName = otherName || data?.peer?.name || "Pengguna"

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages?.length])

  // JANGAN Number(...) di sini: pada MongoDB `session.user.id` adalah ObjectId
  // 24-hex, sehingga Number() menghasilkan NaN dan setiap pesan akan dirender
  // sebagai milik orang lain.
  const myId = session?.user?.id
  const [optimistic, setOptimistic] = React.useState<MessageItem | null>(null)

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      // csrfFetch, bukan fetch: middleware menolak POST tanpa header x-csrf-token
      // dengan 403, sehingga kirim pesan selalu gagal di produksi.
      const url =
        orderId != null ? `/api/orders/${orderId}/messages` : "/api/messages"
      const body =
        orderId != null
          ? JSON.stringify({ content })
          : JSON.stringify({ recipientId: String(peerId), content })
      try {
        const res = await csrfFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw Object.assign(new Error(data?.error ?? "Pesan gagal terkirim"), { offline: false })
        }
        return res.json()
      } catch (err) {
        // Kegagalan jaringan murni (TypeError fetch) = kemungkinan besar OFFLINE:
        // masukkan outbox agar diantar otomatis saat online, alih-alih memaksa
        // pengguna menyalin-ulang teksnya. Error server (res !ok) tetap gagal
        // biasa — pengguna harus tahu pesan itu DITOLAK, bukan tertunda.
        if (err instanceof TypeError) {
          const { enqueueOutbox } = await import("@/lib/outbox")
          enqueueOutbox({
            url,
            body,
            label: "Pesan",
          })
          throw Object.assign(new Error("Sedang offline — pesan masuk antrean dan terkirim otomatis saat online"), { offline: true })
        }
        throw err
      }
    },
    onSuccess: () => {
      setOptimistic(null)
      setDraft("")
      queryClient.invalidateQueries({ queryKey: ["messages", threadKey] })
      // Badge unread di navbar & bottom-nav ikut menyesuaikan.
      queryClient.invalidateQueries({ queryKey: ["inbox"] })
    },
    onError: (error: Error, content) => {
      setOptimistic(null)
      setDraft(content)
      toast.error("Pesan gagal terkirim", { description: error.message })
    },
  })

  const send = () => {
    const content = draft.trim()
    if (!content || sendMutation.isPending) return
    haptic()
    // Berhenti mengetik di sisi server — pesan sudah menjadi kabar berikutnya.
    sendTypingPing(true)
    // Munculkan bubble langsung dengan status pending.
    setOptimistic({
      id: -Date.now(),
      content,
      createdAt: new Date().toISOString(),
      sender: { id: myId ?? 0, name: session?.user?.name ?? "Anda" },
    })
    setDraft("")
    sendMutation.mutate(content, {
      onError: () => setOptimistic(null),
    })
  }

  const remaining = MAX_LENGTH - draft.length

  return (
    <section
      aria-label={`Percakapan dengan ${displayName}`}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border bg-muted/40 px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary-strong" aria-hidden />
          Komunikasi dengan {displayName}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Koordinasikan jadwal, alamat, dan detail pekerjaan di sini.
        </p>
      </div>

      <div
        ref={scrollRef}
        aria-live="polite"
        className="max-h-80 space-y-4 overflow-y-auto p-5 lg:max-h-[50vh]"
      >
        {isLoading ? (
          // Skeleton berbentuk gelembung chat, bukan spinner di tengah:
          // bentuknya memberi tahu apa yang sedang dimuat.
          <div className="space-y-4">
            <Skeleton className="h-14 w-3/5 rounded-2xl" />
            <Skeleton className="ml-auto h-14 w-2/5 rounded-2xl" />
            <Skeleton className="h-14 w-1/2 rounded-2xl" />
          </div>
        ) : messages && messages.length === 0 && !optimistic ? (
          <div className="py-12 text-center">
            <MessageSquare
              className="mx-auto h-8 w-8 text-muted-foreground/40"
              aria-hidden
            />
            <p className="mt-3 text-sm font-medium">Belum ada pesan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mulai percakapan untuk mengoordinasikan jadwal kerja.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Halo, kapan bisa mulai?", "Alamat saya: ", "Bisa lihat foto hasil sebelumnya?"].map((q) => (
                <button key={q} type="button" onClick={() => setDraft(q)} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary-strong">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          [...(messages ?? []), ...(optimistic ? [optimistic] : [])].map((msg) => {
            const mine = sameId(msg.sender.id, myId)
            const pending = optimistic?.id === msg.id
            return (
              <div
                key={msg.id}
                className={cn("flex", mine ? "justify-end" : "justify-start", pending && "opacity-70")}
              >
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-4 py-2.5",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {!mine && (
                    <div className="mb-1 text-2xs font-semibold text-muted-foreground">
                      {msg.sender.name ?? "Pengguna"}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {msg.content}
                  </p>

                  <div
                    className={cn(
                      "mt-1.5 flex items-center justify-end gap-1.5 text-2xs",
                      mine
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    <time dateTime={msg.createdAt}>
                      {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                    {mine &&
                      (pending ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-label="Mengirim" />
                      ) : (
                        <Check className="h-3 w-3" aria-label="Terkirim" />
                      ))}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Baris indikator tinggi tetap (h-5) — muncul/hilang tanpa layout shift.
          aria-live membuat screen reader mengumumkan siapa yang sedang mengetik. */}
      <div className="h-5 px-5" aria-live="polite">
        {typingName && (
          <p className="flex items-center gap-1.5 text-2xs italic text-muted-foreground">
            {typingName} sedang mengetik
            <span className="inline-flex items-center gap-0.5" aria-hidden>
              <span className="h-1 w-1 animate-pulse rounded-full bg-current" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
            </span>
          </p>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-end gap-3">
          <label htmlFor={`message-${threadKey}`} className="sr-only">
            Tulis pesan ke {displayName}
          </label>
          <textarea
            id={`message-${threadKey}`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              // Debounce 3s: satu ping per interval selagi mengetik, bukan
              // per karakter — rate limit `typing` 60/menit memberi ruang
              // untuk dua thread + tab ganda dengan nyaman.
              const now = Date.now()
              if (e.target.value.trim() && now - lastPingAt.current > 3000) {
                lastPingAt.current = now
                sendTypingPing(false)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder={`Tulis pesan ke ${displayName}...`}
            className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
          />
          <button
            type="button"
            onClick={send}
            disabled={sendMutation.isPending || !draft.trim()}
            aria-label="Kirim pesan"
            className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-glow transition-transform duration-fast hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
          <span>Enter untuk kirim • Shift+Enter untuk baris baru</span>
          {remaining < 100 && <span>{remaining} karakter tersisa</span>}
        </div>
      </div>
    </section>
  )
}
