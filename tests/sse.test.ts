import { describe, expect, it } from "vitest"
import {
  combineUnread,
  formatSseEvent,
  parseSseBuffer,
  type MessageStreamEvent,
} from "@/lib/sse"

/**
 * Helper streaming dipisah dari endpoint & hook supaya wire-format dan
 * agregasi unread bisa diuji tanpa server atau EventSource — pola yang
 * sama dengan cart.test.ts untuk logika keranjang murni.
 */

describe("formatSseEvent — wire format", () => {
  it("menghasilkan blok event + data JSON yang berakhir \\n\\n", () => {
    const event: MessageStreamEvent = { type: "unread", count: 3 }
    expect(formatSseEvent(event)).toBe(
      `event: unread\ndata: ${JSON.stringify(event)}\n\n`
    )
  })

  it("thread event membawa isi pesan utuh di data", () => {
    const event: MessageStreamEvent = {
      type: "thread",
      threadId: "order-1",
      message: {
        id: "m1",
        content: "Halo",
        createdAt: "2026-09-28T00:00:00.000Z",
        sender: { id: "u1", name: "Dewi" },
        orderId: "1",
      },
    }
    const wire = formatSseEvent(event)
    expect(wire).toContain("event: thread\n")
    expect(JSON.parse(wire.split("data: ")[1]!.trim())).toEqual(event)
  })
})

describe("parseSseBuffer — klien", () => {
  const threadEvent: MessageStreamEvent = {
    type: "thread",
    threadId: "order-1",
    message: {
      id: "m1",
      content: "Halo",
      createdAt: "2026-09-28T00:00:00.000Z",
      sender: { id: "u1", name: "Dewi" },
      orderId: "1",
    },
  }

  it("happy path: dua event utuh ter-parse semua", () => {
    const buffer =
      formatSseEvent({ type: "unread", count: 2 }) + formatSseEvent(threadEvent)
    const { events, rest } = parseSseBuffer(buffer)
    expect(events).toEqual([{ type: "unread", count: 2 }, threadEvent])
    expect(rest).toBe("")
  })

  it("chunk terpotong: event belum berakhir dipertahankan di rest", () => {
    const full = formatSseEvent(threadEvent)
    const cut = full.slice(0, Math.floor(full.length / 2))
    const { events, rest } = parseSseBuffer(cut)
    expect(events).toEqual([])
    // Sisa harus tetap bisa dilanjutkan oleh chunk berikutnya.
    const second = parseSseBuffer(rest + full.slice(Math.floor(full.length / 2)))
    expect(second.events).toEqual([threadEvent])
  })

  it("heartbeat ': ping' dan event tanpa data diabaikan", () => {
    const buffer = ": ping\n\n" + formatSseEvent({ type: "unread", count: 1 })
    const { events, rest } = parseSseBuffer(buffer)
    expect(events).toEqual([{ type: "unread", count: 1 }])
    expect(rest).toBe("")
  })

  it("payload JSON rusak dibuang tanpa melempar", () => {
    const buffer = "event: unread\ndata: {broken json\n\n" + formatSseEvent({ type: "unread", count: 0 })
    const { events } = parseSseBuffer(buffer)
    expect(events).toEqual([{ type: "unread", count: 0 }])
  })

  it("tipe yang tidak dikenal tidak masuk hasil", () => {
    const buffer =
      'event: sneaky\ndata: {"type":"weird"}\n\n' +
      formatSseEvent({ type: "unread", count: 5 })
    expect(parseSseBuffer(buffer).events).toEqual([{ type: "unread", count: 5 }])
  })
})

describe("combineUnread — agregasi", () => {
  it("menjumlahkan chat langsung + pesanan", () => {
    expect(combineUnread(2, 3)).toBe(5)
  })

  it("angka negatif/float dari sumber jahat dijepit ke bilangan bulat >= 0", () => {
    expect(combineUnread(-5, 2)).toBe(0)
    expect(combineUnread(1.7, 2.2)).toBe(3)
  })
})

describe("walletDecision — keputusan dompet", () => {
  const decisionEvent: MessageStreamEvent = {
    type: "walletDecision",
    transactionId: "tx-1",
    txType: "TOPUP",
    decision: "VERIFIED",
    amount: 150_000,
    topupCode: "JK-TOP-2A4B",
    summary: "Saldo bertambah Rp150.000.",
  }

  it("format wire memuat blok event + data JSON utuh", () => {
    const wire = formatSseEvent(decisionEvent)
    expect(wire).toContain("event: walletDecision\n")
    expect(JSON.parse(wire.split("data: ")[1]!.trim())).toEqual(decisionEvent)
  })

  it("ter-parse utuh dari buffer campuran event lain", () => {
    const buffer =
      formatSseEvent({ type: "unread", count: 1 }) +
      formatSseEvent(decisionEvent) +
      ": ping\n\n"
    const { events, rest } = parseSseBuffer(buffer)
    expect(events).toEqual([{ type: "unread", count: 1 }, decisionEvent])
    expect(rest).toBe("")
  })

  it("keputusan withdraw ditolak ikut lolos parse", () => {
    const rejected: MessageStreamEvent = {
      type: "walletDecision",
      transactionId: "tx-2",
      txType: "WITHDRAW",
      decision: "REJECTED",
      amount: 80_000,
      topupCode: null,
      summary: "Alasan: Rekening tidak cocok.",
    }
    expect(parseSseBuffer(formatSseEvent(rejected)).events).toEqual([rejected])
  })

  it("walletDecision tanpa transactionId/amount dibuang — tidak crash klien", () => {
    const buffer =
      'event: walletDecision\ndata: {"type":"walletDecision"}\n\n' +
      'event: walletDecision\ndata: {"type":"walletDecision","transactionId":"tx-3"}\n\n' +
      formatSseEvent(decisionEvent)
    expect(parseSseBuffer(buffer).events).toEqual([decisionEvent])
  })
})
