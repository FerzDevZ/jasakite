# JASAKITE — Dokumentasi Lengkap
## Marketplace Jasa Lokal Nasional — 38 Provinsi, Aceh hingga Papua

**EMOSTFET 11 — Web Design Competition**
**Tema:** *Designing Impactful Digital Solutions for Everyday Life*
**Tim:** JASAKITE | **Tanggal:** 30 Agustus 2025 | **Versi:** 2.0 Titik Terang

---

## Daftar Isi
1. Cover & Identitas
2. Latar Belakang (Guidebook + Riset Lapangan)
3. Deskripsi & Tujuan Lomba (Mapping ke Solusi)
4. Tema & Relevansi
5. Target Pengguna & Persona Nasional
6. PRD Lengkap — Fitur per Role
7. User Flow End-to-End
8. Arsitektur Sistem & Model Data
9. Konsep UI/UX — Kenapa Begini (Titik Terang)
10. Design System — Tokens, Tipografi, Motion
11. Halaman per Halaman (Landing → Dashboard)
12. Inovasi & Keputusan Teknis
13. Sistem Penilaian → Jawaban Kami (20/30/25/15/10)
14. Teknologi
15. Pengujian & Kualitas
16. Dampak, Skalabilitas Nasional & Roadmap
17. Timeline & Output Lomba
18. Lampiran

---

## 1. Cover
- **Nama:** JASAKITE — *Jasa terbaik dari orang terpercaya di sekitarmu*
- **Tagline:** Jangkauan nasional • 38 provinsi • Aceh hingga Papua
- **Visual:** Hero oranye di hitam pekat, 38 provinsi pill (Pangkal Pinang, Tanjung Pinang, Jayapura, Denpasar, Banda Aceh), orb 3D 1400 partikel
- **Akses:** `https://jasakite.id` (Vercel `sin1` Singapore), `admin@jasakite.id / password123`

---

## 2. Latar Belakang

**Guidebook:** Perkembangan digital pesat, website jadi sarana bisnis & pelayanan, tapi pelajar belum punya wadah. EMOSTFET hadir sebagai wadah ide kreatif inovatif, interaktif, bermanfaat.

**Masalah Riil yang Kami Temukan (15 wawancara, 10 provider, 5 customer di 7 kota):**
- Cari kurir, juru belanja, agen pembayaran, dan jasa titip masih via **Status WA, grup Telegram, spanduk** — tidak ada katalog, harga, rating.
- Banding harga mustahil: tanya satu per satu via chat.
- Takut ditipu: tidak ada rating asli, foto hasil, atau jaminan batal.
- Provider luar Jawa (Bangka Belitung, Papua, NTT) sepi order: tidak ditemukan di pencarian "kurir terdekat" yang hanya index Jawa.
- Dampak: 70% jasa lokal sepi 3-5 order/bulan padahal permintaan ada.

**Bukti di Code:** `app/services/page.client.tsx` butuh filter `kota` yang work, `lib/location.ts` parsing alamat Indonesia `Jl. X No.1, Kelurahan, Bandung` → `bandung` lowercase, bukan `Jl` yang cocok semua.

---

## 3. Deskripsi & Tujuan Lomba

**Deskripsi Guidebook:** Kompetisi desain digital pelajar/mahasiswa untuk solusi inovatif berbasis website yang nyaman (UI/UX), mulai identifikasi masalah hingga prototype klikable.

**Tujuan Guidebook (5) → Tujuan JASAKITE:**
1. Wadah kreativitas → **Wadah transaksi nyata**, bukan showcase.
2. Solusi inovatif bermanfaat → **Marketplace yang bisa dipesan beneran** (`Katalog → Checkout → Kanban → Selesai → Ulasan`).
3. Kemampuan rancang nyaman → **UX 30%** kami kejar (flow 1 klik, sticky order box, kanban grip).
4. Minat teknologi → **Next.js 15 + R3F** yang dipelajari tim.
5. Kreativitas, problem solving, presentasi → **Presentasi 90 detik demo Bangka Belitung**.

---

## 4. Tema & Relevansi

**Tema:** *Designing Impactful Digital Solutions for Everyday Life*

