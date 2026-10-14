"use client"

import * as React from "react"

type ToasterComponent = typeof import("sonner").Toaster

/**
 * Toaster (sonner, ~34KB termasuk dependensinya) dimuat IDLE, bukan saat
 * hydrate. Toast hanya muncul setelah aksi pengguna (tambah keranjang,
 * geolokasi, error form) — jauh setelah jendela kritis TBT. requestIdleCallback
 * dengan timeout menjaga modul tetap siap instan saat pertama dibutuhkan.
 */
export function DeferredToaster() {
  const [Toaster, setToaster] = React.useState<ToasterComponent | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const load = () => {
      import("sonner").then((m) => {
        if (!cancelled) setToaster(() => m.Toaster)
      })
      cleanup()
    }
    // JANGAN requestIdleCallback: idle tercapai tepat setelah hydrate dan
    // eval ~34KB di situ justru menambah long task DI DALAM jendela TBT
    // (TTI butuh quiet window) — TBT naik. Muat saat interaksi pertama
    // (toast selalu post-interaksi) atau paling lambat 8 detik, yang sudah
    // di luar jendela blocking tipikal Lighthouse.
    const events = ["pointerdown", "keydown", "touchstart"] as const
    const cleanup = () => {
      for (const e of events) window.removeEventListener(e, load)
    }
    for (const e of events) window.addEventListener(e, load, { once: true, passive: true })
    const t = window.setTimeout(load, 8000)
    return () => {
      cancelled = true
      cleanup()
      window.clearTimeout(t)
    }
  }, [])

  if (!Toaster) return null
  return <Toaster position="top-center" richColors closeButton />
}
