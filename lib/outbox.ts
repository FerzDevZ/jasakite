"use client"

import * as React from "react"

/**
 * Outbox klien: antrean aksi yang gagal karena OFFLINE, diantar ulang
 * otomatis saat koneksi kembali.
 *
 * Batasan desain yang disengaja (kesederhanaan > orkestrasi penuh):
 * - Hanya POST JSON yang replayable (kirim pesan) — dikirim ulang persis
 *   seperti aslinya, termasuk header CSRF lewat csrfFetch.
 * - Penyimpanan localStorage per-pengguna; aplikasi ini single-tab per
 *   percakapan, jadi kunci sederhana sudah cukup dan aman.
 * - URL & body DISIMPAN UTUH: tidak ada pembentukan ulang di flusher, satu
 *   sumber kebenaran bentuk request (mutation asli yang membuat entri).
 * - Tidak untuk aksi non-idempotent sensitif (checkout/pembayaran): pesan
 *   duplikat lebih mudah diterima daripada order duplikat.
 */

export type OutboxEntry = {
  id: string
  url: string
  body: string
  createdAt: number
  /** Label ramah untuk toast "n pesan menunggu dikirim". */
  label: string
}

const KEY_PREFIX = "jasakite-outbox"

function storageKey(): string {
  if (typeof window === "undefined") return KEY_PREFIX
  return `${KEY_PREFIX}`
}

function readAll(): OutboxEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is OutboxEntry =>
        typeof e === "object" && e !== null &&
        typeof (e as OutboxEntry).id === "string" &&
        typeof (e as OutboxEntry).url === "string" &&
        typeof (e as OutboxEntry).body === "string",
    )
  } catch {
    return []
  }
}

function writeAll(entries: OutboxEntry[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(entries))
  } catch {
    // Kuota penuh / storage diblokir: antrean bersifat best-effort — jangan
    // pernah menggagalkan aksi utama hanya karena outbox tak bisa menulis.
  }
}

export function enqueueOutbox(entry: Omit<OutboxEntry, "id" | "createdAt">): void {
  writeAll([
    ...readAll(),
    { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() },
  ])
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("jasakite-outbox-changed"))
  }
}

export function getOutboxSize(): number {
  return readAll().length
}

/**
 * Kirim ulang seluruh antrean secara berurutan (menjaga urutan percakapan).
 * Entri yang masih gagal (mis. 401 sesi habis) DIPERTAHANKAN; yang sukses
 * dibuang. Mengembalikan jumlah yang berhasil dikirim.
 */
export async function flushOutbox(): Promise<number> {
  const { csrfFetch } = await import("@/lib/csrf-fetch")
  const entries = readAll()
  if (entries.length === 0) return 0

  const remaining: OutboxEntry[] = []
  let sent = 0

  for (const entry of entries) {
    try {
      const res = await csrfFetch(entry.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: entry.body,
      })
      if (res.ok) {
        sent += 1
      } else {
        remaining.push(entry)
      }
    } catch {
      // Masih offline / jaringan putus lagi — simpan untuk percobaan berikutnya.
      remaining.push(entry)
    }
  }

  writeAll(remaining)
  if (sent > 0 || remaining.length !== entries.length) {
    window.dispatchEvent(new CustomEvent("jasakite-outbox-changed"))
  }
  return sent
}

/**
 * Hook pendengar status outbox + koneksinya. Mengembalikan jumlah entri
 * tertunda; flush otomatis dipicu saat kembali online (sekali per koneksi).
 */
export function useOutbox(): { pending: number } {
  const [pending, setPending] = React.useState(0)
  const flushing = React.useRef(false)

  React.useEffect(() => {
    const sync = () => setPending(getOutboxSize())
    sync()

    const onOnline = () => {
      if (flushing.current) return
      flushing.current = true
      flushOutbox()
        .then((sent) => {
          if (sent > 0) {
            import("sonner").then((m) =>
              m.toast.success(`${sent} pesan tertunda terkirim`, {
                description: "Antrean offline berhasil diantar ke server.",
              }),
            )
          }
        })
        .finally(() => {
          flushing.current = false
        })
    }

    window.addEventListener("online", onOnline)
    window.addEventListener("jasakite-outbox-changed", sync)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("jasakite-outbox-changed", sync)
    }
  }, [])

  return { pending }
}