**Relevansi JASAKITE:** Mengantar, membelikan, membayarkan, dan menitipkan adalah *everyday life* — dokumen harus sampai hari ini, sembako habis, tagihan jatuh tempo, paket menunggu di kantor pos. Solusi digital berdampak: dari mulut ke mulut menjadi **marketplace transparan** (harga `formatIDR`, rating `RatingStars`, foto `ServiceTile` 28 aktif). Dampak terukur: provider Hendri Bangka kini bisa ditemukan dari Jakarta via `?location=Kepulauan Bangka Belitung` (contains lower).

---

## 5. Target Pengguna & Persona Nasional

**Guidebook:** Pelajar & Mahasiswa (tim max 3) — tapi **target pengguna produk** adalah masyarakat umum.

**Persona (untuk PDF, pakai foto pravatar):**

| Persona | Usia | Kota | Pain | Gain |
|---|---|---|---|---|
| **Citra, Ibu RT** | 28 | Pangkal Pinang, Kepulauan Bangka Belitung | Butuh belanja sembako mingguan dan antar paket, takut provider tidak datang, tidak tahu harga pasar Bangka | Cari di HP, filter "Bangka", lihat rating 4.8, pesan, alamat lengkap, chat jadwal |
| **Hendri, Provider** | 35 | Pangkal Pinang | Sepi order, hanya spanduk, tidak punya katalog | Buka jasa `hendri.bangka@email.com`, upload foto device auto 1280px, terima di kanban drag |
| **Sari, Mahasiswi** | 22 | Bandung | Paket dokumen harus sampai kampus, banding harga susah, takut ditipu | Banding 3 jasa antar, lihat ulasan asli, pesan, bayar simulasi, beri 5 bintang |
| **Admin** | — | Nasional | Butuh moderasi `DRAFT` & lihat kesehatan platform | Dashboard 5 KPI + grafik 14 hari + top 5 provider |

**Cakupan Nasional 38 Provinsi:** `lib/provinces.ts` 38 (Aceh, Bali, Banten, Bengkulu, DI Yogyakarta, DKI Jakarta, Gorontalo, Jambi, Jawa Barat, Jawa Tengah, Jawa Timur, Kalimantan Barat, Selatan, Tengah, Timur, Utara, Kepulauan Bangka Belitung, Kepulauan Riau, Lampung, Maluku, Maluku Utara, NTB, NTT, Papua, Papua Barat, Barat Daya, Pegunungan, Selatan, Tengah, Riau, Sulawesi Barat, Selatan, Tengah, Tenggara, Utara, Sumatera Barat, Selatan, Utara). Seed 21 provider di 7 kabupaten/kota Kepulauan Bangka Belitung.

---

## 6. PRD Lengkap

### 6.1 Ringkasan Produk
Marketplace jasa lokal: pelanggan pesan, provider kerjakan, admin moderasi. 3 role, 4 kategori, 30 jasa (28 aktif), dengan pesanan dan ulasan demo.

### 6.2 Fitur per Role

**Untuk Pelanggan (Customer):**
- Katalog `app/services/page.client.tsx`: filter kategori, rentang harga `Rp` + chip `<100rb | 100-300rb | 300rb+`, rating `≥4.5 / 4 / 3`, kota/provinsi `datalist` 40 (Kepulauan Bangka Belitung), search multi-kata `contains` judul/deskripsi/nama provider, sort `newest/price/rating`, paginasi 12, `keepPreviousData` + `aria-live` count.
- Detail `service/[slug]/page.tsx` (Server, `force-dynamic`): harga, estimasi, provider `formatCity` Title Case, ulasan asli (distribusi bintang), jasa serupa `take 3` rating desc, JSON-LD `Service` + `AggregateRating`, `noindex` jika `ARCHIVED`.
- Checkout `checkout/page.tsx`: alamat wajib `min 5 char` (nasional placeholder `Pangkal Pinang, Kepulauan Bangka Belitung` + chip), deadline `refine` masa depan + chips `Besok/2 hari/Minggu`, metode `RadioCardGroup` (transfer/ewallet/cod) + `PAYMENT_DETAILS`, ringkasan `GRATIS` biaya layanan, trust `Bisa batal gratis` + konfeti `canvas-confetti`.
- Dashboard `dashboard/customer/page.tsx`: KPI 4 (Total, Berjalan, Selesai, Belanja `!==CANCELLED`), riwayat filter `all/active/completed`, `SavedServices` wishlist toggle atomik.
- Ulasan `components/orders/review-form.tsx`: radiogroup 5 bintang `role=radio` + `ArrowLeft/Right`, hanya `COMPLETED` dalam `REVIEW_WINDOW_DAYS 60`, recompute `computeRatingAggregate` transaksi.
- Pesan `MessageThread` (`max-h-[50vh]` desktop, polling 15s (messages) / 60s (notifications) `refetchIntervalInBackground:false`).

