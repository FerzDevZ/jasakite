import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Store,
  Undo2,
  MapPin,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCategoryIcon } from "@/lib/category-icons"
import { Hero } from "@/components/landing/hero";
import { Reveal } from "@/components/landing/reveal";
import { Counter } from "@/components/landing/counter";
import { CaraKerja } from "@/components/landing/cara-kerja";
import { DenseServiceTile } from "@/components/services/dense-service-tile";
import { NearbySection } from "@/components/landing/nearby-section";
import { CategoryGrid } from "@/components/landing/category-grid";
import { PromoRail } from "@/components/landing/promo-rail";
import { VoucherRail } from "@/components/landing/voucher-rail";
import { ActiveOrderStrip } from "@/components/landing/active-order-strip";
import type { Metadata } from "next";

export const revalidate = 60;

/**
 * Deskripsi beranda mengikuti kategori yang benar-benar ada di database.
 *
 * Sebelumnya teksnya hardcode menyebut layanan yang sudah tidak ditawarkan
 * dan tetap tampil di hasil pencarian Google berbulan-bulan setelah kategori
 * itu dihapus — janji di snippet yang tidak bisa dipenuhi katalog. Query di
 * sini memakai kategori yang sama dengan hero, jadi teks tidak bisa lagi
 * menyimpang dari isi katalog.
 */
