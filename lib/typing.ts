/**
 * Status "sedang mengetik" — state sesaat (ephemeral) di memori proses.
 *
 * Sengaja TIDAK masuk database: indikator kedaluwarsa dalam hitungan detik,
 * dan kehilangan state saat proses restart hanya berarti indikator tidak
 * menyala satu kali — tidak ada data yang benar-benar hilang. Pilihan satu
 * node ini sejalan dengan rate limiter in-memory yang sudah ada.
 *
 * Fungsi menerima `now` sebagai parameter (default Date.now) agar TTL bisa
 * diuji unit tanpa fake-timer.
 */

export type TypingThread =
  | { kind: "order"; orderId: string }
  | { kind: "direct"; peerId: string }

export type TypingEntry = {
  typerId: string
  typerName: string | null
  thread: TypingThread
  at: number
}

/** Klien mengirim ping tiap ~3s; server memberi umur 8s sebelum dianggap berhenti. */
export const TYPING_TTL_MS = 8_000

const store = new Map<string, TypingEntry>()

function keyOf(typerId: string, thread: TypingThread): string {
  return thread.kind === "order"
    ? `order:${thread.orderId}:${typerId}`
    : `direct:${thread.peerId}:${typerId}`
}

/** Catat bahwa user sedang mengetik di thread ini (idempoten per user+thread). */
export function setTyping(
  typerId: string,
  typerName: string | null,
  thread: TypingThread,
  now = Date.now()
): void {
  // Prune malas: buang entri kedaluwarsa setiap kali menulis agar store
  // tidak tumbuh tanpa batas.
  for (const [key, entry] of store) {
    if (now - entry.at > TYPING_TTL_MS) store.delete(key)
  }
  store.set(keyOf(typerId, thread), { typerId, typerName, thread, at: now })
}

/** Hapus satu penanda (mis. setelah pesan benar-benar terkirim). */
export function clearTyping(typerId: string, thread: TypingThread): void {
  store.delete(keyOf(typerId, thread))
}

export type TypingForViewer = {
  /** threadId dalam format threadKey klien: `order-<id>` / `peer-<id lawan>`. */
  threadId: string
  userId: string
  name: string | null
}

/**
 * Siapa yang sedang mengetik di thread yang TERLIHAT oleh `viewerId`:
 * - thread pesanan milik viewer (customer atau provider), dan
 * - chat langsung di mana PENGETIK adalah lawan bicara viewer.
 * Pengetikan viewer sendiri tidak pernah dikirim balik ke dirinya.
 *
 * Pemetaan threadId chat langsung: threadKey klien memakai id LAWAN. Budi
 * mengetik ke Dewi → disimpan {kind:"direct", peerId: Dewi}; bagi Dewi
 * (viewer), lawannya Budi, jadi threadId-nya `peer-<Budi>`.
 */
export function getTypingForViewer(
  viewerId: string,
  myOrderIds: string[],
  now = Date.now()
): TypingForViewer[] {
  const result: TypingForViewer[] = []
  const orderIdSet = new Set(myOrderIds.map(String))
  for (const entry of store.values()) {
    if (now - entry.at > TYPING_TTL_MS) {
      store.delete(keyOf(entry.typerId, entry.thread))
      continue
    }
    if (entry.typerId === viewerId) continue
    if (entry.thread.kind === "order") {
      if (!orderIdSet.has(String(entry.thread.orderId))) continue
      result.push({
        threadId: `order-${String(entry.thread.orderId)}`,
        userId: entry.typerId,
        name: entry.typerName,
      })
    } else {
      if (String(entry.thread.peerId) !== String(viewerId)) continue
      result.push({
        threadId: `peer-${entry.typerId}`,
        userId: entry.typerId,
        name: entry.typerName,
      })
    }
  }
  return result
}

/** Khusus pengujian. */
export function __resetTypingStore(): void {
  store.clear()
}
