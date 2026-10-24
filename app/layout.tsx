import type { Metadata } from "next"
import Link from "next/link"
import { Plus_Jakarta_Sans, Instrument_Serif } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/layout/Navbar"
import { OfflineIndicator } from "@/components/layout/offline-indicator"
import { ScrollToTop } from "@/components/layout/scroll-to-top"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PwaInstallBanner } from "@/components/layout/pwa-install-banner"
import { DeferredToaster } from "@/components/layout/deferred-toaster"
import { WalletDecisionListener } from "@/components/layout/wallet-decision-listener"
import { Mail, HelpCircle } from "lucide-react"
import { SITE_URL } from "@/lib/site-url"

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})

const serif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
})

// SITE_URL berasal dari lib/site-url.ts — satu sumber untuk metadata,
// sitemap, dan robots.txt.

/**
 * Service worker hanya didaftarkan di produksi — dan di dev justru dibersihkan.
 *
 * Alasannya konkret: `sw.js` mem-pre-cache dokumen HTML ("…", "/services", …).
 * Di mode dev nama berkas `/_next/...` berubah setiap kali server dikompilasi,
 * jadi service worker dari kunjungan sebelumnya melayani shell LAMA yang
 * menunjuk aset yang sudah tidak ada — satu halaman penuh "Failed to load
 * resource: 404 (Not Found)" untuk semua CSS/JS, padahal servernya sehat.
 * Di dev, service worker tidak memberi manfaat apa pun (hot reload selalu
 * online) dan hanya menyimpan jebakan seperti itu.
 */
const isProduction = process.env.NODE_ENV === "production"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "JASAKITE — Marketplace Jasa Lokal",
    template: "%s | JASAKITE",
  },
  description:
    "Temukan penyedia jasa terpercaya di sekitar Anda: jasa antar, jasa belanja, jasa pembayaran, dan jasa titip.",
  applicationName: "JASAKITE",
  keywords: [
    "jasa lokal",
    "marketplace jasa",
    "jasa antar barang",
    "jasa belanja",
    "jasa pembayaran",
    "jasa titip",
    "penyedia jasa Bangka Belitung",
  ],
  authors: [{ name: "JASAKITE" }],
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "JASAKITE",
    title: "JASAKITE — Marketplace Jasa Lokal",
    description:
      "Temukan penyedia jasa terpercaya di sekitar Anda: jasa antar, jasa belanja, jasa pembayaran, dan jasa titip.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "JASAKITE — Marketplace Jasa Lokal",
    description:
      "Temukan penyedia jasa terpercaya di sekitar Anda: jasa antar, jasa belanja, jasa pembayaran, dan jasa titip.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
}

/**
 * Tautan footer. Hanya anchor yang benar-benar ada di /faq (lihat FAQ_SECTIONS)
 * — sebelumnya kolom "Tentang" menunjuk ke #syarat dan #privasi yang tidak
 * pernah dirender, jadi kliknya tidak melakukan apa pun.
 */