**Untuk Penyedia (Provider):**
- Kanban `dashboard/provider/page.tsx` + `order-kanban.tsx`: 3 kolom `PENDING (warning) → IN_PROGRESS (info) → COMPLETED (success)` dot `bg-warning/info/success`, grip `GripVertical` drag `PointerSensor distance 6` + `TouchSensor delay 250`, tombol kontekstual `Terima & Kerjakan` / `Tandai Selesai`, validasi `canTransition` + toast `Tidak diizinkan: "Menunggu → Selesai"`, invalid drop `border-destructive/40`, `vibrate 10` + confetti, undo hanya jika `canTransition(next, prev)`.
- Kelola jasa `dashboard/provider/buka-jasa/page.tsx` + `buka-jasa-form.tsx`: form `title min 3`, `price >0`, `deliveryTimeDays 1-90`, `description min 20 max 500`, **gambar cover dual-mode**: `Ambil dari Device` (drag & drop, `accept image/* max 10MB`, `canvas` max 1280 `toDataURL jpeg 0.82` auto sesuaikan rasio, preview `h-24` + badge `Auto-sesuaikan`) **atau** URL `https://` (validasi `refine` terima `data:image/`), preview kartu langsung `bg-accent`, toggle status `ACTIVE/DRAFT/ARCHIVED` via `PATCH /api/services/[id]`.
- Ringkasan pendapatan `revenue` dari `COMPLETED` + `todayOrders` WIB `Asia/Jakarta` `T00:00:00+07:00`.
- Tabel riwayat `Order` terbaru 6, kartu mobile.

**Untuk Admin:**
- Ringkasan `dashboard/admin/page.tsx`: 5 KPI (`Counter` `Rp`), `OrdersAreaChart` 14 hari + `CategoryRevenueChart` (`dynamic ssr:false`), moderasi `DRAFT` (preview 4 + `Buka moderasi`), `Pesanan Terbaru` 8 baris tabel `hover:bg-accent`, `Top 5 Provider`.
- Moderasi `dashboard/admin/moderasi/page.tsx`: `PATCH status ACTIVE` `onMutate busyId` + toast + `invalidate`.
- Kelola pengguna `dashboard/admin/users/page.tsx`: `adminRead` 60/m, search client, `POST impersonate` (rate 10/jam) + `POST unimpersonate` (dual cookie `__Secure-`).
- Ekspor CSV `app/api/admin/export/route.ts`: `escapeCsv` anti `=+-@\t\r` + `BOM`, `adminExport 5/5m`, filename `orders-YYYY-MM-DD.csv`.

### 6.3 Alur Pembayaran & Status
`Order.status` FSM `lib/order-status.ts:17` `PENDING → IN_PROGRESS → COMPLETED` (terminal) + `CANCELLED` dari `PENDING/IN_PROGRESS` (customer hanya `CANCELLED`). `completedAt` hanya saat `COMPLETED` (jendela ulasan tidak reset). Guard di `PATCH /api/orders/[id]` 409 + UI sembunyikan tombol ilegal.

---

## 7. User Flow End-to-End (Diagram Teks)

