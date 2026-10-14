"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptic"
import { csrfFetch } from "@/lib/csrf-fetch"

// Tombol simpan jasa (wishlist). Menampilkan status "disimpan" berdasarkan
// ketersediaan sesi; untuk pengguna yang belum login akan diarahkan ke halaman masuk.
export function SaveButton({
  serviceId,
  size = "lg",
  variant = "outline",
  className,
}: {
  serviceId: string | number
  size?: "default" | "lg" | "icon" | "sm"
  variant?: "outline" | "ghost" | "default"
  className?: string
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  // Cek status simpan hanya jika user sudah login
  useEffect(() => {
    let active = true
    if (status !== "authenticated") return
    fetch(`/api/saved?id=${serviceId}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) {
          setSaved(data.saved)
          setChecked(true)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [serviceId, status])

  const handleToggle = async () => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (loading) return
    // Optimistic flip — tombol terasa instan; rollback bila gagal.
    const prev = saved
    const wasChecked = checked
    const newSaved = !saved
    setSaved(newSaved)
    setChecked(true)
    setLoading(true)

    // Haptic feedback on mobile — helper menangani SSR, iOS, reduced-motion.
    haptic()

    try {
      const res = await csrfFetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: String(serviceId) }),
      })
      if (res.ok) {
        const data = await res.json()
        setSaved(data.saved)
        toast.success(data.saved ? "Jasa disimpan" : "Jasa dihapus dari simpanan", {
          description: data.saved
            ? "Temukan di dashboard Anda nanti."
            : "Jasa dihapus dari daftar simpanan.",
        })
      } else {
        setSaved(prev)
        setChecked(wasChecked)
        toast.error("Gagal menyimpan", {
          description: "Terjadi kesalahan. Coba lagi nanti.",
        })
      }
    } catch {
      setSaved(prev)
      setChecked(wasChecked)
      toast.error("Gagal menyimpan", {
        description: "Terjadi kesalahan jaringan.",
      })
    }
    setLoading(false)
  }

  const isSaved = checked ? saved : false

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={loading}
      aria-pressed={isSaved}
      aria-label={isSaved ? "Hapus dari simpanan" : "Simpan jasa ini"}
      className={cn(
        isSaved &&
          "border-primary/50 bg-primary/10 text-primary-strong hover:bg-primary/15",
        className
      )}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-all duration-fast",
          isSaved &&
            "fill-current scale-110 text-destructive animate-heart-pop"
        )}
      />
      {size !== "icon" && (
        <span>{isSaved ? "Disimpan" : "Simpan"}</span>
      )}
    </Button>
  )
}
