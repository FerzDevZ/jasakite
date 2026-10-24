/**
 * Helper Streaming Server-Sent Events — murni, tanpa I/O.
 *
 * Endpoint /api/messages/stream dan hook klien `useMessageStream` berbagi
 * format yang sama; memisahkan format dari I/O membuat dua sisi itu bisa
 * diuji unit tanpa server, EventSource, atau jaringan — pola yang sama
 * dengan lib/cart.ts dan lib/optimistic.ts.
 */

import type { NotificationFeedItem } from "@/lib/notifications-feed"

/** Event yang dikirim server ke klien melalui stream pesan realtime. */
export type MessageStreamEvent =
  | { type: "unread"; count: number }
  /**
   * Daftar notifikasi lonceng. Dulu lonceng memutar polling 60 detik sendiri;
   * sekarang menumpang stream yang sama, sehingga satu koneksi per tab
   * melayani badge pesan sekaligus notifikasi.
   */
  | {
      type: "notifications"
      unreadCount: number
      items: NotificationFeedItem[]
    }
  | {
      type: "thread"
      threadId: string
      message: {
        id: string
        content: string
        createdAt: string
        sender: { id: string; name: string | null }
        orderId: string | null
      }
    }
  | { type: "hello"; userId: string }
  | {
      type: "typing"
      threadId: string
      userId: string
      name: string | null
    }
  /**
   * Keputusan dompet (top-up / withdraw) oleh admin. ID transaksi dibawa
   * agar pihak penerima bisa membedakan pengajuan yang mana yang berubah —
   * pihak admin tidak memakai event ini (mereka memutuskannya sendiri).
   */
  | {
      type: "walletDecision"
      transactionId: string
      txType: "TOPUP" | "WITHDRAW"
      decision: "VERIFIED" | "REJECTED"
      /** Nominal rupiah (selalu positif) untuk pesan toast. */
      amount: number
      topupCode: string | null
      /** Teks singkat untuk deskripsi toast — bisa kosong. */
      summary: string
    }

/**
 * Serialize satu event ke potongan wire-format SSE.
 * Pesan `: ping` (comment) ditangani pemanggil — bukan bagian dari event.
 */
export function formatSseEvent(event: MessageStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
}

/**
 * Parse satu buffer SSE menjadi daftar event utuh + sisa yang belum
 * lengkap. Event dipisahkan baris kosong (`\n\n`); field selain `data:`
 * diabaikan di sini (server mengirim `event:` untuk keterbacaan log, tetapi
 * hook membaca tipe dari payload JSON agar satu sumber kebenaran).
 * Baris `: ping` (heartbeat comment) diabaikan.
 */
export function parseSseBuffer(buffer: string): {
  events: MessageStreamEvent[]
  rest: string
} {
  const events: MessageStreamEvent[] = []
  let rest = buffer
  let boundary = rest.indexOf("\n\n")

  while (boundary !== -1) {
    const rawEvent = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    boundary = rest.indexOf("\n\n")

    const dataLines = rawEvent
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
    if (dataLines.length === 0) continue // heartbeat ": ping" atau event tanpa data

    try {
      const parsed = JSON.parse(dataLines.join("\n")) as MessageStreamEvent
      if (
        parsed &&
        (parsed.type === "unread" ||
          parsed.type === "thread" ||
          parsed.type === "hello" ||
          parsed.type === "typing" ||
          (parsed.type === "notifications" &&
            typeof parsed.unreadCount === "number" &&
            Array.isArray(parsed.items)) ||
          (parsed.type === "walletDecision" &&
            typeof parsed.transactionId === "string" &&
            typeof parsed.amount === "number"))
      ) {
        events.push(parsed)
      }
    } catch {
      // Payload rusak/terpotong lintas chunk — buang, stream berikutnya
      // akan mengirim state segar (hook juga refetch saat reconnect).
    }
  }

  return { events, rest }
}

/** Unread total = chat lepas-pesanan + pesan dalam pesanan. */
export function combineUnread(
  directUnread: number,
  orderUnread: number
): number {
  return Math.max(0, Math.floor(directUnread) + Math.floor(orderUnread))
}