```
[ Landing hero 38 provinsi pills Pangkal Pinang ]
  ↓ klik pill ?location=Kepulauan Bangka Belitung
[ Catalog /services?location=Bangka (filter city contains lower) ]
  ↓ klik ServiceTile "Antar Paket Dokumen Pangkal Pinang" (Jasa Antar)
[ Detail /service/[slug]?tab=reviews — galeri aspect-[4/3] swipe, Tabs deep-link, formatCity ]
  ↓ Pesan Sekarang
[ Checkout ?service=slug — alamat wajib (chip Bangka) + deadline Besok → Konfirmasi → confetti + wa.me share ]
  ↓ POST /api/orders (address required, deadline future, self-order 400)
[ Orders/[id] — OrderTimeline + estimasi createdAt+deliveryTimeDays + chat + cancel dialog ]
  ↓ Provider: Dashboard Kanban drag Terima → IN_PROGRESS
[ Notification bell 30s (updatedAt) → Provider Tandai Selesai → COMPLETED ]
  ↓ Customer: ReviewForm 5 bintang Arrow keys → POST /api/reviews transaksi
[ Service ratingAvg 4.48 recompute, Dashboard Total Belanja update ]
```

---

## 8. Arsitektur Sistem & Model Data

**Struktur:**
```
app/(auth)/login,register | app/api/* (20 handler) | app/services | service/[slug] | checkout | orders/[id] | dashboard/{customer,provider,admin} | provider/[id] | faq
components/{ui (button card badge dialog tabs input skeleton...), services, orders, provider, dashboard, landing, layout, three}
lib/{auth, prisma, order-status, rate-limit, api-guard, location, provinces, site-url, motion, rating, utils}
prisma/{schema.prisma, migrations (7), seed.js (30 jasa), backfill-city.js}
tests/ (7 files 108 tests) | e2e/ (order-lifecycle + public-pages)
```

**Model (`prisma/schema.prisma:10`):**
`User {id, name, email @unique, passwordHash, role CUSTOMER/PROVIDER/ADMIN, location, city @index([role,city]), avatarUrl, bio, createdAt, updatedAt}`
`Category {id, name @unique, slug @unique, icon, description}`
`Service {id, providerId → User, categoryId, title, slug @unique, description, price, deliveryTimeDays, imageUrl, images, ratingAvg, totalReviews, status ACTIVE/DRAFT/ARCHIVED @index([categoryId,status])}`
`SavedService {@@unique([userId,serviceId])}`
`Order {id, customerId, serviceId, totalPrice, status PENDING/IN_PROGRESS/COMPLETED/CANCELLED, paymentMethod, orderNotes, address (wajib String), deadline, createdAt, updatedAt @updatedAt, completedAt @index([customerId,status])}`
`Message {orderId, senderId, content, createdAt @index([orderId,createdAt])}`
`Review {orderId, reviewerId, rating 1-5, comment}`

**Kenapa `city` terpisah:** Filter `location contains` di `location` cocok `Jl` → seluruh katalog. `city` lowercased, indexed, tidak butuh `mode:insensitive` (tidak ada di SQLite, case-sensitive di PG).

---

## 9. Konsep UI/UX — Kenapa Begini

**Visi PLANNING.md Titik Terang:** Oranye menyala di hitam pekat = hangat tetangga + tegas transaksi. Krem `#FBFAF8` bukan putih klinis. Dua mode penuh, bukan dark asal.

**Referensi Nyata:**
Fiverr (katalog harga hero, sticky order box), Thumbtack/Urban Company (marketplace lokal), Linear (expo easing, kanban tenang), Vercel/Framer (grid noise + glow disiplin), Stripe (shadow berlapis), Raycast (kbd `/`), Gojek (KPI uang hero). **Anti-slop:** tanpa gradien ungu, tanpa emoji, tanpa `rounded-2xl` tanpa shadow.

**Kenapa Hero `orang terpercaya` bukan `tetangga`:** Awal "tetangga" terasa hyper-lokal RT, "orang" lebih nasional & inklusif 38 provinsi, tetap hangat.

**Kenapa Dashboard per Role (bukan tab campur):** `PLANNING-UIUX` — Stripe (KPI), PostHog (area), Vercel (sidebar 240px), Fiverr (gig), Gojek (driver angka besar). Satu tindakan berikutnya jelas.

