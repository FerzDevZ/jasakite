"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR } from "@/lib/utils"
import { transactionTypeLabel } from "@/lib/wallet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet } from "@/components/ui/sheet"
import { EmptyState } from "@/components/ui/empty-state"

type PendingWalletTx = {
  id: string
  type: "TOPUP" | "WITHDRAW"
  amount: number
  proofImage: string | null
  proofImageUpdatedAt: string | null
  topupCode: string | null
  orderId: string | null
  bankSnapshot: string | null
  createdAt: string
  user: { id: string; name: string | null; email: string; role: string }
}

/**
 * Bukti dianggap "pernah diganti" bila auditnya menyimpang dari waktu
 * pengajuan. POST mengisi proofImageUpdatedAt saat lampiran PERTAMA (jejak
 * audit yang sah), PATCH menimpanya saat penggantian — jadi badge hanya
 * boleh menyala untuk yang nilainya terlambat jauh dari createdAt.
 * Toleransi 2 detik menutup jeda clock halus antara create dan penulisan
 * kolom audit.
 */
function hasReplacedProof(tx: Pick<PendingWalletTx, "createdAt" | "proofImageUpdatedAt">): boolean {
  if (!tx.proofImageUpdatedAt) return false
  return (
    new Date(tx.proofImageUpdatedAt).getTime() -
      new Date(tx.createdAt).getTime() >
    2000
  )
}

type PendingOrderPayment = {
  id: string
  code: string | null
  totalPrice: number
  paymentMethod: string | null
  paymentProof: string | null
  paymentProofUpdatedAt: string | null
  createdAt: string
  customer: { id: string; name: string | null; email: string }
  service: { title: string; provider: { id: string; name: string | null } }
}

type AdminWalletPayload = {
  pending: PendingWalletTx[]
  pendingPayments: PendingOrderPayment[]
  pendingTopups: number
  pendingWithdraws: number
  pendingOrderPayments: number
  canVerify: boolean
  totpEnabled: boolean
  moneyTrustUntil: string | null
}

