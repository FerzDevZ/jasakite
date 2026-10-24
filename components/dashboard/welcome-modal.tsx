"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Store,
  Package,
  Star,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react"

const WELCOME_PREFIX = "jasakite-welcomed-"

/**
 * Welcome modal untuk pengguna baru.
 * Hanya muncul sekali (disimpan di localStorage).
 */
export function WelcomeModal({
  role,
  userName,
}: {
  role: string
  userName: string | null
}) {
  const [open, setOpen] = React.useState(false)
  const welcomeKey = `${WELCOME_PREFIX}${role}`

  React.useEffect(() => {
    try {
      const alreadyWelcomed = localStorage.getItem(welcomeKey)
      if (!alreadyWelcomed) {
        setOpen(true)
      }
    } catch {
      // localStorage not available
    }
  }, [welcomeKey])

  const handleClose = () => {
    setOpen(false)
    try {
      localStorage.setItem(welcomeKey, "true")
    } catch {}
  }

  const roleConfig = {
    CUSTOMER: {
      title: `Selamat datang, ${userName ?? "Pengguna"}! 👋`,
      description: "Ini adalah dashboard Anda. Mulai menjelajahi jasa lokal terbaik di sekitar Anda.",
      steps: [
        { icon: Store, label: "Jelajahi Jasa", desc: "Temukan penyedia jasa yang Anda butuhkan", href: "/services" },
        { icon: Package, label: "Buat Pesanan", desc: "Pesan jasa dan koordinasi dengan provider", href: "/services" },
        { icon: Star, label: "Beri Ulasan", desc: "Bantu pelanggan lain dengan pengalaman Anda", href: "/dashboard/customer" },
        { icon: MessageSquare, label: "Kirim Pesan", desc: "Koordinasi jadwal dengan provider", href: "/dashboard/customer" },
      ],
    },
    PROVIDER: {
      title: `Selamat datang, ${userName ?? "Provider"}! 🚀`,
      description: "Ini adalah dashboard Anda. Kelola layanan dan pesanan dari pelanggan.",
      steps: [
        { icon: Store, label: "Buka Jasa Pertama", desc: "Buat layanan pertama Anda di platform", href: "/dashboard/provider/buka-jasa" },
        { icon: Package, label: "Terima Pesanan", desc: "Konfirmasi pesanan dari pelanggan", href: "/dashboard/provider" },
        { icon: Star, label: "Dapatkan Ulasan", desc: "Bangun reputasi dari ulasan pelanggan", href: "/dashboard/provider" },
        { icon: MessageSquare, label: "Koordinasi", desc: "Jalin komunikasi dengan pelanggan", href: "/dashboard/provider" },
      ],
    },
    ADMIN: {
      title: `Selamat datang, Admin! 🛡️`,
      description: "Ini adalah dashboard admin. Kelola platform JASAKITE.",
      steps: [
        { icon: Store, label: "Ringkasan Platform", desc: "Lihat statistik dan KPI platform", href: "/dashboard/admin" },
        { icon: Package, label: "Moderasi Jasa", desc: "Tinjau jasa yang menunggu persetujuan", href: "/dashboard/admin/moderasi" },
        { icon: Star, label: "Kelola Pengguna", desc: "Lihat dan kelola akun pengguna", href: "/dashboard/admin/users" },
        { icon: MessageSquare, label: "Ekspor Data", desc: "Unduh data platform untuk analisis", href: "/dashboard/admin" },
      ],
    },
    // Tanpa ini SUPER_ADMIN jatuh ke copy CUSTOMER (fallback ?? roleConfig
    // .CUSTOMER) — sambutannya menawarkan "Jelajahi Jasa" padahal tugas
    // khasnya adalah verifikasi uang dan pengaturan langganan.
    SUPER_ADMIN: {
      title: `Selamat datang, Super Admin! 🛡️`,
      description:
        "Anda memegang kunci kas platform: semua akses Admin plus keputusan uang.",
      steps: [
        { icon: Store, label: "Ringkasan Platform", desc: "Lihat statistik dan KPI platform", href: "/dashboard/admin" },
        { icon: Package, label: "Verifikasi Saldo", desc: "Putuskan antrean pembayaran, top-up, dan penarikan", href: "/dashboard/admin/wallet" },
        { icon: Star, label: "Keamanan 2FA", desc: "Aktifkan authenticator untuk membuka keputusan uang", href: "/dashboard/admin/keamanan" },
        { icon: MessageSquare, label: "Langganan Penyedia", desc: "Atur harga dan tagih langganan bulanan", href: "/dashboard/admin/langganan" },
      ],
    },
  }

  const config = roleConfig[role as keyof typeof roleConfig] ?? roleConfig.CUSTOMER

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary-strong" aria-hidden />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {config.steps.map((step) => {
            const Icon = step.icon
            return (
              <Link
                key={step.label}
                href={step.href}
                onClick={handleClose}
                className="focus-ring group flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-strong transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{step.label}</div>
                  <div className="text-sm text-muted-foreground">{step.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-strong" />
              </Link>
            )
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full shadow-glow">
            Mulai Menjelajahi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
