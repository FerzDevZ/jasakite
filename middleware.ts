import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { isCsrfValid, generateCsrfToken } from "@/lib/csrf"
import { isAdminRole } from "@/lib/roles"
import { isNonDocumentRequest, serviceSlugFromPath } from "@/lib/service-route-guard"

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

/**
 * Gerbang 404 rute detail jasa.
 *
 * Status HTTP ditentukan saat byte pertama dikirim. Di App Router, root layout
 * membaca sesi (`auth()`) sehingga setiap rute dirender dinamis dan di-stream:
 * shell sudah terkirim sebelum `notFound()` di komponen halaman dievaluasi,
 * jadi hasilnya 200 berisi UI not-found (soft 404). `notFound()` di
 * `generateMetadata`, menghapus `loading.tsx`, dan `force-static` semuanya sudah
 * diukur dan TIDAK mengubah status — middleware satu-satunya titik sebelum
 * render yang masih bisa memutuskan.
 *
 * Rewrite ke path yang tidak cocok dengan rute mana pun membuat Next sendiri
 * yang menjawab 404 (lengkap dengan app/not-found.tsx). Path itu sengaja tidak
 * pernah dibuat sebagai rute sungguhan.
 */
const SERVICE_GONE_PATH = "/_tidak-ditemukan"

type ServiceGateState = "active" | "inactive" | "missing"

// Cache per-isolate, dan HANYA untuk keadaan `active`.
//
// `missing` dan `inactive` tidak boleh di-cache sama sekali (TTL 0): jasa yang
// baru dibuat atau baru diaktifkan dari halaman moderasi harus langsung bisa
// dibuka. Terukur di E2E — cache 10 detik untuk `inactive` membuat admin yang
// mengaktifkan jasa lalu membukanya sebagai publik menerima 404 selama sisa
// jendela itu.
//
// Sebaliknya `active` yang basi semenit hanya berarti jasa yang baru diarsipkan
// masih menampilkan halaman not-found (bukan 404) selama paling lama satu
// menit — jauh lebih ringan akibatnya.
const SERVICE_STATE_TTL_MS: Record<ServiceGateState, number> = {
  active: 60_000,
  inactive: 0,
  missing: 0,
}

const MAX_CACHED_SLUGS = 2_000
const serviceStateCache = new Map<string, { state: ServiceGateState; expiresAt: number }>()

async function resolveServiceState(
  request: NextRequest,
  slug: string
): Promise<ServiceGateState | "unknown"> {
  const cached = serviceStateCache.get(slug)
  if (cached && cached.expiresAt > Date.now()) return cached.state

  const endpoint = new URL("/api/services/resolve", request.url)
  endpoint.searchParams.set("slug", slug)

  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    })

    // Gangguan database atau route yang belum siap tidak boleh mengubah halaman
    // sehat menjadi 404. Gagal = lewatkan gerbang (fail open).
    if (!response.ok) return "unknown"

    const payload = (await response.json()) as { state?: ServiceGateState }
    const state = payload.state
    if (state !== "active" && state !== "inactive" && state !== "missing") {
      return "unknown"
    }

    const ttl = SERVICE_STATE_TTL_MS[state]
    if (ttl > 0) {
      if (serviceStateCache.size >= MAX_CACHED_SLUGS) serviceStateCache.clear()
      serviceStateCache.set(slug, { state, expiresAt: Date.now() + ttl })
    } else {
      serviceStateCache.delete(slug)
    }

    return state
  } catch (error) {
    console.warn(
      `[middleware] gerbang jasa tidak dapat memeriksa \"${slug}\": ${(error as Error).message}`
    )
    return "unknown"
  }
}

async function serviceDetailGate(request: NextRequest): Promise<NextResponse | null> {
  // Resolusi hanya untuk permintaan dokumen. Navigasi RSC dan prefetch tidak
  // menentukan status halaman yang dilihat crawler, jadi tidak perlu kueri.
  if (request.method !== "GET" && request.method !== "HEAD") return null
  if (isNonDocumentRequest(request.headers, request.nextUrl.searchParams)) return null

  const slug = serviceSlugFromPath(request.nextUrl.pathname)
  if (!slug) return null

  const state = await resolveServiceState(request, slug)
  if (state === "active" || state === "unknown") return null

  if (state === "inactive") {
    // ADMIN dan SUPER_ADMIN melihat DRAFT dari halaman moderasi (?preview=1).
    // Aturan ini sama dengan yang ada di page.tsx — satu perilaku, dua tempat
    // penegakan, karena middleware tidak bisa memakai `auth()`.
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie: request.url.startsWith("https://"),
    })
    if (isAdminRole(token?.role as string | undefined)) return null
  }

  return NextResponse.rewrite(new URL(SERVICE_GONE_PATH, request.url))
}

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

  const serviceGate = await serviceDetailGate(request)
  if (serviceGate) return serviceGate

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
