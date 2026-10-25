"use client"

import * as React from "react"
import Image from "next/image"
import { BadgeCheck, Banknote, Clock, ImagePlus, Loader2, ShieldCheck, Upload, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR, cn } from "@/lib/utils"
import { compressProofImage, validateProofImage } from "@/lib/proof-image"
import {
  PLATFORM_QRIS,
  canProviderStart,
  paymentDisplayLabel,
  paymentStatusLabel,
  paymentStatusTone,
} from "@/lib/payments"

type PaymentOrder = {
  id: string | number
  code: string | null
  totalPrice: number
  paymentMethod: string | null
  paymentStatus: string
  paymentProof: string | null
  paymentRejectReason: string | null
}

const TONE_CLASS: Record<string, string> = {
  warning: "bg-warning-soft text-warning",
  info: "bg-primary/10 text-primary-strong",
  success: "bg-success-soft text-success",
  muted: "bg-muted text-muted-foreground",
}

function PaymentStatusPill({
  status,
  method,
}: {
  status: string
  method?: string | null
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-2xs font-semibold",
        TONE_CLASS[paymentStatusTone(status)] ?? TONE_CLASS.muted
      )}
    >
      {paymentDisplayLabel(status, method)}
    </span>
  )
}

/**
 * Kartu pembayaran escrow.
 *
 * Pelanggan melihat QRIS platform dan mengunggah bukti; SUPER_ADMIN yang
 * memutuskan. Penyedia hanya melihat status — mereka tidak boleh mulai
 * sebelum `paymentStatus` menjadi PAID.
 */
