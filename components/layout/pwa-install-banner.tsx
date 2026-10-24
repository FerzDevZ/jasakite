"use client"

import * as React from "react"
import { X, Bell, Zap, WifiOff, Share } from "lucide-react"
import { Button } from "@/components/ui/button"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// Event yang dititipkan script inline di <head> layout — lihat komentar di
// sana kenapa penangkapan harus terjadi sebelum hidrasi React.
type PromptWindow = Window & { __jasakiteInstallPrompt?: InstallPromptEvent | null }

const DISMISS_KEY = "jasakite-pwa-dismissed-at"
const DISMISS_DAYS = 7

/**
 * Banner install ala app-banner marketplace (Shopee/GoFood): ikon + nama +
 * manfaat singkat, tombol Pasang, dan dismiss yang dihormati 7 hari.
 *
 * Dua jalur tampil:
 * - Chrome/Edge (Android & desktop): event `beforeinstallprompt` — termasuk
 *   yang sudah lewat sebelum komponen ini terpasang (dititipkan script head).
 * - iOS Safari/Chrome: Apple tidak pernah mengirim `beforeinstallprompt`;
 *   satu-satunya jalan install adalah manual "Bagikan → Tambahkan ke Layar
 *   Utama", jadi banner berubah menjadi instruksi singkat.
 *
 * Tidak pernah mengganggu sesi yang sudah terpasang (display-mode standalone
 * atau navigator.standalone iOS).
 */
export function PwaInstallBanner() {
  const [installEvent, setInstallEvent] = React.useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = React.useState(false)
  // "instruction" = event prompt tak tersedia (iOS, atau Chromium yang
  // prompt-nya diredam Chrome karena pernah ditolak/berulang) — banner tetap
  // tampil sebagai petunjuk jalan manual, tidak hilang diam-diam.
  const [mode, setMode] = React.useState<"prompt" | "instruction">("instruction")
  const [isIOS] = React.useState(
    () =>
      typeof window !== "undefined" &&
      /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  )

  React.useEffect(() => {
    // Sudah terpasang → jangan pernah tampil. `navigator.standalone` adalah
    // padanan iOS untuk media query display-mode (Safari iOS menyetujunya
    // hanya saat diluncurkan dari layar utama).
    const nav = window.navigator as Navigator & { standalone?: boolean }
    if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true) return

    let dismissedRecently = false
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
      dismissedRecently = at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000
    } catch {
      // localStorage bisa diblokir — anggap belum pernah dismiss.
    }
    if (dismissedRecently) return

    // iOS tidak akan pernah menerima event — tampilkan varian instruksi
    // setelah tabungan sesaat agar tidak bertabrakan dengan konten awal.
    if (isIOS) {
      const t = window.setTimeout(() => setVisible(true), 1_500)
      return () => window.clearTimeout(t)
    }

    const accept = (e: InstallPromptEvent) => {
      setInstallEvent(e)
      setMode("prompt")
      setVisible(true)
    }
    // Event yang sudah ditangkap script head sebelum hidrasi.
    const stashed = (window as PromptWindow).__jasakiteInstallPrompt
    if (stashed) accept(stashed)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      accept(e as InstallPromptEvent)
    }
    const onStashed = () => {
      const ev = (window as PromptWindow).__jasakiteInstallPrompt
      if (ev) accept(ev)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("jasakite:install-ready", onStashed)

    // Jaring pengaman: pada Chromium yang tidak pernah mengirim event
    // (incognito, prompt situs ini pernah ditolak Chrome berulang kali),
    // banner tetap muncul sebagai instruksi manual — pengguna selalu punya
    // jalan memasang. Browser non-Chromium tanpa dukungan install sama
    // sekali (Firefox/Safari desktop) tidak diganggu. KECUALI di dalam
    // aplikasi WebView JASAKITE (UA berakhiran JasakiteApp): instruksi
    // "menu ⋮" di sana tidak ada, dan memasang ulang tidak relevan.
    const ua = window.navigator.userAgent
    const isChromium =
      /chrome|chromium|crios|edg/i.test(ua) &&
      !/iphone|ipad|ipod/i.test(ua) &&
      !/jasakiteapp/i.test(ua)
    let fallbackTimer: number | undefined
    if (isChromium) {
      fallbackTimer = window.setTimeout(() => {
        setVisible((already) => {
          if (already) return already
          setMode((m) => (m === "prompt" ? m : "instruction"))
          return true
        })
      }, 8_000)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("jasakite:install-ready", onStashed)
      if (fallbackTimer) window.clearTimeout(fallbackTimer)
    }
  }, [isIOS])

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
          {mode === "prompt" ? (
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
          ) : isIOS ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-2xs text-muted-foreground">
              <Share className="h-3 w-3 shrink-0" aria-hidden />
              Ketuk ikon Bagikan di bilah Safari, lalu
              <span className="font-semibold text-foreground">Tambahkan ke Layar Utama</span>
            </p>
          ) : (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-2xs text-muted-foreground">
              Buka menu Chrome <span className="font-semibold text-foreground">⋮ → Pasang aplikasi</span>
              <span className="text-muted-foreground/60">·</span>
              di komputer: ikon install di address bar
            </p>
          )}
        </div>
        {/* min_h-11/w-11 = 44px: target sentuh WCAG 2.5.8 — area klik lebih
            besar dari visual tombolnya, khas app-banner mobile. */}
        {mode === "prompt" && (
          <Button size="sm" className="shrink-0 px-3 font-bold min-h-11" onClick={install}>
            Pasang
          </Button>
        )}
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
