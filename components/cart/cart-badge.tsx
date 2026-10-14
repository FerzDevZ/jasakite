"use client"

import * as React from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { ShoppingCart } from "lucide-react"

/**
 * Ikon keranjang di navbar dengan jumlah baris.
 *
 * Angka diambil dari endpoint keranjang yang sama dengan halaman /keranjang
 * (react-query key `["cart"]`), sehingga menambah item dari halaman jasa
 * langsung memperbarui lencana tanpa polling tambahan — dan tidak ada dua
 * definisi "isi keranjang" yang bisa berbeda.
 *
 * `enabled` mengikat permintaan pada sesi yang sudah ada: pengunjung anonim
 * tidak boleh menembak endpoint 401 berulang kali di setiap halaman.
 */
export function CartBadge() {
  const { data: session, status } = useSession()

  const { data } = useQuery<{ items: unknown[] }>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await fetch("/api/cart", { cache: "no-store" })
      if (!res.ok) return { items: [] }
      return res.json()
    },
    enabled: status === "authenticated",
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

  if (!session?.user) return null

  const count = data?.items.length ?? 0

  return (
    <Link
      href="/keranjang"
      aria-label={count > 0 ? `Keranjang, ${count} jasa` : "Keranjang"}
      className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary-strong"
    >
      <ShoppingCart className="h-4 w-4" aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-primary-foreground"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
