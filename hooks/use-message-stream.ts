"use client"

import * as React from "react"

import { type MessageStreamEvent } from "@/lib/sse"

export type StreamStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "failed"

/**
 * Satu koneksi SSE realtime pesan untuk SELURUH tab — koneksi singleton
 * tingkat modul dengan ref-counting, bukan koneksi per komponen.
 *
 * Alasan arsitektur: badge navbar, bottom-nav, dan thread pesan semuanya
 * ingin mendengar stream yang sama. Membuat EventSource per komponen berarti
 * tiga koneksi per tab, dan setiap koneksi menjalankan timer kueri di server
 * — lebih berat daripada polling yang digantikan. Dengan singleton, server
 * melihat tepat satu stream per tab.
 *
 * - **Reconnect dengan backoff** (1s→8s, maks 10 percobaan): EventSource
 *   bawaan auto-reconnect tanpa jeda; saat server restart massal itu menjadi
   * badai koneksi. Penghitung di-reset saat koneksi sukses.
 * - **Fallback polling**: jika stream gagal terus (proxy tanpa streaming),
 *   interval 60s mengambil alih angka badge — fitur turun, tidak hilang.
 * - **Tab hidden tetap langganan**: event hanya data kecil; memutus saat
 *   hidden membuat badge basi tanpa keuntungan terukur.
 *
 * Konsumen mendaftar lewat `subscribe()` dan memetakan event ke state/cache
 * masing-masing (setCount untuk badge, invalidateQueries untuk thread).
 */
type Listener = (event: MessageStreamEvent) => void

const MAX_RETRIES = 10

const manager = {
  refCount: 0,
  source: null as EventSource | null,
  retry: 0,
  retryTimer: null as ReturnType<typeof setTimeout> | null,
  fallbackTimer: null as ReturnType<typeof setInterval> | null,
  listeners: new Set<Listener>(),
  statusListeners: new Set<(status: StreamStatus) => void>(),
  status: "idle" as StreamStatus,
}

function setStatus(next: StreamStatus) {
  manager.status = next
  manager.statusListeners.forEach((fn) => fn(next))
}

function dispatch(event: MessageStreamEvent) {
  manager.listeners.forEach((fn) => fn(event))
}

function stopFallback() {
  if (manager.fallbackTimer) {
    clearInterval(manager.fallbackTimer)
    manager.fallbackTimer = null
  }
}

function startFallback() {
  if (manager.fallbackTimer) return
  manager.fallbackTimer = setInterval(() => {
    if (document.hidden) return
    fetch("/api/messages/inbox", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.unreadTotal === "number") {
          dispatch({ type: "unread", count: data.unreadTotal })
        }
      })
      .catch(() => {})
  }, 60_000)
}

function connect() {
  if (manager.source) return
  setStatus(manager.retry === 0 ? "connecting" : "reconnecting")
  const es = new EventSource("/api/messages/stream")
  manager.source = es

  es.onopen = () => {
    manager.retry = 0
    stopFallback()
    setStatus("open")
  }

  es.onmessage = (messageEvent) => {
    // Semua payload dibungkus JSON di field data; satu jalur parse agar
    // tipe event berasal dari payload — satu sumber kebenaran dengan server.
    try {
      dispatch(JSON.parse(messageEvent.data) as MessageStreamEvent)
    } catch {
      // Payload rusak — abaikan; siklus server berikutnya mengirim ulang.
    }
  }

  es.onerror = () => {
    es.close()
    manager.source = null
    manager.retry += 1
    if (manager.retry > MAX_RETRIES) {
      // Server/proxy tidak mendukung streaming — menyerah dengan elegan.
      setStatus("failed")
      startFallback()
      return
    }
    if (manager.retry >= 2) startFallback()
    setStatus("reconnecting")
    const delay = Math.min(1000 * 2 ** (manager.retry - 1), 8000)
    manager.retryTimer = setTimeout(connect, delay)
  }
}

function acquire() {
  manager.refCount += 1
  if (manager.refCount === 1) connect()
}

function release() {
  manager.refCount = Math.max(0, manager.refCount - 1)
  if (manager.refCount === 0) {
    if (manager.source) {
      manager.source.close()
      manager.source = null
    }
    if (manager.retryTimer) {
      clearTimeout(manager.retryTimer)
      manager.retryTimer = null
    }
    stopFallback()
    setStatus("idle")
  }
}

/**
 * Berlangganan stream pesan realtime. Koneksi dibuka saat konsumen pertama
 * mount dan ditutup saat terakhir unmount. `enabled=false` (mis. pengguna
 * belum login) tidak menyentuh koneksi sama sekali.
 */
export function useMessageStream(enabled = true): {
  status: StreamStatus
  subscribe: (fn: Listener) => () => void
} {
  const [status, setStatusState] = React.useState<StreamStatus>(manager.status)

  React.useEffect(() => {
    if (!enabled) return
    const syncStatus = (next: StreamStatus) => setStatusState(next)
    manager.statusListeners.add(syncStatus)
    setStatusState(manager.status)
    acquire()
    return () => {
      manager.statusListeners.delete(syncStatus)
      release()
    }
  }, [enabled])

  const subscribe = React.useCallback((fn: Listener) => {
    manager.listeners.add(fn)
    return () => {
      manager.listeners.delete(fn)
    }
  }, [])

  return { status, subscribe }
}
