"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { PageShell, PageHeader } from "@/components/layout/page-shell"
import { MessageThread } from "@/components/orders/message-thread"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type Conversation = {
  type: "direct" | "order"
  id: string
  name: string
  avatarUrl: string | null
  serviceTitle: string | null
  orderStatus: string | null
  lastContent: string | null
  lastAt: string
  unread: number
}

/** Waktu relatif ringan — cocok untuk baris inbox. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const menit = Math.floor(diff / 60_000)
  if (menit < 1) return "Baru saja"
  if (menit < 60) return `${menit} mnt`
  const jam = Math.floor(menit / 60)
  if (jam < 24) return `${jam} jam`
  const hari = Math.floor(jam / 24)
  if (hari < 7) return `${hari} hari`
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  })
}

function InboxSkeleton() {
  return (
    <PageShell className="py-8">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-3 h-5 w-72" />
      <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
        <div className="space-y-3 rounded-2xl border border-border p-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </PageShell>
  )
}

function MessagesContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const peer = searchParams.get("peer")
  const order = searchParams.get("order")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const { data, isLoading } = useQuery<{
    unreadTotal: number
    conversations: Conversation[]
  }>({
    queryKey: ["inbox"],
    queryFn: async () => {
      const res = await fetch("/api/messages/inbox", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat inbox")
      return res.json()
    },
    enabled: status === "authenticated",
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  if (status !== "authenticated") return <InboxSkeleton />

  const conversations = data?.conversations ?? []
  const selected =
    conversations.find(
      (c) =>
        (peer && c.type === "direct" && c.id === peer) ||
        (order && c.type === "order" && c.id === order)
    ) ?? null
  const hasSelection = Boolean(peer || order)

  const open = (c: Conversation) => {
    router.replace(
      c.type === "direct" ? `/messages?peer=${c.id}` : `/messages?order=${c.id}`
    )
  }

  return (
    <PageShell className="py-8 animate-content-in">
      <PageHeader
        title="Pesan"
        description="Percakapan langsung dengan pelanggan & penyedia jasa — semuanya dalam satu kotak masuk."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* Daftar percakapan — di mobile disembunyikan saat thread terbuka */}
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-border bg-card",
            hasSelection && "hidden lg:block"
          )}
        >
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare
                className="mx-auto h-9 w-9 text-muted-foreground/40"
                aria-hidden
              />
              <p className="mt-3 text-sm font-medium">
                Belum ada percakapan
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mulai chat dari halaman jasa yang Anda minati.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.map((c) => {
                const active =
                  (c.type === "direct" && c.id === peer) ||
                  (c.type === "order" && c.id === order)
                return (
                  <li key={`${c.type}-${c.id}`}>
                    <button
                      type="button"
                      onClick={() => open(c)}
                      aria-current={active || undefined}
                      className={cn(
                        "focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent",
                        active && "bg-accent"
                      )}
                    >
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-strong">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {c.name}
                          </span>
                          <span className="shrink-0 text-2xs text-muted-foreground">
                            {timeAgo(c.lastAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">
                            {c.serviceTitle ? `${c.serviceTitle} · ` : ""}
                            {c.lastContent ?? "Belum ada pesan"}
                          </span>
                          {c.unread > 0 && (
                            <span
                              aria-label={`${c.unread} pesan belum dibaca`}
                              className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-primary-foreground"
                            >
                              {c.unread > 9 ? "9+" : c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Panel thread — di mobile tampil hanya saat ada pilihan */}
        <div className={cn(hasSelection ? "block" : "hidden lg:block")}>
          <button
            type="button"
            onClick={() => router.replace("/messages")}
            className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Semua percakapan
          </button>

          {order ? (
            <MessageThread
              orderId={order}
              otherName={selected?.name ?? "Lawan bicara"}
            />
          ) : peer ? (
            <MessageThread peerId={peer} otherName={selected?.name ?? undefined} />
          ) : (
            <div className="hidden rounded-2xl border border-dashed border-border p-12 text-center lg:block">
              <MessageSquare
                className="mx-auto h-10 w-10 text-muted-foreground/40"
                aria-hidden
              />
              <p className="mt-3 text-sm font-medium">Pilih percakapan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Atau mulai chat dari halaman jasa yang diminati.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <MessagesContent />
    </Suspense>
  )
}
