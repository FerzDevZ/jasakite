"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { ChevronRight, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

type Order = {
  id: string
  code: string | null
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  service: { title: string }
}

const STAGES: readonly Order["status"][] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
]

const STAGE_LABEL: Record<string, string> = {
  PENDING: "Menunggu konfirmasi penyedia",
  IN_PROGRESS: "Sedang dikerjakan",
  COMPLETED: "Selesai",
}

/**
 * Strip pelacakan pesanan aktif di beranda.
 *
 * Ini satu-satunya bagian beranda yang isinya berbeda per pengguna, dan justru
 * itu alasan keberadaannya: setelah memesan, pertanyaan berikutnya selalu
 * "sudah sampai mana?" — dan jawabannya harus ada di halaman pertama, bukan
 * tiga ketukan lagi di dalam menu Akun.
 *
 * Ditaruh di komponen klien supaya beranda tetap bisa di-cache sebagai ISR:
 * membaca sesi di server component akan memaksa seluruh halaman dirender per
 * permintaan hanya demi satu strip.
 */
export function ActiveOrderStrip() {
  const { status } = useSession()

  const { data } = useQuery<Order[]>({
    queryKey: ["orders", "active-strip"],
    queryFn: async () => {
      const res = await fetch("/api/orders", { cache: "no-store" })
      if (!res.ok) return []
      return res.json()
    },
    enabled: status === "authenticated",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  const active = (data ?? []).filter(
    (order) => order.status === "PENDING" || order.status === "IN_PROGRESS"
  )

  if (active.length === 0) return null

  return (
    <section
      aria-labelledby="pesanan-aktif-heading"
      className="mx-auto max-w-7xl px-4"
    >
      <div className="flex items-end justify-between gap-3">
        <h2
          id="pesanan-aktif-heading"
          className="flex items-center gap-2 text-lg font-bold tracking-tight sm:text-xl"
        >
          <ClipboardList className="h-5 w-5 text-primary-strong" aria-hidden />
          Pesananmu sedang berjalan
        </h2>
        <Link
          href="/orders"
          className="focus-ring shrink-0 rounded text-xs font-semibold text-primary-strong underline-offset-4 hover:underline"
        >
          Semua pesanan
        </Link>
      </div>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {active.slice(0, 2).map((order) => {
          const stage = STAGES.indexOf(order.status)
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="focus-ring flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-3.5 transition-colors hover:border-primary/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-2xs font-semibold text-muted-foreground">
                      {order.code ? `#${order.code}` : `#${order.id}`}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold">
                    {order.service.title}
                  </span>
                  {/* Progres tiga titik: bentuk paling ringkas dari timeline
                      yang sama di halaman pesanan, jadi tidak ada dua definisi
                      tahapan yang bisa berbeda. */}
                  <span className="mt-2 flex items-center gap-1" aria-hidden>
                    {STAGES.map((s, i) => (
                      <span
                        key={s}
                        className={cn(
                          "h-1 flex-1 rounded-full",
                          i <= stage ? "bg-primary" : "bg-border"
                        )}
                      />
                    ))}
                  </span>
                  <span className="mt-1.5 block text-2xs font-medium text-primary-strong">
                    {STAGE_LABEL[order.status]}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
