import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { isCsrfValid, generateCsrfToken } from "@/lib/csrf"
import { isAdminRole } from "@/lib/roles"

// Halaman yang boleh diakses tanpa login
const PUBLIC_PATHS = [
  "/",
  "/services",
  "/service",
  "/provider",
  "/login",
  "/register",
  "/faq",
  "/api/auth",
  "/api/services",
  "/api/categories",
  "/sitemap.xml",
  "/robots.txt",
  "/icon",
  "/opengraph-image",
]

const KNOWN_PREFIXES = [
  "/",
  "/services",
  "/service",
  "/provider",
  "/keranjang",
  "/checkout",
  "/orders",
  "/notifications",
  "/messages",
  "/dashboard",
  "/login",
  "/register",
  "/faq",
  "/api",
  "/sitemap",
  "/robots",
  "/icon",
  "/opengraph-image",
]

function isKnownPath(pathname: string): boolean {
  return KNOWN_PREFIXES.some((p) => {
    if (p === "/") return pathname === "/"
    // exact atau prefix dengan "/" atau "." (untuk /sitemap.xml, /robots.txt)
    return (
      pathname === p ||
      pathname.startsWith(`${p}/`) ||
      pathname.startsWith(`${p}.`)
    )
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // CSRF check untuk /api/* state-changing, whitelist NextAuth yang punya CSRF sendiri
  if (pathname.startsWith("/api/")) {
    const isAuthWhitelist = pathname.startsWith("/api/auth")
    if (!isAuthWhitelist) {
      const method = request.method.toUpperCase()
      const isStateChanging =
        method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE"
      if (isStateChanging && isKnownPath(pathname) && !isCsrfValid(request)) {
        return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
      }
    }
    const res = NextResponse.next()
    // Set csrf-token cookie jika belum ada — dibaca oleh csrfFetch di client
    if (!request.cookies.has("csrf-token")) {
      res.cookies.set("csrf-token", generateCsrfToken(), {
        httpOnly: false,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 hari
      })
    }
    return res
  }

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  )

  // Hijack 404 fix: unknown routes jangan redirect ke /login, biarkan Next render 404
  if (!isKnownPath(pathname) && !isPublic) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.url.startsWith("https://"),
  })

  // Belum login, arahkan ke halaman masuk
  if (!isPublic && !token) {
    const url = new URL("/login", request.url)
    url.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(url)
  }

  if (token) {
    const role = token.role as string | undefined

    // /dashboard/provider hanya untuk PROVIDER / ADMIN
    if (
      pathname.startsWith("/dashboard/provider") &&
      role !== "PROVIDER" &&
      !isAdminRole(role)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // /dashboard/admin untuk ADMIN dan SUPER_ADMIN. Keputusan uang tetap
    // diperiksa ulang per route (hanya SUPER_ADMIN).
    if (
      pathname.startsWith("/dashboard/admin") &&
      !isAdminRole(role)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    // Pengguna yang sudah login tidak perlu ke halaman auth
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
