"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowDownToLine,
  BadgeCheck,
  Banknote,
  Clock,
  Copy,
  ImagePlus,
  Loader2,
  Landmark,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet as WalletIcon,
} from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR, cn } from "@/lib/utils"
import { sameId } from "@/lib/ids"
import {
  MIN_TOPUP_AMOUNT,
  isCreditType,
  topupStatusLabel,
  topupStatusTone,
  transactionTypeLabel,
} from "@/lib/wallet"
import {
  compressProofImage,
  validateProofImage,
} from "@/lib/proof-image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet } from "@/components/ui/sheet"
import { EmptyState } from "@/components/ui/empty-state"
import { RadioCardGroup } from "@/components/ui/radio-card-group"

type WalletTx = {
  id: string
  type: string
  status: string
  amount: number
  balanceAfter: number
  proofImage: string | null
  topupCode: string | null
  rejectReason: string | null
  orderId: string | null
  bankSnapshot: string | null
  createdAt: string
}

type WalletPayload = {
  balance: number
  bank: {
    bankName: string | null
    bankAccountNumber: string | null
    bankAccountName: string | null
  }
  platformPayment: {
    qris: {
      imagePath: string
      merchantName: string
      nmid: string
      terminal: string
      instruction: string
    }
    bank: {
      bankName: string
      accountNumber: string
      accountName: string
    } | null
  }
  transactions: WalletTx[]
}

const TOPUP_PRESETS = [50_000, 100_000, 200_000, 500_000] as const

const STATUS_TONE_CLASS: Record<string, string> = {
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  destructive: "bg-destructive/10 text-destructive-strong",
  muted: "bg-muted text-muted-foreground",
}

function StatusPill({ status }: { status: string }) {
  const tone = topupStatusTone(status)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-2xs font-semibold",
        STATUS_TONE_CLASS[tone] ?? STATUS_TONE_CLASS.muted
      )}
    >
      {topupStatusLabel(status)}
    </span>
  )
}

