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

function LoginForm() {
  const searchParams = useSearchParams()
  const rawCallbackUrl = searchParams?.get("callbackUrl") ?? "/dashboard"
  const callbackUrl = getSafeCallbackUrl(rawCallbackUrl)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      // signIn dengan redirect:false bisa return undefined bila getProviders() gagal
      // (client langsung window.location.href ke /api/auth/error). Anggap error.
      if (!result || result.error) {
        setError("Email atau password salah.")
        setLoading(false)
        return
      }

      // NextAuth dengan redirect:false butuh hard navigation agar middleware baca cookie baru.
      // result.url = "https://host/dashboard" atau null; fallback ke callbackUrl yang sudah safe.
      // Raw result.url tetap divalidasi via getSafeCallbackUrl untuk cegah open-redirect.
      // `result.url` dibuat dari AUTH_URL, jadi ia bisa absolut dan ber-origin
      // berbeda dari yang sedang dipakai (mis. AUTH_URL masih localhost padahal
      // situs diakses lewat domain lain). getSafeCallbackUrl menolaknya dan
      // mengembalikan "/dashboard" — tujuan asli pengguna hilang secara diam-diam.
      // `callbackUrl` sendiri sudah relatif dan sudah divalidasi, jadi ia lebih
      // tepercaya sebagai cadangan daripada membuang tujuannya.
      const serverPath = result.url ? getSafeCallbackUrl(result.url) : null
      const dest = serverPath && serverPath !== "/dashboard" ? serverPath : callbackUrl
      // href dan assign sama-sama hard navigation; href dipilih karena tidak terhalang
      // oleh beberapa content-security / popup blocker dan konsisten dengan signIn redirect:true.
      window.location.href = dest
      // jangan setLoading(false) — biarkan spinner sampai browser unload, cegah double-submit
    } catch (err) {
      console.error("[login] signIn failed", err)
      setError("Gagal masuk. Periksa koneksi dan coba lagi.")
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-2xl">
          Masuk ke JASAKITE
        </CardTitle>
        <CardDescription>
          Masuk untuk memesan jasa atau mengelola jasa Anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" className="w-full" disabled={loading} aria-busy={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
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