export async function generateMetadata(): Promise<Metadata> {
  const categoryNames = (
    await prisma.category.findMany({ take: 4, select: { name: true } })
  ).map((category) => category.name);

  const description =
    categoryNames.length > 0
      ? `Bandingkan harga, rating, dan ulasan penyedia ${categoryNames.join(
          ", "
        )} di Kepulauan Bangka Belitung. Pesan langsung, bayar setelah selesai.`
      : "Bandingkan harga, rating, dan ulasan penyedia jasa lokal di Kepulauan Bangka Belitung. Pesan langsung, bayar setelah selesai.";

  return {
    title: "JASAKITE — Cari Jasa Lokal Terpercaya di Sekitar Anda",
    description,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  // Satu acuan waktu untuk seluruh halaman: penyedia dianggap tayang bila
  // masa aktif langganannya masih di depan. Memakai satu `new Date()`
  // menghindari daftar jasa dan angka statistik berbeda pendapat di tengah
  // render yang berjalan beberapa ratus milidetik.
  const subscriptionNow = new Date()
  const [
    categories,
    services,
    popularServices,
    providerCount,
    completedOrders,
    ratingAvg,
    cityCount,
    heroProviders,
    banners,
    vouchers,
    reviews,
  ] = await Promise.all([
    // Batas 12 kategori: tiga baris pintasan 4 kolom di mobile sekaligus
    // enam pill di hero tanpa memuat seluruh taksonomi bila nanti bertambah
    // (4 kategori saat ini: Antar, Belanja, Pembayaran, Titip).
    prisma.category.findMany({
      take: 12,
      include: {
        _count: {
          select: {
            services: {
              where: {
                status: "ACTIVE",
                provider: { subscriptionUntil: { gt: subscriptionNow } },
              },
            },
          },
        },
      },
    }),
    prisma.service.findMany({
      where: {
        status: "ACTIVE",
        provider: { subscriptionUntil: { gt: subscriptionNow } },
      },
      include: {
        provider: { select: { name: true, avatarUrl: true, city: true } },
        category: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    // Feed "Paling banyak dipesan" — diurutkan jumlah pesanan nyata, bukan
    // label Terlaris yang tidak bisa diverifikasi. _count ikut disertakan
    // agar kartu menampilkan angka pesanannya.
    prisma.service.findMany({
      where: {
        status: "ACTIVE",
        provider: { subscriptionUntil: { gt: subscriptionNow } },
      },
      include: {
        provider: { select: { name: true, avatarUrl: true, city: true } },
        category: true,
        _count: { select: { orders: true } },
      },
      orderBy: { orders: { _count: "desc" } },
      take: 6,
    }),
    // Penyedia "aktif" = punya minimal satu jasa ACTIVE, sama dengan definisi
    // di kartu penyedia hero. Menghitung semua baris PROVIDER membuat akun
    // kosong (sisa seed lama, pendaftar yang belum mengisi jasa) ikut terhitung
    // sebagai penyedia yang melayani.
    prisma.user.count({
      where: {
        role: "PROVIDER",
        subscriptionUntil: { gt: subscriptionNow },
        services: { some: { status: "ACTIVE" } },
      },
    }),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.service
      .aggregate({
        where: {
          status: "ACTIVE",
          provider: { subscriptionUntil: { gt: subscriptionNow } },
        },
        _avg: { ratingAvg: true },
      })
      .then((r) => r._avg.ratingAvg ?? 0),
    // Jumlah kabupaten/kota yang benar-benar punya penyedia berjasa aktif.
    // Satu baris per kota (distinct), lalu saring `city` kosong di JS — filter
    // `city: { not: null }` tidak andal di Prisma+MongoDB (lihat catatan di
    // app/api/messages/route.ts). Hanya provinsi Kepulauan Bangka Belitung yang
    // dilayani, jadi hasilnya paling banyak 7.
    prisma.user
      .findMany({
        where: {
          role: "PROVIDER",
          subscriptionUntil: { gt: subscriptionNow },
          services: { some: { status: "ACTIVE" } },
        },
        select: { city: true },
        distinct: ["city"],
      })
      .then((rows) => rows.filter((r) => r.city).length),
    // Penyedia untuk bukti sosial di hero — nama + foto asli dari DB, bukan
    // avatar stok. Hanya yang punya jasa aktif agar tidak memajang akun kosong.
    prisma.user.findMany({
      where: {
        role: "PROVIDER",
        subscriptionUntil: { gt: subscriptionNow },
        services: { some: { status: "ACTIVE" } },
      },
      select: { name: true, location: true, avatarUrl: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    // Banner kampanye: disaring tanggal di database (bukan di JS) supaya banner
    // kedaluwarsa tidak pernah dikirim ke HTML halaman yang di-cache ISR.
    prisma.promoBanner.findMany({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      orderBy: { position: "asc" },
      take: 6,
    }),
    // Voucher yang masih berlaku untuk dipamerkan; kuota penuh tetap
    // ditampilkan sebagai "sudah habis"? Tidak — rail ini pengumuman, dan
    // mengumumkan voucher yang tidak bisa dipakai hanya menimbulkan kekecewaan.
    prisma.voucher.findMany({
      where: {
        isActive: true,
        startsAt: { lte: new Date() },
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      orderBy: { value: "desc" },
      take: 6,
    }),
    // Testimoni asli — ulasan pesanan COMPLETED, bukan array karangan di JSX.
    // Filter komentar kosong dilakukan di JS: filter null pada Prisma+MongoDB
    // tidak andal (catatan yang sama di app/api/messages/route.ts).
    prisma.review.findMany({
      where: { order: { status: "COMPLETED" } },
      include: { reviewer: { select: { name: true, city: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const stats = [
    { value: providerCount, suffix: "+", label: "Penyedia jasa aktif" },
    { value: completedOrders, suffix: "+", label: "Pesanan selesai" },
    { value: ratingAvg, decimals: 1, suffix: "/5", label: "Rating rata-rata" },
    { value: cityCount, label: "Kabupaten/kota di Bangka Belitung" },
  ];

  const availableVouchers = vouchers.filter(
    (voucher) => voucher.quota === null || voucher.usedCount < voucher.quota
  );

  // Ulasan layak pamer: komentar nyata (≥30 karakter) + rating tinggi,
  // maksimal satu per pengulas supaya grid tidak didominasi satu orang.
  // Nol ulasan lolos → seluruh blok testimoni disembunyikan — lebih baik
  // tanpa testimoni daripada testimoni karangan (janji "ulasan asli" di
  // strip janji platform harus dipenuhi oleh data yang sama).
  const seenTestimonialReviewers = new Set<string>();
  const testimonials = reviews
    .flatMap((review) => {
      const text = review.comment?.trim();
      if (!text || text.length < 30 || review.rating < 4) return [];
      const reviewerId = String(review.reviewerId);
      if (seenTestimonialReviewers.has(reviewerId)) return [];
      seenTestimonialReviewers.add(reviewerId);
      const name = review.reviewer.name ?? "Pelanggan";
      return [
        {
          name,
          city: review.reviewer.city,
          rating: review.rating,
          text,
          avatar: name.trim().charAt(0).toUpperCase() || "P",
        },
      ];
    })
    .slice(0, 3);

  return (
    <div className="animate-content-in">
      <Hero
        categories={categories.slice(0, 6)}
        providers={heroProviders}
        providerCount={providerCount}
        completedOrders={completedOrders}
        ratingAvg={ratingAvg}
        cityCount={cityCount}
      />

      {/* ===== BLOK APLIKASI =====
          Empat rail pertama setelah hero ditulis rapat (space-y-8) tanpa
          padding antar-bagian yang besar: pesanan berjalan → promo → pintasan
          kategori → voucher. Inilah urutan yang dipakai aplikasi pesan-antar,
          dan yang membuat halaman terasa "bisa dipakai", bukan brosur. */}
      <div className="space-y-8 py-8 md:space-y-10 md:py-10">
        <ActiveOrderStrip />
        <PromoRail
          banners={banners.map((banner) => ({
            id: banner.id,
            title: banner.title,
            subtitle: banner.subtitle,
            href: banner.href,
            tone: banner.tone,
          }))}
        />
        <CategoryGrid
          categories={categories.map((cat) => ({
            id: cat.id,
            slug: cat.slug,
            name: cat.name,
            serviceCount: cat._count?.services ?? 0,
          }))}
        />
        <VoucherRail
          vouchers={availableVouchers.map((voucher) => ({
            code: voucher.code,
            title: voucher.title,
            description: voucher.description,
            type: voucher.type,
            value: voucher.value,
            minSpend: voucher.minSpend,
            scopeCity: voucher.scopeCity,
            endsAt: voucher.endsAt,
          }))}
        />
      </div>

      {/* ===== STRIP JANJI PLATFORM =====
          Bukan rail promo palsu (diskon fiktif = slop): empat klaim yang
          benar-benar dijalankan aplikasi — batal gratis selama PENDING memang
          diizinkan FSM, ulasan hanya dari order COMPLETED. */}
      <section aria-label="Janji layanan" className="border-y border-border bg-card/50">
        <ul className="mx-auto flex max-w-7xl snap-x gap-3 overflow-x-auto px-4 py-4 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:py-5">
          {[
            { icon: ShieldCheck, title: "Bayar setelah selesai", desc: "Pesanan dulu, bayar saat kerjaan beres" },
            { icon: Undo2, title: "Batal gratis", desc: "Selama pesanan masih PENDING" },
            { icon: BadgeCheck, title: "Ulasan asli", desc: "Hanya dari pesanan selesai" },
            { icon: MapPin, title: `${cityCount} kabupaten/kota`, desc: "Penyedia se-Kep. Bangka Belitung" },
          ].map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="flex min-w-[220px] snap-start items-center gap-3 rounded-xl border border-border bg-background p-3.5 md:min-w-0"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-strong">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">{desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ===== DI SEKITAR ANDA =====
          Geolokasi jujur: hanya menghitung jarak ke pusat kota (database tidak
          punya koordinat penyedia), lalu membuka katalog terfilter kota itu. */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-14">
          <NearbySection cityCount={cityCount} />
        </div>
      </section>

      {/* ===== FEED: PALING BANYAK DIPESAN =====
          Urutan marketplace: yang paling laris naik ke atas. Angka pesanan di
          kartu berasal dari _count — bukan klaim tanpa dasar.
          Mobile: dua kolom padat seperti aplikasi (kartu lebar penuh membuat
          hanya 1,5 kartu terlihat per layar). Desktop: 4 kolom. */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-14">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Paling banyak dipesan
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Jasa yang paling sering dipercaya pelanggan.
              </p>
            </div>
            <Link
              href="/services?sort=popular"
              className="group hidden items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary-strong sm:flex"
            >
              Lihat semua
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {popularServices.map((service, i) => (
            <Reveal key={service.id} delay={(i % 4) * 0.06} className="h-full">
              <DenseServiceTile service={service} className="h-full" />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== KATEGORI POPULER =====
          Etalase (kartu besar + jumlah jasa), berbeda peran dari pintasan
          ikon di atas: di sini pengguna yang belum tahu mau cari apa bisa
          membaca deskripsi kategori, bukan hanya namanya. */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-14">
          <Reveal>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Kategori populer
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Temukan keahlian yang paling sering dicari di sekitar Anda.
                </p>
              </div>
              <Link
                href="/services"
                className="group hidden items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary-strong sm:flex"
              >
                Lihat semua
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>

          <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-6">
            {categories.slice(0, 6).map((cat, i) => {
              const Icon = getCategoryIcon(cat.slug);
              const count = (cat as unknown as { _count: { services: number } })._count?.services ?? 0
              return (
                <Reveal key={cat.id} delay={i * 0.06} className="h-full min-w-[180px] snap-start md:min-w-0">
                  <Link
                    href={`/services?category=${cat.id}`}
                    className="group relative flex h-full min-h-[148px] flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 transition-[transform,box-shadow,border-color] duration-200 ease-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-lg focus-visible:-translate-y-0.5 focus-visible:border-primary/40 focus-visible:shadow-card-lg"
                  >
                    <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/0 blur-2xl transition-colors duration-300 group-hover:bg-primary/10" />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-accent text-muted-foreground transition-[background,border-color,color,box-shadow] duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-auto w-full">
                      <div className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight">
                        {cat.name}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-2xs font-semibold tabular-nums">{count} jasa</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <Link href="/services" className="mx-auto mt-6 flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary-strong md:hidden">
            Lihat semua kategori <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ===== JASA TERBARU ===== */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:py-14">
        <Reveal>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Baru ditambahkan
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Jasa terbaru yang baru saja tayang di katalog.
              </p>
            </div>
            <Link
              href="/services"
              className="group hidden items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary-strong sm:flex"
            >
              Jelajahi semua
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={(i % 4) * 0.06} className="h-full">
              <DenseServiceTile service={service} className="h-full" />
            </Reveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/services"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
          >
            Jelajahi seluruh katalog <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* ===== CARA KERJA (4 STEPS) ===== */}
      <CaraKerja />

      {/* ===== STATISTIK ===== */}
      <section className="relative overflow-hidden border-y border-border bg-background">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-[80px]" />
        <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-10 px-4 py-16 md:grid-cols-4 md:py-20">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08}>
              <div className="text-center">
                <div className="text-5xl font-extrabold tracking-tight text-primary-strong">
                  <Counter
                    value={s.value}
                    decimals={s.decimals ?? 0}
                    suffix={s.suffix}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== TESTIMONI ===== */}
      {testimonials.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Dipercaya ribuan pelanggan
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Mereka sudah merasakan kemudahan JASAKITE.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary-strong">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.city}</div>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <svg key={j} className="h-3.5 w-3.5 fill-rating text-rating" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-primary p-10 text-primary-foreground md:p-16">
            <div className="absolute inset-0 bg-noise opacity-20" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-foreground/15 blur-3xl" />
            <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
              <div className="max-w-lg">
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                  Untuk penyedia jasa
                </p>
                <h2 className="mt-3 text-4xl font-extrabold tracking-tight">
                  Punya keahlian? Ubah jadi penghasilan.
                </h2>
                <p className="mt-3 text-sm opacity-85 md:text-base">
                  Buka jasa gratis, terima pesanan dari pelanggan di sekitar
                  Anda, dan bangun reputasi lewat rating.
                </p>
              </div>
              {/* Tombol utama memakai bg-background + text-primary-strong
                  (5.0:1). Tidak boleh bg-primary-foreground: di light mode
                  token itu gelap, jadi teks oranye di atasnya tak terbaca.
                  Tautan /chat dihapus — rutenya tidak ada (404). */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-background px-7 py-3.5 text-sm font-bold text-primary-strong transition-transform duration-base hover:scale-[1.02] active:scale-[0.98]"
                >
                  Mulai Jualan <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/services"
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/40 px-7 py-3.5 text-sm font-bold transition-colors duration-base hover:bg-primary-foreground/10"
                >
                  <Store className="h-4 w-4" aria-hidden /> Cari Jasa
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      {/* Floating CTA mobile DIHAPUS — digantikan bottom-nav global
          (Beranda/Kategori/Pesanan/Pesan/Akun) yang selalu tersedia di setiap
          halaman; mempertahankan keduanya berarti dua bar di layar. */}
    </div>
  );
}
