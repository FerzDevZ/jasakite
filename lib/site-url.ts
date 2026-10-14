/**
 * URL kanonik situs — satu sumber kebenaran untuk metadata, Open Graph,
 * JSON-LD, sitemap, dan robots.txt.
 *
 * Sebelumnya `process.env.NEXTAUTH_URL ?? "http://localhost:3000"` disalin di
 * tiga tempat (app/layout.tsx, app/sitemap.ts, app/robots.ts). Selain rawan
 * berbeda satu sama lain, ketiganya hanya membaca NEXTAUTH_URL — variabel yang
 * ada untuk callback OAuth, bukan untuk identitas publik situs.
 *
 * Urutan prioritas:
 * 1. NEXT_PUBLIC_SITE_URL — disetel eksplisit oleh operator.
 * 2. VERCEL_PROJECT_PRODUCTION_URL — domain produksi Vercel yang stabil.
 *    VERCEL_URL sengaja TIDAK dipakai: nilainya berubah tiap deployment
 *    preview, jadi URL kanonik dan tag OG akan ikut berubah-ubah.
 * 3. NEXTAUTH_URL — cadangan untuk setup lama.
 * 4. http://localhost:3000 — hanya pengembangan.
 */
function resolve(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProduction) return `https://${vercelProduction}`

  const authUrl = process.env.NEXTAUTH_URL?.trim()
  if (authUrl) return authUrl.replace(/\/$/, "")

  if (process.env.NODE_ENV === "production") {
    // Akibatnya tidak terlihat di UI: preview share dan JSON-LD menunjuk
    // localhost dan crawler tidak bisa mengambil apa pun. Karena itu diteriakkan
    // ke log, bukan didiamkan.
    console.warn(
      "[site-url] NEXT_PUBLIC_SITE_URL belum diset — metadata kanonik, Open Graph, JSON-LD, sitemap, dan robots.txt akan menunjuk http://localhost:3000."
    )
  }

  return "http://localhost:3000"
}

export const SITE_URL = resolve()

/** Gabungkan path dengan SITE_URL tanpa risiko garis miring ganda. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
