"use client"

import * as React from "react"
import { X, Bell, Zap, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "jasakite-pwa-dismissed-at"
const DISMISS_DAYS = 7

/**
 * Banner install ala app-banner marketplace (Shopee/GoFood): ikon + nama +
 * manfaat singkat, tombol Pasang, dan dismiss yang dihormati 7 hari.
 *
 * Hanya muncul bila browser mengirim `beforeinstallprompt` (Chrome/Edge
 * Android/desktop) DAN service worker aktif — tidak pernah mengganggu sesi
 * yang sudah terpasang (display-mode standalone tak menampilkannya lagi).
 */
export function PwaInstallBanner() {
  const [installEvent, setInstallEvent] = React.useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // Sudah terpasang → jangan pernah tampil.
    if (window.matchMedia("(display-mode: standalone)").matches) return

    let dismissedRecently = false
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
      dismissedRecently = at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
    } catch {
      // localStorage bisa diblokir — anggap belum pernah dismiss.
    }
    if (dismissedRecently) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as InstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    return () => window.removeEventListener("beforeinstallprompt", onPrompt)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // Tanpa localStorage banner akan muncul lagi tiap kunjungan — masih
      // lebih baik daripada error.
    }
  }

  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === "accepted") {
      setVisible(false)
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {}
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Pasang aplikasi JASAKITE"
      className="fixed inset-x-3 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-50 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:w-96"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card-lg">
        {/* Ikon app — berimpit dengan ikon 192 yang dipakai manifest. */}
        <img src="/icon-192.png" alt="" aria-hidden className="h-11 w-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">Pasang JASAKITE</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-2xs text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <Zap className="h-3 w-3" aria-hidden /> Buka lebih cepat
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Bell className="h-3 w-3" aria-hidden /> Notifikasi pesanan
            </span>
            <span className="inline-flex items-center gap-0.5">
              <WifiOff className="h-3 w-3" aria-hidden /> Tahan offline
            </span>
          </p>
        </div>
        {/* min-h-11/w-11 = 44px: target sentuh WCAG 2.5.8 — area klik lebih
            besar dari visual tombolnya, khas app-banner mobile. */}
        <Button size="sm" className="shrink-0 px-3 font-bold min-h-11" onClick={install}>
          Pasang
        </Button>
        <button
          type="button"
          aria-label="Tutup, jangan tampilkan lagi selama 7 hari"
          onClick={dismiss}
          className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