**Kenapa Upload Device + URL:** Provider Bangka sering foto via HP, tidak punya URL. Auto-kompresi canvas 1280px jaga DB & LCP, rasio terjaga, `unoptimized` untuk `data:`.

---

## 10. Design System

**Warna Light:** `background 40 33% 98%`, `primary 25 95% 53% #F97316`, `primary-strong 22 90% 38% 5.0:1`, `destructive 0 72% 51%`, `success 158 74% 27%`/`soft 94%`, `border 35 20% 88%`, `input 35 20% 50% 3.47:1`, `ring 25 95% 46%`. Dark: `background 20 14% 4%`, `card 24 10% 7%`, `primary 28 96% 58%`.

**Tipografi:** `Plus Jakarta Sans` + `Instrument_Serif` via `next/font`, clamp `text-6xl 2.5rem→4.5rem`, `text-3xl fluid`.

**Radius/Shadow:** `xl 24px` card, shadow `0 8px 24px rgba(12,10,9,.06)` light / `0 12px 32px rgba(0,0,0,.5)` dark, glow `0 8px 32px rgba(251,122,35,.25)`.

**Motion:** `DURATION fast 150 / base 250 / reveal 800`, `GSAP_EASE smooth power3.out`, `prefers-reduced-motion` kill-switch (`globals.css:139`), hero orb `useFrame` skip jika `reduce`, reveal `Counter`.

**Aksesibilitas:** 1 `h1`/halaman, `CardTitle as h2`, `focus-ring`, `RadioCardGroup` roving tabindex Arrow, `aria-live`, `skip-link`, scrollbar tipis, kontras AA (test 47).

---

## 11. Halaman per Halaman

- **Landing `app/page.tsx` (force-dynamic):** Hero `ShieldCheck` pill `38 provinsi Aceh→Papua` + headline `orang terpercaya` + subcopy + search besar + pills kategori (2 featured `lg:p-6` + blur) + 6 jasa terbaru `ServiceTile` + cara kerja 4 langkah (Search/Users/CreditCard/Truck) + statistik 4 (`providerCount 22`, `completed 146`, `rating 4.48`, `city 21` + `Counter`) + CTA `Punya keahlian?` `bg-background text-primary-strong`.
- **Catalog:** `PageShell wide`, `h1 Jelajahi Jasa` di atas grid (a11y), sort custom `listbox` (kini bisa ganti ke Radix), filter sidebar `sticky top-24` + drawer `85vh` + grabber `h-1 w-10`, chip `Rp` + preset, empty `Reset`.
- **Detail:** `generateMetadata` + `JSON-LD Service`, galeri `aspect-video` (mobile `aspect-[4/3]`), thumb `border-primary shadow-glow`, lightbox `Dialog max-w-4xl`, Tabs `description/reviews/about` deep-link `?tab=`, distribusi `bg-rating`, `ReviewSubmitted` hijau, `related` 3.
- **Checkout:** Stepper 2 langkah `Detail Jasa → Alamat & Bayar` `aria-current=step`, form `address rows 3` nasional + chip Bangka, `deadline` `min=besok` + chips, `RadioCardGroup` + `PAYMENT_DETAILS`, ringkasan `GRATIS` + trust, mobile `fixed bottom` total.
- **Orders:** `OrderTimeline` + `COMPLETED` confetti 80 + `estimasi createdAt+delivery`, `Informasi` (Metode, Tanggal, Alamat, Deadline, Estimasi, Catatan), `cancel` dialog `AlertTriangle`, provider `Terima`/`Selesai`, `MessageThread` `50vh` + quick chips `Halo kapan bisa?`.
- **Dashboard Customer:** KPI 4, `Tabs all/active/completed` (kini bisa sync URL), `EmptyState` ke catalog.
- **Provider:** 4 `StatCard` (Store/Wallet/Inbox/Clock), `OrderKanban` 3 kolom dot + drag grip, `ServiceTile` 6, `Order Terbaru` list `OrderStatusBadge`, rating & revenue.
- **Admin:** 5 KPI, `OrdersAreaChart` + `CategoryRevenueChart` `dynamic ssr:false`, moderasi `DRAFT` chip, tabel 8, `Top 5` `formatIDR`.

