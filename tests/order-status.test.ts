import { describe, expect, it } from "vitest"
import {
  ORDER_STATUSES,
  ORDER_STEPS,
  SERVICE_STATUSES,
  canTransition,
  isOrderStatus,
  isTerminalStatus,
  nextStatuses,
  serviceStatusLabel,
  serviceStatusTone,
  statusLabel,
  statusShortLabel,
  statusTone,
  transitionError,
  type OrderStatus,
} from "@/lib/order-status"

describe("FSM status pesanan", () => {
  it("mengizinkan alur normal PENDING → IN_PROGRESS → COMPLETED", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(true)
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true)
  })

  it("mengizinkan pembatalan sebelum selesai", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true)
    expect(canTransition("IN_PROGRESS", "CANCELLED")).toBe(true)
  })

  it("menolak lompatan PENDING → COMPLETED", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false)
  })

  it("menolak semua transisi keluar dari state terminal", () => {
    const terminal: OrderStatus[] = ["COMPLETED", "CANCELLED"]
    for (const from of terminal) {
      expect(isTerminalStatus(from)).toBe(true)
      for (const to of ORDER_STATUSES) {
        expect(canTransition(from, to)).toBe(false)
      }
    }
  })

  it("menolak transisi ke status yang sama", () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false)
    }
  })

  it("tidak pernah mundur ke PENDING", () => {
    for (const from of ORDER_STATUSES) {
      expect(nextStatuses(from)).not.toContain("PENDING")
    }
  })

  it("mengenali status valid dan menolak yang tidak dikenal", () => {
    expect(isOrderStatus("PENDING")).toBe(true)
    expect(isOrderStatus("pending")).toBe(false)
    expect(isOrderStatus("REFUNDED")).toBe(false)
    expect(isOrderStatus(undefined)).toBe(false)
    expect(isOrderStatus(3)).toBe(false)
  })

  it("punya label bahasa Indonesia untuk setiap status", () => {
    for (const status of ORDER_STATUSES) {
      expect(statusLabel(status).length).toBeGreaterThan(0)
    }
  })

  it("memberi pesan error yang menjelaskan penyebab penolakan", () => {
    expect(transitionError("COMPLETED", "IN_PROGRESS")).toContain(
      "tidak bisa diubah lagi"
    )
    expect(transitionError("PENDING", "PENDING")).toContain("sudah berstatus")
    expect(transitionError("PENDING", "COMPLETED")).toContain(
      "tidak bisa berubah"
    )
  })
})

describe("presentasi status pesanan", () => {
  it("punya label panjang dan pendek yang berbeda untuk status non-terminal", () => {
    // Label pendek dipakai di tabel; kalau identik dengan label panjang,
    // tabel jadi terlalu lebar — itu masalah asal yang memicu duplikasi.
    expect(statusShortLabel("PENDING")).not.toBe(statusLabel("PENDING"))
    expect(statusShortLabel("IN_PROGRESS")).not.toBe(statusLabel("IN_PROGRESS"))
  })

  it("punya label pendek non-kosong untuk setiap status", () => {
    for (const status of ORDER_STATUSES) {
      expect(statusShortLabel(status).length).toBeGreaterThan(0)
    }
  })

  it("memetakan setiap status ke tone yang unik", () => {
    const tones = ORDER_STATUSES.map(statusTone)
    expect(new Set(tones).size).toBe(ORDER_STATUSES.length)
  })

  it("ORDER_STEPS hanya memuat tahap maju, tanpa CANCELLED", () => {
    expect(ORDER_STEPS).toEqual(["PENDING", "IN_PROGRESS", "COMPLETED"])
    expect(ORDER_STEPS).not.toContain("CANCELLED")
  })

  it("urutan ORDER_STEPS konsisten dengan FSM", () => {
    for (let i = 0; i < ORDER_STEPS.length - 1; i++) {
      expect(canTransition(ORDER_STEPS[i], ORDER_STEPS[i + 1])).toBe(true)
    }
  })
})

describe("status jasa", () => {
  it("punya label untuk setiap status jasa", () => {
    for (const status of SERVICE_STATUSES) {
      expect(serviceStatusLabel(status).length).toBeGreaterThan(0)
    }
  })

  it("mengembalikan nilai asli untuk status jasa tak dikenal", () => {
    expect(serviceStatusLabel("WEIRD")).toBe("WEIRD")
    expect(serviceStatusTone("WEIRD")).toBe("muted")
  })

  it("hanya ACTIVE yang bertone success", () => {
    expect(serviceStatusTone("ACTIVE")).toBe("success")
    expect(serviceStatusTone("DRAFT")).not.toBe("success")
    expect(serviceStatusTone("ARCHIVED")).not.toBe("success")
  })
})