export function DashboardWallet() {
  const queryClient = useQueryClient()
  const [topupOpen, setTopupOpen] = React.useState(false)
  const [withdrawOpen, setWithdrawOpen] = React.useState(false)
  const [bankOpen, setBankOpen] = React.useState(false)
  // Top-up PENDING yang sedang dilengkapi/diganti buktinya lewat PATCH /api/wallet.
  const [attachTopup, setAttachTopup] = React.useState<WalletTx | null>(null)
  // Bukti yang sedang diperbesar dari baris riwayat — thumbnail di baris
  // memperlihatkan gambar apa yang pernah dikirim tanpa membuka form lampir.
  const [proofView, setProofView] = React.useState<string | null>(null)

  const { data, isLoading } = useQuery<WalletPayload>({
    queryKey: ["wallet"],
    queryFn: async () => {
      const response = await fetch("/api/wallet", { cache: "no-store" })
      if (response.status === 401) throw new Error("Sesi berakhir")
      if (!response.ok) throw new Error("Gagal memuat dompet")
      return response.json()
    },
  })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["wallet"] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="Dompet tidak bisa dimuat"
        description="Periksa koneksi lalu muat ulang halaman."
      />
    )
  }

  const pendingTopups = data.transactions.filter(
    (tx) => tx.type === "TOPUP" && tx.status === "PENDING"
  )

  return (
    <div className="space-y-6">
      {/* Kartu saldo — satu blok, satu angka, dua aksi */}
      <Card className="overflow-hidden">
        <div className="bg-brand-gradient h-1.5 w-full" aria-hidden />
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
                Saldo JASAKITE
              </p>
              <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight text-primary-strong">
                {formatIDR(data.balance)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setTopupOpen(true)} className="shadow-glow">
                <ArrowDownToLine className="h-4 w-4" aria-hidden /> Isi saldo
              </Button>
              <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
                <TrendingUp className="h-4 w-4" aria-hidden /> Tarik saldo
              </Button>
              <Button variant="ghost" onClick={() => setBankOpen(true)}>
                <Landmark className="h-4 w-4" aria-hidden /> Rekening saya
              </Button>
            </div>
          </div>

          {pendingTopups.length > 0 && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning"
            >
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                {pendingTopups.length} pengajuan isi saldo menunggu verifikasi
                SUPER_ADMIN (kode {pendingTopups.map((tx) => tx.topupCode).join(", ")}).
              </span>
            </div>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <EmptyState
              icon={WalletIcon}
              title="Belum ada transaksi"
              description={`Isi saldo mulai ${formatIDR(MIN_TOPUP_AMOUNT)} untuk mulai membayar pesanan tanpa transfer ulang.`}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.transactions.map((tx) => {
                const credit = isCreditType(tx.type)
                return (
                  <li key={tx.id} className="flex items-start gap-3 py-3">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        credit
                          ? "bg-success-soft text-success"
                          : "bg-destructive/10 text-destructive-strong"
                      )}
                    >
                      {credit ? (
                        <TrendingDown className="h-4 w-4 rotate-180" />
                      ) : (
                        <TrendingUp className="h-4 w-4 rotate-180" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {transactionTypeLabel(tx.type)}
                        </span>
                        {tx.type === "TOPUP" && <StatusPill status={tx.status} />}
                        {tx.type === "WITHDRAW" && (
                          <StatusPill status={tx.status === "PENDING" ? "PENDING" : tx.status} />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString("id-ID")}
                        {tx.topupCode ? ` • ${tx.topupCode}` : ""}
                        {tx.orderId ? (
                          <>
                            {" • "}
                            <Link
                              href={`/orders/${tx.orderId}`}
                              className="underline-offset-2 hover:underline"
                            >
                              Pesanan #{tx.orderId.slice(-6)}
                            </Link>
                          </>
                        ) : ""}
                      </p>
                      {tx.rejectReason && (
                        <p className="mt-1 rounded bg-destructive/5 px-2 py-1 text-xs text-destructive-strong">
                          {tx.rejectReason}
                        </p>
                      )}
                      {tx.bankSnapshot && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Ke: {tx.bankSnapshot}
                        </p>
                      )}
                      {tx.type === "TOPUP" && tx.proofImage && (
                        <button
                          type="button"
                          onClick={() => setProofView(tx.proofImage)}
                          aria-label="Lihat bukti transfer"
                          title="Perbesar bukti transfer"
                          className="focus-ring mt-2 flex w-fit items-center gap-2 rounded-lg border border-border bg-card p-1 pr-2.5 transition-colors hover:border-primary/40"
                        >
                          <span className="relative block h-8 w-8 overflow-hidden rounded-md bg-muted">
                            <Image
                              src={tx.proofImage}
                              alt=""
                              fill
                              sizes="32px"
                              className="object-cover"
                              unoptimized
                            />
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            Lihat bukti
                          </span>
                        </button>
                      )}
                      {tx.type === "TOPUP" && tx.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => setAttachTopup(tx)}
                          className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                          {tx.proofImage ? "Ganti bukti transfer" : "Lampirkan bukti transfer"}
                        </button>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className={cn(
                          "text-sm font-bold tabular-nums",
                          credit ? "text-success" : "text-foreground"
                        )}
                      >
                        {credit ? "+" : "−"}
                        {formatIDR(tx.amount)}
                      </div>
                      <div className="text-2xs text-muted-foreground">
                        Saldo {formatIDR(tx.balanceAfter)}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <TopupSheet
        open={topupOpen}
        onOpenChange={setTopupOpen}
        platformPayment={data.platformPayment}
        onSubmitted={refresh}
      />
      <WithdrawSheet
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        balance={data.balance}
        bank={data.bank}
        onSubmitted={refresh}
      />
      <BankSheet
        open={bankOpen}
        onOpenChange={setBankOpen}
        bank={data.bank}
        onSaved={refresh}
      />
      <AttachProofSheet
        topup={attachTopup}
        onOpenChange={(open) => {
          if (!open) setAttachTopup(null)
        }}
        onSaved={refresh}
      />
      <Sheet
        open={proofView !== null}
        onOpenChange={(open) => {
          if (!open) setProofView(null)
        }}
        title="Bukti transfer"
        description="Gambar yang pernah Anda lampirkan pada pengajuan ini."
      >
        {proofView && proofView.startsWith("https://") ? (
          <a
            href={proofView}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring block overflow-hidden rounded-xl border border-border"
          >
            <Image
              src={proofView}
              alt="Bukti transfer Anda"
              width={800}
              height={1000}
              className="h-auto w-full object-contain"
              unoptimized
            />
          </a>
        ) : proofView ? (
          /* Data URI: Chrome memblokir navigasi ke data:, jadi cukup gambar
             yang bisa dilihat penuh tanpa bungkus tautan. */
          <div className="overflow-hidden rounded-xl border border-border">
            <Image
              src={proofView}
              alt="Bukti transfer Anda"
              width={800}
              height={1000}
              className="h-auto w-full object-contain"
              unoptimized
            />
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}

function TopupSheet({
  open,
  onOpenChange,
  platformPayment,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformPayment: WalletPayload["platformPayment"]
  onSubmitted: () => Promise<void>
}) {
  const [amount, setAmount] = React.useState("")
  const [proofImage, setProofImage] = React.useState("")
  const [proofError, setProofError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const parsedAmount = Number(amount)
  const proofValid = validateProofImage(proofImage).ok
  const valid =
    Number.isFinite(parsedAmount) && parsedAmount >= MIN_TOPUP_AMOUNT && proofValid

  const submit = async () => {
    setSubmitting(true)
    try {
      const response = await csrfFetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, proofImage: proofImage.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal mengajukan top-up")
      }
      const topupCode: string | undefined = payload?.topupCode
      toast.success("Pengajuan terkirim", {
        description: `Menunggu verifikasi SUPER_ADMIN. Saldo otomatis masuk setelah disetujui${topupCode ? ` (kode ${topupCode})` : ""}.`,
      })
      setAmount("")
      setProofImage("")
      setProofError(null)
      onOpenChange(false)
      await onSubmitted()
    } catch (error) {
      toast.error("Gagal mengajukan top-up", {
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Isi saldo"
      description="Scan QRIS, masukkan nominal persis, lalu unggah bukti. SUPER_ADMIN memverifikasi dalam 1×24 jam."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && !submitting) void submit()
        }}
      >
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            Scan QRIS platform
          </p>
          <div className="grid gap-3 sm:grid-cols-[132px_1fr]">
            <a
              href={platformPayment.qris.imagePath}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring block overflow-hidden rounded-lg border border-border bg-white"
              aria-label="Buka QRIS ukuran penuh"
            >
              <Image
                src={platformPayment.qris.imagePath}
                alt={`QRIS ${platformPayment.qris.merchantName}`}
                width={615}
                height={900}
                sizes="132px"
                className="h-auto w-full object-contain"
              />
            </a>
            <div className="space-y-1 text-sm">
              <p className="font-bold">{platformPayment.qris.merchantName}</p>
              <p className="text-xs text-muted-foreground">
                NMID {platformPayment.qris.nmid} · {platformPayment.qris.terminal}
              </p>
              <p className="text-xs text-muted-foreground">
                {platformPayment.qris.instruction}
              </p>
              {Number.isFinite(parsedAmount) && parsedAmount > 0 && (
                <p className="pt-1 text-xs font-semibold text-warning">
                  Masukkan nominal persis {formatIDR(parsedAmount)} — jangan
                  dibulatkan, agar verifikasi tidak salah cocok.
                </p>
              )}
            </div>
          </div>
          {platformPayment.bank && (
            <div className="border-t border-border pt-3">
              <p className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
                Atau transfer bank
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">
                  {platformPayment.bank.bankName}
                </span>
                <span className="text-sm font-extrabold tabular-nums tracking-wide">
                  {platformPayment.bank.accountNumber}
                </span>
                <button
                  type="button"
                  aria-label="Salin nomor rekening"
                  onClick={() => {
                    const bank = platformPayment.bank
                    if (!bank) return
                    void navigator.clipboard.writeText(bank.accountNumber)
                    toast.success("Nomor rekening disalin")
                  }}
                  className="focus-ring rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                a.n. {platformPayment.bank.accountName}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="topup-amount">Nominal</Label>
          <Input
            id="topup-amount"
            inputMode="numeric"
            placeholder={`Minimal ${MIN_TOPUP_AMOUNT.toLocaleString("id-ID")}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
            required
          />
          <div className="flex flex-wrap gap-1.5">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className="focus-ring rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {formatIDR(preset)}
              </button>
            ))}
          </div>
        </div>

        <ProofImageField
          inputId="topup-proof"
          value={proofImage}
          onChange={setProofImage}
          error={proofError}
          onErrorChange={setProofError}
        />

        <Button type="submit" className="w-full shadow-glow" disabled={!valid || submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Mengirim…
            </>
          ) : (
            <>
              <BadgeCheck className="h-4 w-4" aria-hidden /> Kirim untuk verifikasi
            </>
          )}
        </Button>
      </form>
    </Sheet>
  )
}

/**
 * Pemilih berkas bukti transfer — dropzone + kompresi kanvas + pratinjau.
 * Satu implementasi dipakai TopupSheet (pengajuan baru) dan AttachProofSheet
 * (melengkapi/mengganti bukti lewat PATCH), supaya perilaku kompresi dan
 * pesan errornya tidak pernah saling meleset.
 */
function ProofImageField({
  inputId,
  value,
  onChange,
  error,
  onErrorChange,
}: {
  inputId: string
  value: string
  onChange: (dataUri: string) => void
  error: string | null
  onErrorChange: (message: string | null) => void
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = React.useState(false)

  const handleProofFile = async (file: File | undefined) => {
    if (!file) return
    onErrorChange(null)
    onChange("")
    setCompressing(true)
    try {
      onChange(await compressProofImage(file))
    } catch (cause) {
      onErrorChange(
        cause instanceof Error ? cause.message : "Gambar tidak bisa diproses"
      )
    } finally {
      setCompressing(false)
    }
  }

  const hasProof = value.length > 0

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Bukti transfer</Label>
      {hasProof ? (
        <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-muted">
          <Image
            src={value}
            alt="Pratinjau bukti transfer"
            fill
            sizes="400px"
            className="object-contain"
            unoptimized
          />
          <button
            type="button"
            aria-label="Hapus bukti transfer"
            onClick={() => {
              onChange("")
              onErrorChange(null)
              if (fileInputRef.current) fileInputRef.current.value = ""
            }}
            className="focus-ring absolute right-2 top-2 rounded-lg bg-background/85 px-2 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
          >
            Ganti
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            "focus-ring flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors hover:bg-muted/70",
            error && "border-destructive/60 bg-destructive/5"
          )}
        >
          {compressing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium text-muted-foreground">
                Mengompres gambar…
              </span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
              <span className="text-sm font-semibold">
                Pilih atau jepret foto bukti transfer
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, atau WebP • otomatis dikompres sebelum dikirim
              </span>
            </>
          )}
        </label>
      )}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          void handleProofFile(event.target.files?.[0])
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive-strong">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Gambar dikompres di perangkat Anda, tanpa layanan pihak ketiga.
        </p>
      )}
    </div>
  )
}

/**
 * Melengkapi/mengganti bukti transfer pada pengajuan top-up PENDING lewat
 * PATCH /api/wallet — dibuka dari tombol di riwayat transaksi. Pengajuan yang
 * sudah diputus admin (VERIFIED/REJECTED) tidak lagi memunculkan tombol ini,
 * dan PATCH tetap menolak dengan 409 bila statusnya berubah di ke dua sisi.
 */
function AttachProofSheet({
  topup,
  onOpenChange,
  onSaved,
}: {
  topup: WalletTx | null
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
}) {
  const [proofImage, setProofImage] = React.useState("")
  const [proofError, setProofError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Isi ulang pratinjau setiap kali target berubah — bukti lama (bila ada)
  // dipakai sebagai titik awal agar pengguna bisa melihat yang sedang diganti.
  React.useEffect(() => {
    if (topup) {
      setProofImage(topup.proofImage ?? "")
      setProofError(null)
    }
  }, [topup])

  const valid = topup !== null && validateProofImage(proofImage).ok

  const save = async () => {
    if (!topup) return
    setSaving(true)
    try {
      const response = await csrfFetch("/api/wallet", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: topup.id,
          proofImage: proofImage.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal menyimpan bukti transfer")
      }
      toast.success("Bukti transfer tersimpan", {
        description: "SUPER_ADMIN akan memverifikasi pengajuan Anda.",
      })
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      toast.error("Gagal menyimpan bukti transfer", {
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={topup !== null}
      onOpenChange={onOpenChange}
      title="Bukti transfer"
      description={
        topup
          ? `Pengajuan ${formatIDR(topup.amount)}${topup.topupCode ? ` • ${topup.topupCode}` : ""}`
          : undefined
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && !saving) void save()
        }}
      >
        <ProofImageField
          inputId="attach-proof"
          value={proofImage}
          onChange={setProofImage}
          error={proofError}
          onErrorChange={setProofError}
        />
        <Button
          type="submit"
          className="w-full shadow-glow"
          disabled={!valid || saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Menyimpan…
            </>
          ) : (
            <>
              <BadgeCheck className="h-4 w-4" aria-hidden /> Simpan bukti
            </>
          )}
        </Button>
      </form>
    </Sheet>
  )
}

function WithdrawSheet({
  open,
  onOpenChange,
  balance,
  bank,
  onSubmitted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  balance: number
  bank: WalletPayload["bank"]
  onSubmitted: () => Promise<void>
}) {
  const [amount, setAmount] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const parsedAmount = Number(amount)
  const bankComplete = Boolean(
    bank.bankName && bank.bankAccountNumber && bank.bankAccountName
  )
  const valid =
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 50_000 &&
    parsedAmount <= Math.floor(balance) &&
    bankComplete

  const submit = async () => {
    setSubmitting(true)
    try {
      const response = await csrfFetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal mengajukan penarikan")
      }
      toast.success("Penarikan diajukan", {
        description: "SUPER_ADMIN akan mentransfer ke rekening Anda dan saldo dibekukan.",
      })
      setAmount("")
      onOpenChange(false)
      await onSubmitted()
    } catch (error) {
      toast.error("Gagal mengajukan penarikan", {
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Tarik saldo"
      description="Dana dibekukan sejak pengajuan dan ditransfer admin ke rekening terdaftar."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && !submitting) void submit()
        }}
      >
        {!bankComplete && (
          <p className="rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
            Rekening penarikan belum lengkap — buka “Rekening saya” dulu.
          </p>
        )}
        {bankComplete && (
          <p className="rounded-xl bg-muted/60 px-3.5 py-3 text-sm text-muted-foreground">
            {bank.bankName} • {bank.bankAccountNumber} • {bank.bankAccountName}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">
            Nominal (saldo Anda {formatIDR(balance)})
          </Label>
          <Input
            id="withdraw-amount"
            inputMode="numeric"
            placeholder="Minimal 50.000"
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <Button type="submit" className="w-full shadow-glow" disabled={!valid || submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Mengirim…
            </>
          ) : (
            <>
              <Banknote className="h-4 w-4" aria-hidden /> Ajukan penarikan
            </>
          )}
        </Button>
      </form>
    </Sheet>
  )
}

function BankSheet({
  open,
  onOpenChange,
  bank,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank: WalletPayload["bank"]
  onSaved: () => Promise<void>
}) {
  const [values, setValues] = React.useState({
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
  })
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setValues({
        bankName: bank.bankName ?? "",
        bankAccountNumber: bank.bankAccountNumber ?? "",
        bankAccountName: bank.bankAccountName ?? "",
      })
    }
  }, [open, bank])

  const valid =
    values.bankName.trim().length >= 2 &&
    /^\d{6,30}$/.test(values.bankAccountNumber.trim()) &&
    values.bankAccountName.trim().length >= 2

  const save = async () => {
    setSaving(true)
    try {
      const response = await csrfFetch("/api/wallet/bank", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName: values.bankName.trim(),
          bankAccountNumber: values.bankAccountNumber.trim(),
          bankAccountName: values.bankAccountName.trim(),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal menyimpan rekening")
      }
      toast.success("Rekening tersimpan")
      onOpenChange(false)
      await onSaved()
    } catch (error) {
      toast.error("Gagal menyimpan rekening", {
        description: error instanceof Error ? error.message : "Coba lagi nanti.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Rekening penarikan"
      description="Hanya dipakai untuk transfer penarikan saldo Anda."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (valid && !saving) void save()
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="bank-name">Nama bank</Label>
          <Input
            id="bank-name"
            placeholder="BCA / Mandiri / BRI"
            value={values.bankName}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, bankName: event.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank-number">Nomor rekening</Label>
          <Input
            id="bank-number"
            inputMode="numeric"
            placeholder="Hanya angka"
            value={values.bankAccountNumber}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                bankAccountNumber: event.target.value.replace(/\D/g, ""),
              }))
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank-holder">Nama pemilik rekening</Label>
          <Input
            id="bank-holder"
            placeholder="Sesuai buku tabungan"
            value={values.bankAccountName}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, bankAccountName: event.target.value }))
            }
            required
          />
        </div>
        <Button type="submit" className="w-full shadow-glow" disabled={!valid || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Menyimpan…
            </>
          ) : (
            "Simpan rekening"
          )}
        </Button>
      </form>
    </Sheet>
  )
}