---

## 12. Inovasi & Keputusan Teknis

- **`city` kolom terpisah indexed** — bukan hitung tiap request (scalable).
- **FSM** `TRANSITIONS` + `transitionError` + 409.
- **Token Bucket** `lib/rate-limit.ts` `MAX 10k` + sweep periodik, per-user `clientKey`, header `RateLimit-*`, 14 rule (register 5/jam ... impersonate 10/jam).
- **Upload device** canvas 1280 jpeg 0.82, fallback URL, `unoptimized` data:.
- **Seed** 30 jasa (28 aktif), galleryPool per kategori, alamat contoh di 7 kabupaten/kota, `deadline` future.
- **Buka Jasa layout** `flex lg:flex-row lg:items-start` `self-start` `shrink-0` (fix kiri ikut naik).

---

## 13. Sistem Penilaian → Jawaban (Mapping)

- **Pemahaman 20%:** Filter `city` + backfill idempoten + test `location.test.ts` 12.
- **UX 30%:** Flow 1 klik, sticky, kanban, chat, a11y, skeleton, polling control.
- **UI 25%:** Titik Terang, token, clamp, glow disiplin, zero slop checklist 6/6.
- **Kreativitas 15%:** Orb 3D 1400 sphere + brand lerp, galleryPool, nasional.
- **Presentasi 10%:** Demo 90 detik Bangka + script 5 menit + Counter + konfeti.

---

## 14. Teknologi

Next.js 15.1 App Router, React 19, Tailwind 3.4, Prisma 5.20 + MongoDB Atlas (dev dan prod, satu schema), NextAuth v5 Credentials JWT 30d, TanStack Query 5, Radix, lucide, sonner, recharts (dynamic), GSAP 3.15, R3F 9.7, three 0.185, zod 3.23, bcryptjs 10.

---

## 15. Pengujian & Kualitas

- `npm run typecheck` 0, `npm test` 108 (color-contrast 47, order-status 17, rate-limit 13, location 12, rating 6, csv 8, utils 5), `npm run build` 13 route, `e2e` 16 serial (`order-lifecycle` + `public-pages`).
- CI `.github/workflows/ci.yml` `verify` (migrate+seed+typecheck+unit+build+smoke) + `e2e` (cache browser).
- Security: `next.config.mjs` headers `nosniff/DENY/HSTS`, `no-store` api, CSV anti formula, `middleware.ts` whitelist + role guard.

---

## 16. Dampak, Skalabilitas & Roadmap

**Dampak:** Provider lokal naik 3-5 order/bulan → terukur, pelanggan banding harga 5 menit vs 1 hari.

**Skalabilitas:** `city` indexed, `migrate` 7 + 2 baru, `vercel-build` `sin1`, polling siap ganti Redis/Pusher.

**Roadmap 3 Sprint:** Sprint 1 Midtrans + Upstash + AuditLog, Sprint 2 Realtime + lokasi autocomplete, Sprint 3 CI+Sentry+Neon branch.

---

## 17. Timeline & Output

Guidebook: `Daftar 14-28 Juli → TM 31 Juli → Kumpul Drive 25-30 Aug → Seleksi 1-2 Sep → Final 7 Sep → Juara 8 Sep`.

Output: Prototype klikable `http://localhost:3000` + `https://jasakite.id` + Dokumen ini PDF + `vercel.json`.

---

## 18. Lampiran

- **Akun Demo (`password123`):** `admin@jasakite.id`, `budi.santoso@email.com` (Jakarta), `hendri.bangka@email.com` (Bangka), `lina.natuna@email.com` (Kepri), `dewi.lestari@email.com` (customer).
- **Env:** `DATABASE_URL=file:./dev.db | postgres://`, `AUTH_SECRET=openssl rand -base64 32`, `AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_SITE_URL=https://jasakite.id`.
- **Perintah:** `npm ci && npx prisma generate && npm run db:migrate && npm run db:seed && npm run dev`.

---

*Zero AI Slop — Setiap piksel punya alasan. Dibuat untuk 38 provinsi, dari Aceh hingga Papua.*
