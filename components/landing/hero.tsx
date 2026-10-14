"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Search, ShieldCheck, Star, ArrowRight } from "lucide-react";
import { prefersReducedMotion } from "@/lib/motion";
import { Counter } from "@/components/landing/counter";
import { HeroSearch } from "@/components/landing/hero-search";

const HeroOrb = dynamic(() => import("@/components/three/hero-orb"), {
  ssr: false,
});

/** Inisial dari nama penyedia: "Budi Santoso" -> "BS". */
function initials(name: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Hero({
  categories,
  providers = [],
  providerCount = 0,
  completedOrders = 0,
  ratingAvg = 0,
  cityCount = 0,
}: {
  categories: { slug: string; name: string; id: string | number }[];
  providers?: { name: string | null; location: string | null; avatarUrl: string | null }[];
  providerCount?: number;
  completedOrders?: number;
  ratingAvg?: number;
  cityCount?: number;
}) {
  const root = React.useRef<HTMLElement>(null);

  // Orb three.js dimuat HANYA di layar lebar dan setelah halaman idle.
  // Di mobile 320px: modul ~600KB itu (three + R3F) adalah long task terbesar
  // pada jendela kritis LCP/TBT, dan visualnya sendiri berada di bawah lipatan
  // — cincin CSS + kartu melayang tetap memberi bentuk area kanan tanpa WebGL.
  // requestIdleCallback menunda evaluasi sampai main thread lega; timeout
  // 2,5s menjamin orb tetap muncul walau pengguna langsung aktif.
  const [orbReady, setOrbReady] = React.useState(false);
  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setOrbReady(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setOrbReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  // Efek berkelanjutan (parallax & kartu melayang) memakai GSAP yang
  // diimpor DINAMIS setelah halaman idle. GSAP + ScrollTrigger (~50KB gzip,
  // bootup ~6,7s di emulasi CPU 4x LH 320px) tidak boleh berada di jendela
  // kritis LCP/TBT. Animasi MASUK sudah dipindah ke CSS (@keyframes
  // hero-fade-in di globals.css) sehingga h1 LCP terlihat sejak HTML tiba —
  // sebelumnya GSAP fromTo menyembunyikan teks hero setelah hydrasi dan LCP
  // baru tercatat saat reveal selesai (Render Delay 91% dari 6,2s).
  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!root.current) return;
    let cancelled = false;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const run = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      gsap.to("[data-hero-orb]", {
        y: 60,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to("[data-hero-copy]", {
        y: 30,
        opacity: 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
      // Kartu statistik melayang pelan dengan fase berlawanan — janji
      // PLANNING.md §4 "floating glass card" yang sebelumnya statis.
      gsap.utils.toArray<HTMLElement>("[data-hero-float]").forEach((el, i) => {
        gsap.to(el, {
          y: i % 2 === 0 ? -8 : 8,
          duration: 2.6 + i * 0.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        });
      });
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => void run(), { timeout: 2500 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const t = setTimeout(() => void run(), 1800);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-b border-border bg-background"
    >
      {/* Latar: grid + noise + glow — diredam (P0 restraint) */}
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-60" />
      <div className="absolute inset-0 bg-noise opacity-[0.12]" />
      {/* Glow dekoratif mahal di GPU/CPU filter 100px — disembunyikan di
          layar kecil di mana ia menutupi seluruh viewport tanpa terlihat
          (restraint) dan membebani paint perangkat low-end. */}
      <div className="pointer-events-none absolute -left-32 top-[-10%] hidden h-[420px] w-[420px] rounded-full bg-primary/14 blur-[100px] sm:block" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:py-28 lg:grid-cols-12 lg:items-center">
        {/* Kiri — copy */}
        <div data-hero-copy className="lg:col-span-7">
          <div
            data-hero-fade
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary-strong"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
Provinsi Kepulauan Bangka Belitung • 7 kabupaten/kota
          </div>

          {/* text-6xl kini clamp() di tailwind.config, jadi satu kelas
              menggantikan tiga breakpoint + nilai arbitrary 2.6rem. */}
          <h1 data-hero-fade className="text-6xl font-extrabold tracking-tight">
            Jasa terbaik dari{" "}
            <span className="font-serif font-bold text-primary-strong underline decoration-primary/20 underline-offset-[6px] decoration-[3px]">
              orang terpercaya
            </span>{" "}
            di sekitarmu
          </h1>

          <p
            data-hero-fade
            className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Dari perbaikan AC, kebersihan, instalasi listrik, sampai pindahan —
            bandingkan harga, lihat rating asli, dan pesan langsung dengan
            penyedia jasa profesional.
          </p>

          {/* Search — command palette style */}
          <div data-hero-fade className="relative mt-8 max-w-xl">
            <HeroSearch />
          </div>

          {/* Pills kategori */}
          <div data-hero-fade className="mt-6 flex max-w-xl flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/services?category=${cat.id}`}
                className="focus-ring flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:border-primary/40 hover:text-primary-strong"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Pill daerah — max 3 biar tidak clutter di HP */}
          <div data-hero-fade className="mt-4 flex max-w-xl flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Populer:</span>
            {[
              { label: "Pangkal Pinang", q: "Pangkal Pinang" },
              { label: "Tanjung Pandan", q: "Kabupaten Belitung" },
              { label: "Sungailiat", q: "Kabupaten Bangka" },
            ].map((loc) => (
              <Link
                key={loc.label}
                href={`/services?location=${encodeURIComponent(loc.q)}`}
                className="focus-ring rounded-lg bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {loc.label}
              </Link>
            ))}
            <Link href="/services" className="rounded-lg bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-strong hover:bg-primary hover:text-primary-foreground transition-colors">
              {cityCount} kabupaten/kota
            </Link>
          </div>
        </div>

        {/* Kanan — visual.
            Sebelumnya kolom ini hanya <HeroOrb /> tanpa tinggi sama sekali:
            Canvas height:100% dari parent yang auto-height ikut collapse, jadi
            yang tampil hanya bidang pipih dan kedua kartu melayang di ruang
            hitam kosong. Sekarang wrapper punya aspect-square eksplisit,
            cincin konsentris sebagai jangkar visual, dan kartu ditempel ke
            tepi cincin — bukan ke ruang kosong. */}
        <div className="relative lg:col-span-5">
          <div
            data-hero-orb
            className="relative mx-auto aspect-square w-full max-w-md"
          >
            {/* Cincin konsentris: memberi bentuk pada area kanan bahkan sebelum
                WebGL selesai memuat (atau kalau device tidak mendukungnya). */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-full border border-primary/15"
            />
            <div
              aria-hidden
              className="absolute inset-[12%] rounded-full border border-primary/10"
            />
            <div
              aria-hidden
              className="absolute inset-[26%] rounded-full bg-primary/5 blur-2xl"
            />

            {orbReady && <HeroOrb />}

            {/* Kartu rating — ditempel ke tepi kiri cincin. Tampil di semua
                ukuran: di mobile inilah satu-satunya bukti sosial numerik. */}
            <div
              data-hero-float
              className="absolute -left-1 top-[10%] w-[132px] rounded-2xl border border-border bg-card/95 p-3 shadow-card-lg sm:-left-4 sm:top-[14%] sm:w-48 sm:p-4"
            >
              <div className="flex items-baseline gap-1">
                <Star
                  className="h-4 w-4 self-center fill-rating text-rating"
                  aria-hidden
                />
                <span className="text-2xl font-extrabold tabular-nums sm:text-3xl">
                  <Counter value={ratingAvg} decimals={1} />
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  /5
                </span>
              </div>
              <p className="mt-1 text-xs leading-tight text-muted-foreground">
                Rating rata-rata dari {completedOrders.toLocaleString("id-ID")}+
                pesanan
              </p>
            </div>

            {/* Kartu jumlah penyedia — ditempel ke tepi kanan-bawah cincin */}
            <div
              data-hero-float
              className="absolute -right-1 bottom-[10%] w-[132px] rounded-2xl border border-border bg-card/95 p-3 shadow-card-lg sm:-right-4 sm:bottom-[14%] sm:w-48 sm:p-4"
            >
              <div className="text-2xl font-extrabold tabular-nums text-primary-strong sm:text-3xl">
                <Counter value={providerCount} suffix="+" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Penyedia jasa aktif
                {cityCount > 0 && ` di ${cityCount} kabupaten/kota`}
              </p>
            </div>
          </div>

          {/* Bukti sosial: inisial penyedia asli, bukan avatar stok. Mengisi
              ruang di bawah cincin yang sebelumnya kosong sepenuhnya. */}
          {providers.length > 0 && (
            <div
              data-hero-fade
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <ul className="flex items-center">
                {providers.slice(0, 5).map((provider, i) => (
                  <li
                    // Nama bisa duplikat di data nyata; index menjamin key unik.
                    key={`${provider.name}-${i}`}
                    className="-ml-2 first:ml-0"
                    style={{ zIndex: providers.length - i }}
                  >
                    {provider.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={provider.avatarUrl}
                        alt={provider.name ?? "Provider"}
                        title={`${provider.name}${provider.location ? ` — ${provider.location}` : ""}`}
                        className="h-9 w-9 rounded-full border-2 border-background object-cover shadow-sm"
                      />
                    ) : (
                      <span
                        title={`${provider.name}${provider.location ? ` — ${provider.location}` : ""}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-bold text-secondary-foreground"
                      >
                        {initials(provider.name)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                Bergabung bersama{" "}
                <span className="font-semibold text-foreground">
                  {providerCount.toLocaleString("id-ID")} penyedia jasa
                </span>{" "}
                yang sudah menerima pesanan
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
