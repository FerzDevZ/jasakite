"use client"

import * as React from "react"
import Image from "next/image"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

type TotpStatus = {
  enabled: boolean
  pending: boolean
  enabledAt: string | null
}

type Enrollment = {
  otpauthUri: string
  base32Secret: string
  qrDataUrl: string
}

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null)
  return payload?.error ?? fallback
}

export function AdminTotpSetup() {
  const queryClient = useQueryClient()
  const [password, setPassword] = React.useState("")
  const [confirmCode, setConfirmCode] = React.useState("")
  const [enrollment, setEnrollment] = React.useState<Enrollment | null>(null)
  const [rotating, setRotating] = React.useState(false)
  const [secretCopied, setSecretCopied] = React.useState(false)

  const { data: status, isLoading } = useQuery<TotpStatus>({
    queryKey: ["admin-totp-status"],
    queryFn: async () => {
      const response = await fetch("/api/admin/totp", { cache: "no-store" })
      if (!response.ok) {
        throw new Error(await readError(response, "Gagal memuat status 2FA"))
      }
      return response.json()
    },
  })

  const startEnrollment = useMutation({
    mutationFn: async (currentPassword: string) => {
      const response = await csrfFetch("/api/admin/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: currentPassword }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, "Gagal memulai pendaftaran 2FA"))
      }
      return (await response.json()) as Enrollment
    },
    onSuccess: (payload) => {
      setEnrollment(payload)
      setPassword("")
      setConfirmCode("")
      setSecretCopied(false)
      toast.success("Secret baru dibuat", {
        description: "Pindai QR, lalu masukkan satu kode untuk mengaktifkan.",
      })
    },
    onError: (error: Error) => {
      toast.error("Pendaftaran gagal", { description: error.message })
    },
  })

  const confirmEnrollment = useMutation({
    mutationFn: async (code: string) => {
      const response = await csrfFetch("/api/admin/totp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      if (!response.ok) {
        throw new Error(await readError(response, "Kode tidak dapat diverifikasi"))
      }
      return response.json()
    },
    onSuccess: async () => {
      setEnrollment(null)
      setConfirmCode("")
      setRotating(false)
      await queryClient.invalidateQueries({ queryKey: ["admin-totp-status"] })
      await queryClient.invalidateQueries({ queryKey: ["admin-wallet"] })
      toast.success("2FA aktif", {
        description: "Keputusan uang sekarang meminta kode dari authenticator.",
      })
    },
    onError: (error: Error) => {
      toast.error("Aktivasi gagal", { description: error.message })
    },
  })

  const copySecret = async () => {
    if (!enrollment) return
    try {
      await navigator.clipboard.writeText(enrollment.base32Secret)
      setSecretCopied(true)
      toast.success("Secret disalin")
    } catch {
      toast.error("Tidak bisa menyalin otomatis", {
        description: "Salin secret secara manual dari kotak di atas.",
      })
    }
  }

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />
  }

  const isEnabled = Boolean(status?.enabled)
  const needsSetup = !isEnabled && !enrollment
  const showPasswordForm = (!isEnabled || rotating) && !enrollment

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary-strong" aria-hidden />
              Autentikasi dua faktor
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Kode 6 digit diminta setiap kali menyetujui top-up, penarikan, atau
              pembayaran pesanan — bukan hanya saat masuk.
            </p>
          </div>
          <span
            className={
              isEnabled
                ? "inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success"
                : "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold text-warning"
            }
          >
            {isEnabled ? (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            )}
            {isEnabled ? "Aktif" : "Belum aktif"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isEnabled && status?.enabledAt ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm">
            Terakhir diaktifkan{" "}
            <strong>{new Date(status.enabledAt).toLocaleString("id-ID")}</strong>.
            Simpan aplikasi authenticator di perangkat yang selalu Anda bawa.
          </p>
        ) : null}

        {needsSetup ? (
          <p className="flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Selama 2FA belum aktif, server menolak setiap keputusan uang dari akun
            ini. Antrean verifikasi tetap bisa dilihat, tetapi tombol keputusan
            tidak akan berhasil.
          </p>
        ) : null}

        {enrollment ? (
          <div className="grid gap-6 md:grid-cols-[240px_1fr]">
            <div className="space-y-2">
              <Image
                src={enrollment.qrDataUrl}
                alt="Kode QR pendaftaran authenticator"
                width={240}
                height={240}
                unoptimized
                className="rounded-xl border border-border bg-white p-2"
              />
              <p className="text-xs text-muted-foreground">
                Pindai dengan Google Authenticator, Authy, atau 1Password.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp-secret">Tidak bisa memindai? Masukkan manual</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="totp-secret"
                    readOnly
                    value={enrollment.base32Secret}
                    className="font-mono text-xs tracking-wider"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                    aria-label="Salin secret 2FA"
                  >
                    {secretCopied ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </div>

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  const normalized = confirmCode.replace(/\s/g, "")
                  if (normalized.length !== 6) return
                  confirmEnrollment.mutate(normalized)
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="totp-confirm">Kode dari aplikasi</Label>
                  <Input
                    id="totp-confirm"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9 ]{6,7}"
                    maxLength={7}
                    placeholder="123456"
                    value={confirmCode}
                    onChange={(event) => setConfirmCode(event.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Kode hanya bisa dipakai sekali. Jika sudah terpakai untuk
                    masuk, tunggu kode berikutnya (30 detik).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    disabled={
                      confirmEnrollment.isPending ||
                      confirmCode.replace(/\s/g, "").length !== 6
                    }
                  >
                    {confirmEnrollment.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                    )}
                    Aktifkan 2FA
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={confirmEnrollment.isPending}
                    onClick={() => {
                      setEnrollment(null)
                      setConfirmCode("")
                      setRotating(false)
                    }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : showPasswordForm ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!password) return
              startEnrollment.mutate(password)
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="totp-password">Konfirmasi password Anda</Label>
              <Input
                id="totp-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Wajib password agar sesi yang dibajak tidak bisa mendaftarkan
                authenticator milik penyerang ke akun ini.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={startEnrollment.isPending}>
                {startEnrollment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden />
                )}
                {rotating ? "Ganti perangkat" : "Mulai pengaturan"}
              </Button>
              {rotating ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={startEnrollment.isPending}
                  onClick={() => {
                    setRotating(false)
                    setPassword("")
                  }}
                >
                  Batal
                </Button>
              ) : null}
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => setRotating(true)}
          >
            <KeyRound className="h-4 w-4" aria-hidden />
            Ganti perangkat authenticator
          </Button>
        )}

        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Kehilangan perangkat? Pemulihan dilakukan operator lewat CLI di server
          (<code className="rounded bg-muted px-1 py-0.5">npm run admin:reset-totp</code>),
          bukan lewat halaman ini — agar tidak ada tombol yang bisa melewati 2FA.
        </p>
      </CardContent>
    </Card>
  )
}
