"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Indikator status koneksi.
 *
 * Dua bentuk, dua kegunaan:
 * 1. OFFLINE → badge kecil PERSISTEN di bawah navbar (bukan banner yang
 *    menutupi konten/bottom-nav). Pengguna harus selalu tahu bahwa yang
 *    dilihatnya adalah data cache — konten tetap bisa di-scroll dan dibaca.
 * 2. ONLINE kembali → strip hijau singkat ("tersambung kembali") lalu hilang,
 *    sebagai konfirmasi bahwa aksi berikutnya sudah dikirim ke server.
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = React.useState(true)
  const [showBadge, setShowBadge] = React.useState(false)
  const [showReconnect, setShowReconnect] = React.useState(false)
  const wasOffline = React.useRef(false)

  React.useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      if (!online) {
        wasOffline.current = true
        setShowBadge(true)
        setShowReconnect(false)
      } else {
        setShowBadge(false)
        // Strip konfirmasi hanya jika sebelumnya benar-benar offline.
        if (wasOffline.current) {
          setShowReconnect(true)
          wasOffline.current = false
          window.setTimeout(() => setShowReconnect(false), 2500)
        }
      }
    }

    updateOnlineStatus()
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
    }
  }, [])

  if (!showBadge && !showReconnect) return null

  if (showBadge) {
    return (
      <div
        role="status"
        aria-live="polite"
        data-testid="offline-badge"
        className={cn(
          "sticky top-14 z-40 flex justify-center px-4 pb-1.5 lg:top-16",
          className
        )}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-2xs font-semibold text-warning shadow-sm">
          <WifiOff className="h-3 w-3" aria-hidden />
          Offline — melihat data tersimpan
        </span>
      </div>
    )
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid="reconnect-strip"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-success/30 bg-success-soft px-4 py-3 text-success transition-opacity duration-300",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
        <RefreshCw className="h-4 w-4" aria-hidden />
        <span className="text-sm font-medium">Koneksi tersambung kembali</span>
      </div>
    </div>
  )
}
