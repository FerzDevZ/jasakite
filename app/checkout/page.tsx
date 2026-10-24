"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { cityFromLocation } from "@/lib/location"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { RadioCardGroup } from "@/components/ui/radio-card-group"
import { PageShell } from "@/components/layout/page-shell"
import { CartCheckout } from "@/components/checkout/cart-checkout"
import {
  useCheckoutBalance,
  SaldoBalanceNotice,
} from "@/components/checkout/saldo-balance"
import {
  ArrowLeft,
  Clock,
  Landmark,
  Wallet,
  SearchX,
  Loader2,
  ShieldCheck,
  MessageSquare,
  Star,
  Share2,
  CalendarDays,
  MapPin,
} from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { formatIDR } from "@/lib/utils"
import { csrfFetch } from "@/lib/csrf-fetch"

type ServiceDetail = {
  id: string | number
  title: string
  slug: string
  price: number
  deliveryTimeDays: number
  imageUrl: string | null
  provider: { id: string | number; name: string | null }
  packages?: {
    id: string
    name: string
    price: number
    deliveryTimeDays: number
    features: string[]
    position: number
  }[]
}

const PAYMENT_METHODS = [
  // "transfer" adalah alias QRIS di API (lib/payments.ts). Ia harus berada di
  // urutan pertama: radiogroup memakai roving tabindex, dan pilihan aktif
  // harus menjadi satu-satunya tab stop yang terlihat di awal.
  //
  // Hanya dua metode ini yang diterima server — dulu UI juga menawarkan
  // E-Wallet dan Bayar di Tempat, tapi POST /api/orders menolak keduanya
  // ("Metode pembayaran tidak didukung"), jadi menawarkannya hanya
  // menjanjikan kegagalan saat konfirmasi.
  {
    value: "transfer",
    label: "QRIS / Transfer platform",
    description: "Scan QRIS, unggah bukti, diverifikasi admin",
    icon: Landmark,
  },
  {
    value: "saldo",
    label: "Saldo JASAKITE",
    description: "Bayar instan dari saldo dompet",
    icon: Wallet,
  },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"]

// Instruksi lanjutan per metode — tampil saat kartu dipilih agar pengguna
// tahu apa yang terjadi setelah konfirmasi, bukan hanya "pilih dan selesai".
const PAYMENT_DETAILS: Record<PaymentMethod, string> = {
  saldo:
    "Total langsung dipotong dari saldo dompet Anda. Penyedia menerima dana saat pesanan selesai; pembatalan mengembalikan saldo penuh.",
  transfer:
    "Uang ditahan platform (escrow) sampai pekerjaan selesai. Scan QRIS di halaman pesanan, unggah bukti transfer, lalu diverifikasi admin. Penyedia baru dibayar setelah pesanan selesai.",
}

// Janji platform yang benar-benar dijalankan aplikasi ini — bukan klaim
// escrow palsu: pembatalan bebas selama PENDING memang diizinkan FSM.
const TRUST_POINTS = [
  { icon: ShieldCheck, text: "Bisa dibatalkan gratis selama belum dikerjakan" },
  { icon: MessageSquare, text: "Koordinasi jadwal & alamat via pesan" },
  { icon: Star, text: "Rating dan ulasan hanya dari pelanggan asli" },
] as const

function CheckoutSkeleton() {
  return (
    <PageShell className="space-y-6 py-10">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    </PageShell>
  )
}

function ServiceNotFound() {
  return (
    <PageShell width="prose" className="py-20">
      <EmptyState
        icon={SearchX}
        title="Jasa tidak ditemukan"
        description="Tautan checkout tidak menyertakan jasa yang valid, atau jasa sudah tidak tayang."
        action={
          <Link href="/services">
            <Button className="shadow-glow">Jelajahi Jasa</Button>
          </Link>
        }
      />
    </PageShell>
  )
}

/* Angka nomor pesanan naik dari 0 — momen "pesananmu sudah ada nomornya".
   rAF murni tanpa dependensi; reduced-motion dibiarkan karena ini animasi
   singkat berbasis angka, bukan gerakan besar. */
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!Number.isFinite(target)) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setValue(target)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs])

  return value
}

