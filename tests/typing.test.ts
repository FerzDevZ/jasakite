import { describe, expect, it, beforeEach } from "vitest"
import {
  TYPING_TTL_MS,
  __resetTypingStore,
  clearTyping,
  getTypingForViewer,
  setTyping,
} from "@/lib/typing"

/**
 * Store typing murni-deterministik: `now` di-inject, jadi TTL diuji tanpa
 * fake-timer — pola yang sama dengan sse.test.ts dan cart.test.ts.
 */

const T0 = 1_000_000

beforeEach(() => {
  __resetTypingStore()
})

describe("setTyping / getTypingForViewer — thread pesanan", () => {
  it("pengetik di pesanan viewer terlihat dengan threadId order-<id>", () => {
    setTyping("budi", "Budi", { kind: "order", orderId: "o1" }, T0)
    const result = getTypingForViewer("dewi", ["o1"], T0 + 1_000)
    expect(result).toEqual([
      { threadId: "order-o1", userId: "budi", name: "Budi" },
    ])
  })

  it("pesanan di luar milik viewer tidak terlihat", () => {
    setTyping("budi", "Budi", { kind: "order", orderId: "o9" }, T0)
    expect(getTypingForViewer("dewi", ["o1"], T0)).toEqual([])
  })

  it("pengetikan sendiri tidak pernah dikirim balik", () => {
    setTyping("dewi", "Dewi", { kind: "order", orderId: "o1" }, T0)
    expect(getTypingForViewer("dewi", ["o1"], T0)).toEqual([])
  })
})

describe("setTyping / getTypingForViewer — chat langsung", () => {
  it("Budi mengetik ke Dewi → bagi Dewi threadId-nya peer-<Budi>", () => {
    setTyping("budi", "Budi", { kind: "direct", peerId: "dewi" }, T0)
    const forDewi = getTypingForViewer("dewi", [], T0)
    expect(forDewi).toEqual([
      { threadId: "peer-budi", userId: "budi", name: "Budi" },
    ])
    // Bagi Budi sendiri, lawannya Dewi — pengetikannya sendiri tak terlihat.
    expect(getTypingForViewer("budi", [], T0)).toEqual([])
  })

  it("chat langsung yang bukan ditujukan ke viewer tidak terlihat", () => {
    setTyping("budi", "Budi", { kind: "direct", peerId: "sari" }, T0)
    expect(getTypingForViewer("dewi", [], T0)).toEqual([])
  })
})

describe("TTL dan pembaruan", () => {
  it("kedaluwarsa setelah TTL dan store ter-prune", () => {
    setTyping("budi", "Budi", { kind: "order", orderId: "o1" }, T0)
    expect(getTypingForViewer("dewi", ["o1"], T0 + TYPING_TTL_MS + 1)).toEqual([])
    // Prune malas: pemanggilan berikutnya membersihkan entri kedaluwarsa.
    expect(getTypingForViewer("dewi", ["o1"], T0 + TYPING_TTL_MS + 2)).toEqual([])
  })

  it("ping berulang memperpanjang umur; nama terbaru menang", () => {
    setTyping("budi", "Budi", { kind: "order", orderId: "o1" }, T0)
    setTyping("budi", "Budi S.", { kind: "order", orderId: "o1" }, T0 + 3_000)
    const result = getTypingForViewer("dewi", ["o1"], T0 + 6_000)
    expect(result).toEqual([
      { threadId: "order-o1", userId: "budi", name: "Budi S." },
    ])
  })

  it("clearTyping menghapus segera (pesan terkirim)", () => {
    setTyping("budi", "Budi", { kind: "direct", peerId: "dewi" }, T0)
    clearTyping("budi", { kind: "direct", peerId: "dewi" })
    expect(getTypingForViewer("dewi", [], T0)).toEqual([])
  })

  it("dua pengetik berbeda di thread yang sama sama terlihat", () => {
    setTyping("budi", "Budi", { kind: "order", orderId: "o1" }, T0)
    setTyping("sari", "Sari", { kind: "order", orderId: "o1" }, T0)
    const result = getTypingForViewer("dewi", ["o1"], T0)
    expect(result.map((r) => r.userId).sort()).toEqual(["budi", "sari"])
  })
})