export function OrderPaymentCard({
  order,
  isCustomer,
  isProvider,
  isSuperAdmin,
  onUpdated,
}: {
  order: PaymentOrder
  isCustomer: boolean
  isProvider: boolean
  isSuperAdmin: boolean
  onUpdated: () => void
}) {
  const [proof, setProof] = React.useState("")
  const [proofError, setProofError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<"submit" | "verify" | "reject" | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [showReject, setShowReject] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const isQris = order.paymentMethod === "qris"
  const isPaid = order.paymentStatus === "PAID"
  const isRefunded = order.paymentStatus === "REFUNDED"
  const waiting = order.paymentStatus === "WAITING_VERIFICATION"
  const proofValid = validateProofImage(proof).ok

  const pickFile = async (file: File | undefined) => {
    if (!file) return
    setProofError(null)
    setProof("")
    try {
      setProof(await compressProofImage(file))
    } catch (cause) {
      setProofError(cause instanceof Error ? cause.message : "Gambar tidak bisa diproses")
    }
  }

  const submitProof = async () => {
    if (!proofValid) return
    setBusy("submit")
    try {
      const res = await csrfFetch(`/api/orders/${order.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofImage: proof }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? "Gagal mengirim bukti")
      toast.success("Bukti terkirim", {
        description: "SUPER_ADMIN akan memverifikasi pembayaran Anda.",
      })
      setProof("")
      if (fileRef.current) fileRef.current.value = ""
      onUpdated()
    } catch (error) {
      toast.error("Gagal mengirim bukti", {
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
      })
    } finally {
      setBusy(null)
    }
  }

  const decide = async (action: "verify" | "reject") => {
    if (action === "reject" && rejectReason.trim().length < 3) {
      toast.error("Alasan penolakan wajib diisi")
      return
    }
    setBusy(action)
    try {
      const res = await csrfFetch(`/api/orders/${order.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectReason: action === "reject" ? rejectReason.trim() : undefined,
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? "Gagal menyimpan keputusan")
      toast.success(
        action === "verify" ? "Pembayaran diverifikasi" : "Bukti pembayaran ditolak",
        {
          description:
            action === "verify"
              ? "Penyedia sekarang boleh mulai bekerja."
              : "Pelanggan akan diminta mengunggah bukti baru.",
        }
      )
      setShowReject(false)
      setRejectReason("")
      onUpdated()
    } catch (error) {
      toast.error("Gagal memproses pembayaran", {
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className={cn(isPaid && "border-success/30")}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Pembayaran</CardTitle>
        <PaymentStatusPill status={order.paymentStatus} method={order.paymentMethod} />
      </CardHeader>
      <CardContent className="space-y-4">
        {order.paymentMethod === "cash" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-muted/50 px-4 py-3">
              <span className="text-sm text-muted-foreground">
                {isPaid ? "Diterima tunai dari pelanggan" : "Bayar tunai ke penyedia saat selesai"}
              </span>
              <span className="text-xl font-extrabold tabular-nums text-primary-strong">
                {formatIDR(order.totalPrice)}
              </span>
            </div>
            <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
              <Banknote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {isPaid
                ? "Pesanan ini diselesaikan dengan pembayaran tunai langsung — tanpa potongan apa pun."
                : "Pembayaran tunai dilakukan langsung ke penyedia saat pekerjaan selesai. Tanpa top-up, tanpa unggah bukti, tanpa potongan."}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              {isPaid ? "Dana diterima platform" : "Nominal yang harus dibayar"}
            </span>
            <span className="text-xl font-extrabold tabular-nums text-primary-strong">
              {formatIDR(order.totalPrice)}
            </span>
          </div>
        )}

        {isPaid && (
          <p className="flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-sm text-success">
            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Pembayaran terverifikasi. Dana ditahan platform dan akan diteruskan ke
            penyedia setelah pesanan selesai.
          </p>
        )}

        {isRefunded && (
          <p className="rounded-xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">
            Pesanan dibatalkan setelah dibayar. Dana sudah dikembalikan ke saldo
            dompet pelanggan.
          </p>
        )}

        {isQris && !isPaid && !isRefunded && isCustomer && (
          <>
            {/* Dua kolom asimetris: QR di kiri (target pindai), instruksi di
                kanan. Di layar sempit tumpuk, tetapi nominal tetap di atas
                instruksi supaya tidak perlu menggulir untuk melihat angka. */}
            <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,150px)_1fr]">
              <a
                href={PLATFORM_QRIS.imagePath}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring block overflow-hidden rounded-lg border border-border bg-white"
                aria-label="Buka QRIS ukuran penuh"
              >
                <Image
                  src={PLATFORM_QRIS.imagePath}
                  alt={`QRIS ${PLATFORM_QRIS.merchantName}`}
                  width={615}
                  height={900}
                  sizes="150px"
                  className="h-auto w-full object-contain"
                />
              </a>
              <div className="space-y-1.5 text-sm">
                <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
                  Scan QRIS
                </p>
                <p className="font-bold">{PLATFORM_QRIS.merchantName}</p>
                <p className="text-xs text-muted-foreground">
                  NMID {PLATFORM_QRIS.nmid} · {PLATFORM_QRIS.terminal}
                </p>
                <p className="text-xs text-muted-foreground">{PLATFORM_QRIS.instruction}</p>
                <p className="pt-1 text-xs font-semibold text-warning">
                  Masukkan nominal persis {formatIDR(order.totalPrice)} — jangan
                  dibulatkan. Cantumkan kode {order.code ?? order.id} bila kolom
                  berita tersedia.
                </p>
              </div>
            </div>

            {waiting && (
              <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Bukti sudah dikirim dan sedang menunggu verifikasi SUPER_ADMIN.
                Anda masih bisa mengganti bukti bila gambarnya kurang jelas.
              </p>
            )}

            {order.paymentRejectReason && order.paymentStatus === "UNPAID" && (
              <p className="flex items-start gap-2 rounded-xl bg-destructive/5 px-3.5 py-3 text-sm text-destructive-strong">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Bukti sebelumnya ditolak: {order.paymentRejectReason}
              </p>
            )}

            {order.paymentProof && (
              <div className="overflow-hidden rounded-xl border border-border bg-muted/40 p-2">
                <div className="relative h-44 w-full">
                  <Image
                    src={order.paymentProof}
                    alt="Bukti pembayaran yang Anda kirim"
                    fill
                    sizes="500px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="order-payment-proof">
                {waiting ? "Ganti bukti transfer" : "Bukti transfer"}
              </Label>
              {!proof ? (
                <label
                  htmlFor="order-payment-proof"
                  className={cn(
                    "focus-ring flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:bg-muted/70",
                    proofError && "border-destructive/60 bg-destructive/5"
                  )}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
                  <span className="text-sm font-semibold">
                    Pilih atau jepret foto bukti transfer
                  </span>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG, atau WebP • dikompres di perangkat Anda
                  </span>
                </label>
              ) : (
                <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-muted">
                  <Image
                    src={proof}
                    alt="Pratinjau bukti transfer"
                    fill
                    sizes="400px"
                    className="object-contain"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProof("")
                      if (fileRef.current) fileRef.current.value = ""
                    }}
                    className="focus-ring absolute right-2 top-2 rounded-lg bg-background/85 px-2 py-1 text-xs font-semibold shadow-sm backdrop-blur"
                  >
                    Hapus
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                id="order-payment-proof"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={(event) => void pickFile(event.target.files?.[0])}
              />
              {proofError && (
                <p role="alert" className="text-xs text-destructive-strong">
                  {proofError}
                </p>
              )}
              <Button
                className="w-full"
                disabled={!proofValid || busy !== null}
                onClick={() => void submitProof()}
              >
                {busy === "submit" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ImagePlus className="h-4 w-4" aria-hidden />
                )}
                {waiting ? "Kirim bukti pengganti" : "Kirim bukti untuk diverifikasi"}
              </Button>
            </div>
          </>
        )}

        {isQris && !isPaid && !isRefunded && isProvider && (
          <p
            className={cn(
              "rounded-xl px-3.5 py-3 text-sm",
              canProviderStart(order.paymentStatus)
                ? "bg-success-soft text-success"
                : "bg-warning-soft text-warning"
            )}
          >
            {canProviderStart(order.paymentStatus)
              ? "Pembayaran terverifikasi — Anda boleh mulai mengerjakan."
              : "Belum bisa dimulai. Tunggu SUPER_ADMIN memverifikasi bukti transfer pelanggan."}
          </p>
        )}

        {isQris && waiting && isSuperAdmin && (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary-strong">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Keputusan SUPER_ADMIN
            </p>
            <p className="text-xs text-muted-foreground">
              Cocokkan nominal, nama pengirim, dan waktu pada bukti dengan mutasi QRIS
              sebelum menyetujui.
            </p>
            {!showReject ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void decide("verify")}
                >
                  {busy === "verify" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <BadgeCheck className="h-4 w-4" aria-hidden />
                  )}
                  Verifikasi pembayaran
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => setShowReject(true)}
                >
                  <XCircle className="h-4 w-4" aria-hidden /> Tolak bukti
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="payment-reject-reason">Alasan penolakan</Label>
                <Input
                  id="payment-reject-reason"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Nominal tidak sesuai / bukti tidak terbaca"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy !== null || rejectReason.trim().length < 3}
                    onClick={() => void decide("reject")}
                  >
                    {busy === "reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <XCircle className="h-4 w-4" aria-hidden />
                    )}
                    Tolak dan minta bukti baru
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => setShowReject(false)}
                  >
                    Batal
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {order.paymentStatus === "WAITING_VERIFICATION" && !isSuperAdmin && (
          <p className="text-xs text-muted-foreground">
            Menunggu verifikasi manual SUPER_ADMIN. Penyedia belum boleh memulai
            sebelum dana dipastikan diterima.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