function CheckoutSuccess({ orderId }: { orderId: string | number }) {
  const displayId = useCountUp(typeof orderId === 'number' ? orderId : Number(orderId) || 0)

  // Konfeti hanya sekali saat mount. Warna diambil dari palet brand.
  // Dimatikan total bila pengguna memilih reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let cancelled = false
    import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return
      const colors = ["#F97316", "#FB7A23", "#FBBF24", "#FBFAF8"]
      confetti({
        particleCount: 90,
        spread: 75,
        startVelocity: 38,
        origin: { y: 0.35 },
        colors,
        disableForReducedMotion: true,
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const waText = encodeURIComponent(
    `Pesanan #${orderId} di JASAKITE berhasil dibuat! Menunggu konfirmasi provider. Lihat detail: ${typeof window !== "undefined" ? window.location.origin : ""}/orders/${orderId}`
  )

  return (
    <PageShell width="prose" className="py-20">
      <Card className="overflow-hidden text-center">
        <div className="bg-brand-gradient h-1.5 w-full" aria-hidden />
        <CardContent className="space-y-5 p-6 sm:p-10">
          <div className="animate-success-pop mx-auto" aria-hidden>
            <svg
              className="mx-auto h-20 w-20"
              viewBox="0 0 52 52"
              fill="none"
              role="img"
              aria-label="Pesanan berhasil"
            >
              <circle
                className="animate-check-circle"
                cx="26"
                cy="26"
                r="24"
                stroke="hsl(var(--success))"
                strokeWidth="2.5"
                fill="hsl(var(--success-soft))"
              />
              <path
                className="animate-check-mark"
                d="M15 27l7 7 15-16"
                stroke="hsl(var(--success))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>

          <div className="animate-rise-in stagger-1">
            <h1 className="text-3xl font-bold">Pesanan Berhasil Dibuat</h1>
            <p className="mt-2 text-muted-foreground">
              Nomor pesanan Anda{" "}
              <span className="font-bold tabular-nums text-foreground">
                #{displayId}
              </span>{" "}
              sudah masuk. Provider akan segera mengonfirmasi — pantau
              progresnya lewat halaman pesanan atau pesan langsung.
            </p>
          </div>

          <div className="animate-rise-in stagger-2 flex flex-col justify-center gap-3 pt-2 sm:flex-row">
            <Link href={`/orders/${orderId}`}>
              <Button className="w-full shadow-glow sm:w-auto">
                Lihat Pesanan Ini
              </Button>
            </Link>
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Bagikan via WhatsApp
              </a>
            </Button>
          </div>

          <div className="animate-rise-in stagger-3 pt-2">
            <Link
              href="/services"
              className="focus-ring text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              atau jelajahi jasa lain
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  )
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get("service")
  const packageId = searchParams.get("package")
  /**
   * Dua alur checkout hidup berdampingan:
   *  - `?from=cart` → wizard tiga langkah untuk keranjang multi-penyedia;
   *  - `?service=<slug>` → satu halaman untuk satu jasa.
   *
   * Yang kedua sengaja TIDAK dipecah menjadi langkah: satu jasa berarti satu
   * keputusan, dan menyembunyikan alamat/jadwal di balik dua klik hanya
   * menambah friksi tanpa mengurangi kesalahan.
   */
  const fromCart = searchParams.get("from") === "cart"

  // Auto-save draft ke localStorage
  const DRAFT_KEY = `checkout-draft-${slug}`
  const [address, setAddress] = useState(() => {
    if (typeof window === "undefined") return ""
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}" ).address || "" } catch { return "" }
  })
  const [addressTouched, setAddressTouched] = useState(false)
  const [deadline, setDeadline] = useState(() => {
    if (typeof window === "undefined") return ""
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}" ).deadline || "" } catch { return "" }
  })
  const [notes, setNotes] = useState(() => {
    if (typeof window === "undefined") return ""
    try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}" ).notes || "" } catch { return "" }
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => {
    if (typeof window === "undefined") return "transfer"
    // Draft lama bisa memuat "ewallet"/"cod" yang kini tidak lagi ditawarkan
    // (dan ditolak server) — nilai tak dikenal jatuh kembali ke "transfer".
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}").paymentMethod
      return saved === "saldo" || saved === "transfer" ? saved : "transfer"
    } catch { return "transfer" }
  })

  // Simpan draft setiap perubahan
  useEffect(() => {
    if (!slug) return
    const draft = { address, deadline, notes, paymentMethod }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [address, deadline, notes, paymentMethod, slug, DRAFT_KEY])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<number | null>(null)

  // Bersihkan draft saat success
  useEffect(() => {
    if (success && slug) localStorage.removeItem(DRAFT_KEY)
  }, [success, slug, DRAFT_KEY])

  const { data: session } = useSession()

  const { data: service, isLoading } = useQuery<ServiceDetail>({
    queryKey: ["checkout-service", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Jasa tidak ditemukan")
      const res = await fetch(`/api/services?slug=${slug}`)
      const data = await res.json()
      return data.services?.[0]
    },
    enabled: Boolean(slug),
  })

  const isOwnService = Boolean(service && session?.user?.id && String(service.provider.id) === String(session.user.id))

  // Paket tier dari URL — id yang tidak cocok dengan paket jasa ini
  // (tautan basi/salah) jatuh diam-diam ke harga dasar, dan POST di bawah
  // tetap mengirim harga dasar: tampilan dan server tidak pernah beda harga.
  const selectedPkg =
    service?.packages?.find((p) => String(p.id) === packageId) ?? null
  const displayPrice = selectedPkg?.price ?? service?.price ?? 0
  const displayDays =
    selectedPkg?.deliveryTimeDays ?? service?.deliveryTimeDays ?? 0

  // Saldo dompet — hanya diambil saat metode Saldo dipilih. Angka yang sama
  // dipakai dua kali: panel peringatan di kartu pembayaran dan penguncian
  // tombol submit, supaya kekurangan saldo ketahuan SEBELUM menekan Bayar.
  const walletBalance = useCheckoutBalance(paymentMethod === "saldo")
  const saldoInsufficient =
    paymentMethod === "saldo" &&
    walletBalance.balance !== null &&
    walletBalance.balance < displayPrice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!service) return
    if (!address.trim()) {
      setError("Alamat pelaksanaan wajib diisi agar provider tahu lokasi kerja.")
      toast.error("Alamat belum diisi", {
        description: "Provider butuh alamat untuk datang ke lokasi.",
      })
      return
    }
    if (!cityFromLocation(address)) {
      setError("Sertakan kota/kabupaten — contoh: Pangkal Pinang, Kepulauan Bangka Belitung")
      toast.error("Alamat belum lengkap", {
        description: "Sertakan kabupaten/kota agar provider bisa datang (wilayah Kepulauan Bangka Belitung).",
      })
      setAddressTouched(true)
      return
    }
    setSubmitting(true)
    setError("")

    try {
      const res = await csrfFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          orderNotes: notes || undefined,
          address,
          deadline: deadline ? new Date(`${deadline}T09:00:00`) : undefined,
          paymentMethod,
          // Server memvalidasi ulang paket milik jasa ini dan memakai harga
          // paket terverifikasi — body tidak pernah menjadi sumber harga.
          packageId: selectedPkg ? String(selectedPkg.id) : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        const msg =
          data?.error === "Unauthorized"
            ? "Silakan masuk terlebih dahulu."
            : data?.error ?? "Gagal membuat pesanan."
        setError(msg)
        toast.error("Gagal membuat pesanan", { description: msg })
        setSubmitting(false)
        return
      }

      setSuccess(data.id)
      toast.success("Pesanan berhasil dibuat!", {
        description: `Pesanan #${data.id} telah dibuat. Provider akan mengonfirmasi segera.`,
      })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setError("Terjadi kesalahan. Coba lagi.")
      toast.error("Terjadi kesalahan", { description: "Coba lagi nanti." })
    }
    setSubmitting(false)
  }

  if (fromCart) return <CartCheckout />

  if (!slug) return <ServiceNotFound />

  if (success) return <CheckoutSuccess orderId={success} />

  if (isLoading) return <CheckoutSkeleton />
  if (!service) return <ServiceNotFound />

  if (isOwnService) {
    return (
      <PageShell width="prose" className="py-20">
        <EmptyState
          icon={SearchX}
          title="Tidak bisa memesan jasa sendiri"
          description="Anda adalah pemilik jasa ini. Silakan kelola jasa dari dashboard provider atau cari jasa lain."
          action={
            <div className="flex gap-3">
              <Link href="/dashboard/provider"><Button variant="outline">Ke Dashboard</Button></Link>
              <Link href="/services"><Button>Jelajahi Jasa</Button></Link>
            </div>
          }
        />
      </PageShell>
    )
  }

  // Tanggal minimal besok — jasa lokal tidak pernah dikerjakan "kemarin".
  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]

  const submitButton = (className?: string, variant: "primary" | "secondary" = "primary", size: "default" | "lg" = "lg") => (
    <Button
      type="submit"
      size={size}
      variant={variant === "secondary" ? "outline" : "default"}
      className={className}
      disabled={submitting || isOwnService || saldoInsufficient}
    >
      {submitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Memproses...
        </>
      ) : (
        "Konfirmasi Pesanan"
      )}
    </Button>
  )

  return (
    <PageShell className="py-10 pb-44 lg:pb-10 animate-content-in">
      <div className="mx-auto mb-6 h-1.5 w-full max-w-[min(28rem,calc(100vw-32px))] overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 rounded-full bg-primary transition-[width] duration-300 ease-smooth" aria-hidden />
      </div>
      {/* Stepper 2 langkah — nasional: jelas, tidak menipu */}
      <div className="mb-6 flex items-center justify-center gap-1.5 text-xs font-medium sm:gap-2" aria-label="Langkah checkout">
        <span className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-2xs">1</span> Detail Jasa
        </span>
        <span className="h-px w-8 max-w-8 flex-1 bg-border" aria-hidden />
        <span className="flex items-center gap-1.5 whitespace-nowrap text-primary-strong" aria-current="step">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-2xs font-bold text-primary-foreground">2</span> Alamat &amp; Bayar
        </span>
      </div>

      <Link
        href={`/service/${service.slug}`}
        className="focus-ring mb-6 inline-flex items-center gap-1 rounded text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali ke detail jasa
      </Link>

      <form
        onSubmit={handleSubmit}
        className="grid gap-8 lg:grid-cols-[1fr_380px]"
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detail Pesanan</CardTitle>
              <CardDescription>
                Anda memesan jasa: {service.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-3 rounded-lg bg-muted/60 p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {service.imageUrl && (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={service.imageUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{service.title}</div>
                    <div className="text-sm text-muted-foreground">
                      Oleh {service.provider.name ?? "Provider"}
                    </div>
                    {selectedPkg && (
                      <div className="text-sm font-semibold text-primary-strong">
                        Paket {selectedPkg.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">                    <div className="text-base font-bold text-primary-strong sm:text-xl">
                    {formatIDR(displayPrice)}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" aria-hidden />
                    Estimasi {displayDays} hari
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">
                  Alamat Pelaksanaan <span aria-hidden>*</span>
                </Label>
                <textarea
                  id="address"
                  required
                  rows={3}
                  autoComplete="street-address"
                  placeholder="Nama jalan, nomor rumah, kelurahan/kecamatan, kabupaten/kota — mis. Jl. Depati Amir No.12, Pangkal Pinang, Kepulauan Bangka Belitung"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onBlur={() => setAddressTouched(true)}
                  maxLength={500}
                  aria-invalid={addressTouched && (!address.trim() || !cityFromLocation(address)) ? "true" : undefined}
                  aria-describedby={addressTouched && (!address.trim() || !cityFromLocation(address)) ? "address-error" : "address-hint"}
                  className={`focus-ring w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground ${addressTouched && (!address.trim() || !cityFromLocation(address)) ? "border-destructive" : "border-input"}`}
                />
                {addressTouched && !address.trim() ? (
                  <p id="address-error" role="alert" className="text-xs text-destructive-strong">Alamat lengkap wajib diisi — sertakan kabupaten/kota agar provider bisa datang (wilayah Kepulauan Bangka Belitung).</p>
                ) : addressTouched && !cityFromLocation(address) ? (
                  <p id="address-error" role="alert" className="text-xs text-destructive-strong">Sertakan kabupaten/kota — contoh: “Pangkal Pinang, Kepulauan Bangka Belitung”. Tanpa kota, provider tidak bisa menemukan lokasi.</p>
                ) : (
                  <p id="address-hint" className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden />
                    Provider akan datang ke alamat ini. JASAKITE melayani seluruh Kepulauan Bangka Belitung.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {[{
                    label: "Pangkal Pinang",
                    value: "Jl. Depati Amir No.12, Pangkal Pinang, Kepulauan Bangka Belitung",
                  }, {
                    label: "Sungailiat",
                    value: "Jl. Jendral Sudirman No.10, Sungailiat, Kabupaten Bangka, Kepulauan Bangka Belitung",
                  }, {
                    label: "Tanjung Pandan",
                    value: "Jl. Hang Tuah No.8, Tanjung Pandan, Kabupaten Belitung, Kepulauan Bangka Belitung",
                  }, {
                    label: "Muntok",
                    value: "Jl. Merdeka No.15, Muntok, Kabupaten Bangka Barat, Kepulauan Bangka Belitung",
                  }].map((ex) => (
                    <button key={ex.label} type="button" onClick={() => setAddress(ex.value)} className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Jadwal yang Diinginkan</Label>
                <div className="flex flex-wrap gap-2">
                  {["Segera", "Minggu ini", "2 minggu", "Bulan depan"].map((label) => {
                    const days = label === "Segera" ? 1 : label === "Minggu ini" ? 3 : label === "2 minggu" ? 14 : 30
                    const d = new Date(Date.now() + days * 86400000).toISOString().split("T")[0]
                    const active = deadline === d
                    return (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setDeadline(deadline === d ? "" : d)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary-strong"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <Input
                  id="deadline"
                  type="date"
                  min={minDate}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full sm:w-64"
                />
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3 w-3" aria-hidden />
                  Bisa disesuaikan lagi lewat pesan dengan provider.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes">Catatan untuk Provider (opsional)</Label>
                  <span
                    className={`text-2xs tabular-nums ${
                      notes.length >= 480 ? "text-destructive-strong" : "text-muted-foreground"
                    }`}
                  >
                    {notes.length}/500
                  </span>
                </div>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Contoh: antar dokumen dari Jl. Depati Amir ke kantor pos, mohon hubungi dulu sebelum datang"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  className="focus-ring w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
              <CardDescription>
                Pilih cara bayar yang paling nyaman
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioCardGroup
                label="Metode pembayaran"
                options={[...PAYMENT_METHODS]}
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
              {/* Detail berganti mengikuti pilihan — key memicu remount agar
                  animasi rise-in terulang setiap kali metode diganti. */}
              <p
                key={paymentMethod}
                className="animate-rise-in rounded-lg bg-muted/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
              >
                {PAYMENT_DETAILS[paymentMethod]}
              </p>
              {paymentMethod === "saldo" && (
                <SaldoBalanceNotice
                  total={displayPrice}
                  balance={walletBalance.balance}
                  loading={walletBalance.loading}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle>Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Harga Jasa{selectedPkg ? ` (${selectedPkg.name})` : ""}
                </span>
                <span className="font-medium">{formatIDR(displayPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Biaya Layanan</span>
                <Badge variant="success">GRATIS</Badge>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary-strong">
                  {formatIDR(displayPrice)}
                </span>
              </div>

              <ul className="space-y-2 border-t border-border pt-4">
                {TRUST_POINTS.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
                >
                  {error}
                </p>
              )}

              {/* Desktop: secondary — primary ada di bar mobile agar 1 aksi utama (P0) */}
              {submitButton("hidden w-full lg:flex", "secondary")}

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                Data pesanan hanya dibagikan ke provider terkait
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action bar mobile — glass + safe-area */}
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 shrink">
              <div className="text-2xs uppercase tracking-wide text-muted-foreground">
                Total
              </div>
              <div className="truncate text-base font-bold text-primary-strong sm:text-lg">
                {formatIDR(displayPrice)}
              </div>
            </div>
            <div className="ml-auto flex-1">
              {submitButton("flex w-full shadow-glow", "primary", "default")}
            </div>
          </div>
        </div>
      </form>
    </PageShell>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  )
}
