"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AuthFormSkeleton } from "@/components/layout/auth-form-skeleton"

function getSafeCallbackUrl(raw: string | null): string {
  const fallback = "/dashboard"
  if (!raw) return fallback
  // block protocol-relative URLs
  if (raw.startsWith("//")) return fallback
  // absolute URL: only allow same-origin (mitigasi open-redirect)
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("http")) {
    try {
      if (typeof window !== "undefined") {
        const url = new URL(raw, window.location.origin)
        if (url.origin !== window.location.origin) return fallback
        return url.pathname + url.search + url.hash || fallback
      }
      // SSR: tolak semua absolute URL karena tidak bisa verifikasi origin
      return fallback
    } catch {
      return fallback
    }
  }
  // relative URL must start with /
  if (!raw.startsWith("/")) return fallback
  return raw
}

type SignInOutcome = {
  error?: string
  code?: string
  url?: string | null
}

/** Pesan untuk kode error 2FA yang dikirim server lewat `?code=`. */
const TOTP_ERROR_MESSAGES: Record<string, string> = {
  totp_invalid: "Kode 2FA salah atau sudah kedaluwarsa. Coba kode terbaru.",
  totp_unavailable: "2FA sedang tidak dapat diverifikasi. Hubungi operator.",
}

function LoginForm() {
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams?.get("callbackUrl") ?? "/dashboard"
  const callbackUrl = getSafeCallbackUrl(rawCallbackUrl)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  // Langkah kedua hanya muncul setelah server memastikan password benar, jadi
  // keberadaan akun ber-2FA tidak bocor ke orang yang belum punya password.
  const [step, setStep] = useState<"credentials" | "totp">("credentials")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const navigateToDestination = (outcome: SignInOutcome) => {
    // NextAuth dengan redirect:false butuh hard navigation agar middleware baca cookie baru.
    // result.url = "https://host/dashboard" atau null; fallback ke callbackUrl yang sudah safe.
    // Raw result.url tetap divalidasi via getSafeCallbackUrl untuk cegah open-redirect.
    // `result.url` dibuat dari AUTH_URL, jadi ia bisa absolut dan ber-origin
    // berbeda dari yang sedang dipakai (mis. AUTH_URL masih localhost padahal
    // situs diakses lewat domain lain). getSafeCallbackUrl menolaknya dan
    // mengembalikan "/dashboard" — tujuan asli pengguna hilang secara diam-diam.
    // `callbackUrl` sendiri sudah relatif dan sudah divalidasi, jadi ia lebih
    // tepercaya sebagai cadangan daripada membuang tujuannya.
    const serverPath = outcome.url ? getSafeCallbackUrl(outcome.url) : null
    const destination = serverPath && serverPath !== "/dashboard" ? serverPath : callbackUrl
    // href dan assign sama-sama hard navigation; href dipilih karena tidak terhalang
    // oleh beberapa content-security / popup blocker dan konsisten dengan signIn redirect:true.
    window.location.href = destination
    // jangan setLoading(false) — biarkan spinner sampai browser unload, cegah double-submit
  }

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const outcome = (await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })) as SignInOutcome | undefined

      // signIn dengan redirect:false bisa return undefined bila getProviders() gagal
      // (client langsung window.location.href ke /api/auth/error). Anggap error.
      if (!outcome) {
        setError("Gagal masuk. Periksa koneksi dan coba lagi.")
        setLoading(false)
        return
      }

      if (outcome.code === "totp_required") {
        setStep("totp")
        setTotpCode("")
        setLoading(false)
        return
      }

      if (outcome.error) {
        setError(
          (outcome.code && TOTP_ERROR_MESSAGES[outcome.code]) ??
            "Email atau password salah."
        )
        setLoading(false)
        return
      }

      navigateToDestination(outcome)
    } catch (err) {
      console.error("[login] signIn failed", err)
      setError("Gagal masuk. Periksa koneksi dan coba lagi.")
      setLoading(false)
    }
  }

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const outcome = (await signIn("credentials", {
        email,
        password,
        totp: totpCode.replace(/\s/g, ""),
        redirect: false,
        callbackUrl,
      })) as SignInOutcome | undefined

      if (!outcome) {
        setError("Gagal masuk. Periksa koneksi dan coba lagi.")
        setLoading(false)
        return
      }

      if (outcome.error) {
        setError(
          (outcome.code && TOTP_ERROR_MESSAGES[outcome.code]) ??
            "Kode 2FA tidak diterima. Coba lagi."
        )
        setLoading(false)
        return
      }

      navigateToDestination(outcome)
    } catch (err) {
      console.error("[login] verifikasi 2FA gagal", err)
      setError("Gagal masuk. Periksa koneksi dan coba lagi.")
      setLoading(false)
    }
  }

  const backToCredentials = () => {
    setStep("credentials")
    setTotpCode("")
    setError("")
  }

  const isTotpStep = step === "totp"

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-2xl">
          {isTotpStep ? "Verifikasi 2FA" : "Masuk ke JASAKITE"}
        </CardTitle>
        <CardDescription>
          {isTotpStep
            ? `Masukkan kode 6 digit dari aplikasi authenticator untuk ${email}.`
            : "Masuk untuk memesan jasa atau mengelola jasa Anda"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isTotpStep ? (
          <form onSubmit={handleTotpSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="totp">Kode 2FA</Label>
              <Input
                id="totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Kode berlaku 30 detik. Akun SUPER_ADMIN wajib menyelesaikan
                langkah ini untuk mengakses keputusan uang.
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                    aria-hidden
                  />
                  Memverifikasi...
                </span>
              ) : (
                "Verifikasi dan masuk"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={backToCredentials}
              disabled={loading}
            >
              Kembali
            </Button>
          </form>
        ) : (
          <>
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden
                    />
                    Memproses...
                  </span>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="font-medium text-primary-strong hover:underline"
              >
                Daftar di sini
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton fields={2} />}>
      <LoginForm />
    </Suspense>
  )
}