const FOOTER_LINKS = [
  {
    title: "Jelajahi",
    links: [
      { href: "/services", label: "Semua Jasa" },
      { href: "/services?sort=rating", label: "Rating Terbaik" },
      { href: "/dashboard/provider/buka-jasa", label: "Buka Jasa" },
      { href: "/dashboard", label: "Dashboard" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { href: "/faq", label: "FAQ" },
      { href: "/faq#cara-pesan", label: "Cara Pesan" },
      { href: "/faq#pembayaran", label: "Pembayaran" },
      { href: "/faq#kebijakan", label: "Kebijakan" },
    ],
  },
  {
    title: "Tentang",
    links: [
      { href: "/faq#tentang", label: "Tentang Kami" },
      { href: "/faq#penyedia", label: "Untuk Penyedia Jasa" },
    ],
  },
] as const

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "JASAKITE",
      url: SITE_URL,
      description:
        "Marketplace jasa lokal yang menghubungkan pelanggan dengan penyedia jasa profesional di Indonesia.",
      areaServed: { "@type": "Country", name: "Indonesia" },
      email: "halo@jasakite.id",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "JASAKITE",
      inLanguage: "id-ID",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/services?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Default LIGHT: produk ini sekarang tampil sebagai aplikasi marketplace
    // yang padat, dan permukaan terang adalah yang paling terbaca untuk itu.
    // `suppressHydrationWarning` diperlukan karena skrip di bawah mengubah
    // kelas <html> sebelum React hidrasi (pola anti-FOUC yang sama seperti
    // sebelumnya, hanya nilai defaultnya berubah).
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("jasakite-theme")||"light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){document.documentElement.classList.remove("dark")}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F97316" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                if (${isProduction}) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').then(
                      (registration) => {
                        console.log('SW registered: ', registration)
                      },
                      (error) => {
                        console.log('SW registration failed: ', error)
                      }
                    )
                  })
                } else {
                  // Dev: cabut service worker & cache lama sekali di awal, supaya
                  // tab berikutnya tidak lagi dilayani shell dari build lama.
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    registrations.forEach((registration) => registration.unregister())
                  })
                  if ('caches' in window) {
                    caches.keys().then((keys) => {
                      keys.forEach((key) => caches.delete(key))
                    })
                  }
                }
              }
            `,
          }}
        />
      </head>
      <body className={`${sans.variable} ${serif.variable} font-sans`}>
        <ThemeProvider>
          <Providers>
            <a
              href="#konten-utama"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Lewati ke konten utama
            </a>
            <Navbar />
            <main id="konten-utama" className="min-h-[calc(100vh-4rem)]">
              {children}
            </main>
            {/* padding bawah di mobile: konten footer tidak boleh
                tertutup BottomNav yang fixed (h-14 + safe-area). */}
            <footer className="border-t border-border bg-card pb-20 lg:pb-0">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
                  <div className="col-span-2 lg:col-span-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-black text-primary-foreground">
                        {/* Monogram merek: J dari JASAKITE. */}
                        J
                      </span>
                      <span className="text-lg font-bold tracking-tight">
                        {/* Wordmark dipecah dua span untuk pewarnaan. Pola ini
                            pernah lolos dari sapuan rebranding karena tidak ada
                            sebagai string utuh di source — penjaganya ada di
                            tests/branding.test.ts (lihat "wordmark terbelah"). */}
                        JASA<span className="text-primary-strong">KITE</span>
                      </span>
                    </div>
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                      Marketplace jasa lokal terpercaya. Temukan penyedia jasa
                      profesional di sekitar Anda — dari antar barang, belanja
                      harian, sampai bayar tagihan.
                    </p>
                    <div className="mt-5 flex gap-3">
                      <a
                        href="mailto:halo@jasakite.id"
                        className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
                        aria-label="Kirim email ke JASAKITE"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </a>
                      <Link
                        href="/faq"
                        className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
                        aria-label="Pusat bantuan dan FAQ"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>

                  {/* Kolom tautan digenerate dari satu sumber (FOOTER_LINKS)
                      supaya tidak ada lagi <li> yang disalin manual — itu yang
                      dulu menyebabkan anchor mati seperti /faq#syarat. */}
                  {FOOTER_LINKS.map((column) => (
                    <div key={column.title}>
                      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {column.title}
                      </h2>
                      <ul className="space-y-2.5 text-sm">
                        {column.links.map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="focus-ring rounded text-muted-foreground transition-colors hover:text-primary-strong"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
                  <p>
                    © {new Date().getFullYear()} JASAKITE — Temukan jasa
                    terbaik di sekitar Anda.
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Dibangun untuk penyedia jasa di Indonesia
                  </p>
                </div>
              </div>
            </footer>
            <DeferredToaster />
            <WalletDecisionListener />
            <OfflineIndicator />
            <ScrollToTop />
            <BottomNav />
            <PwaInstallBanner />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
