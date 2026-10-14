import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { combineUnread, formatSseEvent } from "@/lib/sse"
import { getTypingForViewer } from "@/lib/typing"
import { roundToRupiah } from "@/lib/wallet"

export const dynamic = "force-dynamic"

// Interval polling internal — jauh lebih hemat daripada siklus polling
// klien sebelumnya (thread 15s × unread 60s per tab, tiap tab kueri sendiri).
const UNREAD_INTERVAL_MS = 10_000
const THREAD_INTERVAL_MS = 5_000
const PING_INTERVAL_MS = 15_000
const WALLET_DECISION_INTERVAL_MS = 30_000
// Hanya pesan 5 menit terakhir yang disi ulang: pesan lebih lama sudah pernah
// dilihat klien (atau akan diambil penuh oleh invalidate pertama).
const THREAD_WINDOW_MS = 5 * 60 * 1000
// Jendela keputusan dompet: 3× interval polling-nya. Sengaja LEBIH PANJANG
// dari interval (bukan sama dengan) supaya koneksi yang baru terbuka tetap
// menerima keputusan yang terjadi beberapa detik sebelumnya — tab kedua yang
// login user yang sama tidak pernah melewatkan pengumuman.
const WALLET_DECISION_WINDOW_MS = 90_000

/**
 * GET — stream Server-Sent Events untuk pengguna yang sedang login.
 *
 * Event:
 * - `hello`   : konfirmasi koneksi (userId) — dipakai hook untuk log/debug.
 * - `unread`  : total pesan belum dibaca (chat lepas-pesanan + pesanan),
 *               sumber angka badge navbar/bottom-nav.
 * - `thread`  : satu pesan terbaru per thread milik saya dalam jendela
 *               5 menit — pemicu invalidate ["messages", threadKey] di klien.
 * - `walletDecision` : top-up/penarikan saya baru diputus admin (30s
 *               terakhir) — pemicu toast + invalidate ["wallet"] di klien.
 * - `: ping`  : heartbeat komentar tiap 15s — menjaga proxy menjaga koneksi
 *               tetap terbuka.
 *
 * Catatan `readAt: null`: filter null Prisma+MongoDB tidak andal (dokumen
 * null eksplisit tidak pernah cocok — lihat catatan di route messages) —
 * jadi kandidat dibaca lalu disaring di JS, konsisten dengan inbox.
 *
 * GET tidak kena CSRF (safe method — lihat middleware), tetap wajib sesi.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const limited = enforceRateLimit(request, "sse", RATE_LIMITS.sse, session.user.id)
  if (limited) return limited

  const me = prismaId(session.user.id)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const timers: ReturnType<typeof setInterval>[] = []

      const send = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // Stream ditutup klien di tengah enqueue — cleanup di bawah
          // yang menangani; jangan biarkan error merambat.
        }
      }

      const closeAll = () => {
        if (closed) return
        closed = true
        timers.forEach(clearInterval)
        try {
          controller.close()
        } catch {
          // Sudah ditutup — tidak masalah.
        }
      }

      send(formatSseEvent({ type: "hello", userId: String(me) }))

      // ── unread: sumber angka badge ─────────────────────────────────────
      const unreadTimer = setInterval(async () => {
        if (closed) return
        try {
          const [direct, myOrders] = await Promise.all([
            // Chat lepas-pesanan (order: null) — kandidat + saring JS.
            prisma.message
              .findMany({
                where: { order: { is: null }, recipientId: me },
                select: { readAt: true },
              })
              .catch(() => [] as { readAt: Date | null }[]),
            // Pesanan milik saya (customer atau provider) — dasar unread
            // thread pesanan, konsisten dengan inbox (take 40).
            prisma.order
              .findMany({
                where: { OR: [{ customerId: me }, { service: { providerId: me } }] },
                select: { id: true },
                take: 40,
              })
              .catch(() => [] as { id: string }[]),
          ])
          // Pesan thread pesanan tidak menyimpan recipientId — unread =
          // pesan di pesanan saya yang pengirimnya BUKAN saya, belum dibaca.
          const orderIds = myOrders.map((o) => o.id)
          const orderRows =
            orderIds.length > 0
              ? await prisma.message
                  .findMany({
                    where: { orderId: { in: orderIds } },
                    select: { senderId: true, readAt: true },
                  })
                  .catch(() => [] as { senderId: string; readAt: Date | null }[])
              : []
          const directUnread = direct.filter((m) => m.readAt == null).length
          const orderUnread = orderRows.filter(
            (m) => m.readAt == null && !sameId(m.senderId, me)
          ).length
          send(formatSseEvent({ type: "unread", count: combineUnread(directUnread, orderUnread) }))
        } catch {
          // Kegagalan DB sesaat — siklus berikutnya mencoba lagi.
        }
      }, UNREAD_INTERVAL_MS)
      timers.push(unreadTimer)

      // ── walletDecision: keputusan top-up/withdraw oleh admin ──────────
      // Deteksi dari database, bukan push in-process: keputusan ditandai
      // verifiedAt (dipisahkan 3 saat INSERT) pada baris milik user ini,
      // sehingga bekerja lintas instance/region tanpa event bus.
      const rupiah = new Intl.NumberFormat("id-ID")
      const walletTimer = setInterval(async () => {
        if (closed) return
        try {
          const since = new Date(Date.now() - WALLET_DECISION_WINDOW_MS)
          const decided = await prisma.walletTransaction
            .findMany({
              where: {
                userId: me,
                type: { in: ["TOPUP", "WITHDRAW"] },
                status: { in: ["VERIFIED", "REJECTED"] },
                verifiedAt: { gte: since },
              },
              select: {
                id: true,
                type: true,
                status: true,
                amount: true,
                topupCode: true,
                rejectReason: true,
              },
              take: 10,
            })
            .catch(() => [])
          for (const tx of decided) {
            if (!tx) continue
            const approved = tx.status === "VERIFIED"
            const amountLabel = `Rp${rupiah.format(roundToRupiah(tx.amount))}`
            send(
              formatSseEvent({
                type: "walletDecision",
                transactionId: String(tx.id),
                txType: tx.type === "TOPUP" ? "TOPUP" : "WITHDRAW",
                decision: approved ? "VERIFIED" : "REJECTED",
                amount: roundToRupiah(tx.amount),
                topupCode: tx.topupCode,
                summary: approved
                  ? tx.type === "TOPUP"
                    ? `Saldo bertambah ${amountLabel}.`
                    : `${amountLabel} sedang ditransfer ke rekening Anda.`
                  : `Alasan: ${tx.rejectReason ?? "Bukti tidak dapat diverifikasi."}`,
              })
            )
          }
        } catch {
          // Kegagalan DB sesaat — siklus berikutnya mencoba lagi.
        }
      }, WALLET_DECISION_INTERVAL_MS)
      timers.push(walletTimer)

      // ── thread + typing: pemicu invalidate & indikator di klien ───────
      const runThreadCycle = async () => {
        if (closed) return
        try {
          const orders = await prisma.order.findMany({
            where: { OR: [{ customerId: me }, { service: { providerId: me } }] },
            select: { id: true, updatedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 40,
          })
          const orderIds = orders.map((o) => o.id)
          const since = new Date(Date.now() - THREAD_WINDOW_MS)
          const recent = await prisma.message.findMany({
            where: {
              orderId: { in: orderIds },
              createdAt: { gte: since },
            },
            include: { sender: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
            take: 30,
          })
          const seenThreads = new Set<string>()
          for (const msg of recent) {
            if (msg.orderId == null) continue
            const threadId = `order-${String(msg.orderId)}`
            if (seenThreads.has(threadId)) continue
            seenThreads.add(threadId)
            send(
              formatSseEvent({
                type: "thread",
                threadId,
                message: {
                  id: String(msg.id),
                  content: msg.content,
                  createdAt: msg.createdAt.toISOString(),
                  sender: { id: String(msg.sender.id), name: msg.sender.name },
                  orderId: String(msg.orderId),
                },
              })
            )
          }
          // Chat lepas-pesanan: pesan terbaru per lawan bicara.
          const directRecent = await prisma.message.findMany({
            where: {
              order: { is: null },
              OR: [{ senderId: me }, { recipientId: me }],
              createdAt: { gte: since },
            },
            include: {
              sender: { select: { id: true, name: true } },
              recipient: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
          })
          const seenPeers = new Set<string>()
          for (const msg of directRecent) {
            if (msg.recipient == null) continue
            const peer = sameId(msg.senderId, me) ? msg.recipient : msg.sender
            const threadId = `peer-${String(peer.id)}`
            if (seenPeers.has(threadId)) continue
            seenPeers.add(threadId)
            send(
              formatSseEvent({
                type: "thread",
                threadId,
                message: {
                  id: String(msg.id),
                  content: msg.content,
                  createdAt: msg.createdAt.toISOString(),
                  sender: { id: String(msg.sender.id), name: msg.sender.name },
                  orderId: null,
                },
              })
            )
          }

          // Indikator "sedang mengetik": semua pengetik di thread yang
          // terlihat oleh viewer. Satu event per pengetik per siklus (5s) —
          // klien memegang statusnya sampai TTL padam atau digantikan, jadi
          // tidak perlu aliran per detik.
          const typing = getTypingForViewer(String(me), orderIds, Date.now())
          for (const t of typing) {
            send(
              formatSseEvent({
                type: "typing",
                threadId: t.threadId,
                userId: t.userId,
                name: t.name,
              })
            )
          }
        } catch {
          // Sama seperti di atas — coba lagi pada siklus berikutnya.
        }
      }

      // Siklus pertama dijalankan SEGERA saat koneksi terbuka — pesan dan
      // status typing yang terjadi beberapa detik sebelum koneksi tidak
      // perlu menunggu interval penuh.
      void runThreadCycle()
      const threadTimer = setInterval(() => {
        void runThreadCycle()
      }, THREAD_INTERVAL_MS)
      timers.push(threadTimer)

      const pingTimer = setInterval(() => {
        if (closed) return
        send(": ping\n\n")
      }, PING_INTERVAL_MS)
      timers.push(pingTimer)

      request.signal.addEventListener("abort", closeAll)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