/** mm:ss sisa jendela kepercayaan uang. */
function trustCountdown(untilEpochMs: number, nowEpochMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((untilEpochMs - nowEpochMs) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function AdminWalletQueue() {
  const queryClient = useQueryClient()
  const [proofUrl, setProofUrl] = React.useState<string | null>(null)
  // Kode 2FA langkah-kedua. Disimpan di sini (bukan per kartu) karena satu kode
  // berlaku untuk semua keputusan dalam periode 30 detik — dan server menolak
  // pemakaian ulang kode yang sama. Satu kode yang sah juga membuka jendela
  // kepercayaan 15 menit, jadi untuk antrean panjang kode cukup sekali.
  const [totpCode, setTotpCode] = React.useState("")

  const { data, isLoading } = useQuery<AdminWalletPayload>({
    queryKey: ["admin-wallet"],
    queryFn: async () => {
      const response = await fetch("/api/admin/wallet", { cache: "no-store" })
      if (response.status === 401) throw new Error("Sesi berakhir")
      if (!response.ok) throw new Error("Gagal memuat antrean verifikasi")
      return response.json()
    },
  })

  // Detak 1 detik hanya saat jendela kepercayaan aktif — untuk hitung mundur.
  const trustUntilMs = data?.moneyTrustUntil ? new Date(data.moneyTrustUntil).getTime() : null
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!trustUntilMs || trustUntilMs <= nowMs) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [trustUntilMs, nowMs])
  const trustActive = Boolean(trustUntilMs && trustUntilMs > nowMs)

  const decidePayment = useMutation({
    mutationFn: async (input: {
      orderId: string
      action: "verify" | "reject"
      rejectReason?: string
    }) => {
      const response = await csrfFetch(`/api/orders/${input.orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: input.action,
          rejectReason: input.rejectReason,
          totpCode: totpCode.replace(/\s/g, ""),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal memproses pembayaran")
      }
      return payload
    },
    onSuccess: async (_payload, input) => {
      setTotpCode("")
      toast.success(
        input.action === "verify" ? "Pembayaran diverifikasi" : "Bukti ditolak",
        { description: "Pelanggan dan penyedia sudah diberi notifikasi." }
      )
      await queryClient.invalidateQueries({ queryKey: ["admin-wallet"] })
    },
    onError: (error: Error) => {
      toast.error("Keputusan gagal", { description: error.message })
      void queryClient.invalidateQueries({ queryKey: ["admin-wallet"] })
    },
  })

  const decide = useMutation({
    mutationFn: async (input: {
      transactionId: string
      action: "verify" | "reject"
      rejectReason?: string
    }) => {
      const response = await csrfFetch(`/api/wallet/${input.transactionId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: input.action,
          rejectReason: input.rejectReason,
          totpCode: totpCode.replace(/\s/g, ""),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal memproses keputusan")
      }
      return payload
    },
    onSuccess: async (_payload, input) => {
      setTotpCode("")
      toast.success(
        input.action === "verify" ? "Pengajuan disetujui" : "Pengajuan ditolak",
        { description: "Pengguna sudah diberi notifikasi." }
      )
      await queryClient.invalidateQueries({ queryKey: ["admin-wallet"] })
    },
    onError: (error: Error) => {
      toast.error("Keputusan gagal", { description: error.message })
      void queryClient.invalidateQueries({ queryKey: ["admin-wallet"] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Antrean tidak bisa dimuat"
        description="Periksa koneksi lalu muat ulang halaman."
      />
    )
  }

  const topups = data.pending.filter((tx) => tx.type === "TOPUP")
  const withdraws = data.pending.filter((tx) => tx.type === "WITHDRAW")
  // Tombol keputusan hanya hidup bila server benar-benar akan menerimanya:
  // peran cukup, 2FA aktif, dan (kode 6 digit terisi ATAU jendela kepercayaan
  // 15 menit dari kode sebelumnya masih hidup di perangkat ini).
  const totpReady =
    data.totpEnabled &&
    (trustActive || totpCode.replace(/\s/g, "").length === 6)
  const canDecide = data.canVerify && totpReady

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verifikasi Saldo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.pendingTopups} top-up, {data.pendingWithdraws} penarikan, dan{" "}
          {data.pendingOrderPayments} pembayaran pesanan menunggu keputusan.
          Keputusan bersifat final — pengajuan yang sama tidak bisa diputus dua kali.
        </p>
        {!data.canVerify && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Anda masuk sebagai ADMIN. Verifikasi uang hanya bisa dilakukan
            SUPER_ADMIN — antrean ini hanya-baca untuk Anda.
          </p>
        )}

        {data.canVerify && !data.totpEnabled && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm text-destructive-strong">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              2FA belum aktif, jadi server menolak setiap keputusan uang dari akun
              ini.{" "}
              <Link
                href="/dashboard/admin/keamanan"
                className="font-semibold underline underline-offset-4"
              >
                Aktifkan 2FA sekarang
              </Link>{" "}
              — butuh password dan satu kode dari aplikasi authenticator.
            </span>
          </p>
        )}

        {data.canVerify && data.totpEnabled && trustActive && trustUntilMs && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-sm text-success">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span aria-live="polite">
              Akses uang tepercaya — kode 2FA tidak diperlukan lagi selama{" "}
              <strong>{trustCountdown(trustUntilMs, nowMs)}</strong>. Satu kode
              yang sah tadi membuka jendela 15 menit; setelah habis, kolom kode
              muncul kembali.
            </span>
          </p>
        )}

        {data.canVerify && data.totpEnabled && !trustActive && (
          <div className="mt-4 max-w-xs space-y-1.5">
            <Label htmlFor="admin-totp-code">Kode 2FA untuk keputusan</Label>
            <Input
              id="admin-totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}"
              maxLength={7}
              placeholder="123456"
              value={totpCode}
              onChange={(event) => setTotpCode(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Satu kode cukup sekali: kode yang sah membuka jendela 15 menit
              untuk semua keputusan dalam sesi ini.
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Pembayaran Pesanan Menunggu ({data.pendingPayments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pendingPayments.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada pembayaran pesanan menunggu"
              description="Semua bukti transfer QRIS sudah diputus."
            />
          ) : (
            data.pendingPayments.map((payment) => (
              <article
                key={payment.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatIDR(payment.totalPrice)}
                      {payment.code ? (
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          #{payment.code}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {payment.service.title} • {payment.service.provider.name ?? "Penyedia"}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {payment.customer.name ?? "Tanpa nama"} • {payment.customer.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bukti dikirim {new Date(payment.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {payment.paymentProof ? (
                      <button
                        type="button"
                        onClick={() => setProofUrl(payment.paymentProof)}
                        aria-label="Lihat bukti pembayaran"
                        title="Perbesar bukti pembayaran"
                        className="focus-ring flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card p-1 pr-2.5 transition-colors hover:border-primary/40"
                      >
                        <span className="relative block h-10 w-10 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={payment.paymentProof}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          Lihat bukti
                        </span>
                      </button>
                    ) : null}
                    <Button
                      size="sm"
                      disabled={decidePayment.isPending || !canDecide}
                      onClick={() =>
                        decidePayment.mutate({ orderId: payment.id, action: "verify" })
                      }
                    >
                      {decidePayment.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      )}
                      Verifikasi
                    </Button>
                    <RejectButton
                      disabled={decidePayment.isPending || !canDecide}
                      onConfirm={(reason) =>
                        decidePayment.mutate({
                          orderId: payment.id,
                          action: "reject",
                          rejectReason: reason,
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Isi Saldo Menunggu ({topups.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topups.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada top-up menunggu"
              description="Semua pengajuan isi saldo sudah diproses."
            />
          ) : (
            topups.map((tx) => (
              <article
                key={tx.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatIDR(tx.amount)}
                      {tx.topupCode ? (
                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                          {tx.topupCode}
                        </span>
                      ) : null}
                      {hasReplacedProof(tx) && (
                        <span
                          title={`Bukti terakhir diubah ${new Date(tx.proofImageUpdatedAt!).toLocaleString("id-ID")}`}
                          className="ml-2 inline-flex items-center gap-1 rounded-md bg-warning-soft px-1.5 py-0.5 align-middle text-2xs font-semibold text-warning"
                        >
                          <RefreshCw className="h-3 w-3" aria-hidden />
                          Bukti diubah
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {tx.user.name ?? "Tanpa nama"} • {tx.user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Diajukan {new Date(tx.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tx.proofImage ? (
                      <button
                        type="button"
                        onClick={() => setProofUrl(tx.proofImage)}
                        aria-label="Lihat bukti transfer"
                        title="Perbesar bukti transfer"
                        className="focus-ring flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card p-1 pr-2.5 transition-colors hover:border-primary/40"
                      >
                        <span className="relative block h-10 w-10 overflow-hidden rounded-md bg-muted">
                          <Image
                            src={tx.proofImage}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          Lihat bukti
                        </span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-warning-soft px-2 py-1 text-2xs font-semibold text-warning">
                        Bukti belum dilampirkan
                      </span>
                    )}
                    <Button
                      size="sm"
                      disabled={decide.isPending || !canDecide}
                      onClick={() =>
                        decide.mutate({ transactionId: tx.id, action: "verify" })
                      }
                    >
                      {decide.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      )}
                      Setujui
                    </Button>
                    <RejectButton
                      disabled={decide.isPending || !canDecide}
                      onConfirm={(reason) =>
                        decide.mutate({
                          transactionId: tx.id,
                          action: "reject",
                          rejectReason: reason,
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Penarikan Menunggu ({withdraws.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {withdraws.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tidak ada penarikan menunggu"
              description="Semua pengajuan tarik saldo sudah diproses."
            />
          ) : (
            withdraws.map((tx) => (
              <article
                key={tx.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{formatIDR(tx.amount)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {tx.user.name ?? "Tanpa nama"} • {tx.user.email}
                    </p>
                    {tx.bankSnapshot ? (
                      <p className="mt-1 rounded bg-muted px-2 py-1 text-xs">
                        Transfer ke: {tx.bankSnapshot}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={decide.isPending || !canDecide}
                      onClick={() =>
                        decide.mutate({ transactionId: tx.id, action: "verify" })
                      }
                    >
                      {decide.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Banknote className="h-4 w-4" aria-hidden />
                      )}
                      Sudah ditransfer
                    </Button>
                    <RejectButton
                      disabled={decide.isPending || !canDecide}
                      confirmLabel="Tolak & kembalikan saldo"
                      onConfirm={(reason) =>
                        decide.mutate({
                          transactionId: tx.id,
                          action: "reject",
                          rejectReason: reason,
                        })
                      }
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(proofUrl)}
        onOpenChange={(open) => {
          if (!open) setProofUrl(null)
        }}
        title="Bukti transfer"
        description="Cocokkan nominal, waktu, dan berita transfer sebelum menyetujui."
      >
        {proofUrl ? (
          proofUrl.startsWith("https://") ? (
            <a
              href={proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring block overflow-hidden rounded-xl border border-border"
            >
              <Image
                src={proofUrl}
                alt="Bukti transfer pengguna"
                width={800}
                height={1000}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </a>
          ) : (
            /* Data URI: Chrome memblokir navigasi ke data:, jadi tidak
               dibungkus <a> — cukup gambar yang bisa dilihat penuh. */
            <div className="overflow-hidden rounded-xl border border-border">
              <Image
                src={proofUrl}
                alt="Bukti transfer pengguna"
                width={800}
                height={1000}
                className="h-auto w-full object-contain"
                unoptimized
              />
            </div>
          )
        ) : null}
      </Sheet>
    </div>
  )
}

function RejectButton({
  disabled,
  onConfirm,
  confirmLabel = "Tolak",
}: {
  disabled?: boolean
  onConfirm: (reason: string) => void
  confirmLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const valid = reason.trim().length >= 3

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="text-destructive-strong hover:bg-destructive/10"
      >
        <XCircle className="h-4 w-4" aria-hidden />
        {confirmLabel}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Alasan penolakan"
        description="Alasan ini dikirim ke pengguna sebagai notifikasi."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (!valid) return
            onConfirm(reason.trim())
            setOpen(false)
            setReason("")
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Alasan (min. 3 karakter)</Label>
            <textarea
              id="reject-reason"
              rows={3}
              maxLength={300}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="focus-ring w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
              placeholder="Contoh: Nominal transfer tidak sesuai pengajuan."
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!valid}>
            Kirim penolakan
          </Button>
        </form>
      </Sheet>
    </>
  )
}
