# JASAKITE — Master Plan Desain Ulang (v2 "Titik Terang")

> Prinsip utama: **Zero AI Slop.** Setiap piksel punya alasan. Setiap animasi punya
> tujuan. Tidak ada emoji, tidak ada gradien ungu generik, tidak ada kartu berjejer
> tanpa hierarki. Ini produk, bukan template.

---

## 1. Visi & Arah Visual

JASAKITE adalah marketplace jasa lokal. Emosi yang ingin dibangun: **percaya,
hangat, dan tegas**. Hangat karena ini bisnis tetangga; tegas karena ini platform
transaksi.

Metafora visual: **"Titik Terang"** — cahaya oranye hangat di tengah kegelapan
kota. Di sinilah tema oranye + hitam lahir:

- **Hitam pekat (bukan abu-abu)**: fondasi yang berani dan premium.
- **Oranye menyala**: energi, aksi, dan kehangatan. Titik fokus di mana pun ia muncul.
- **Krem/off-white hangat** untuk mode terang — bukan putih murni yang klinis,
  melainkan putih yang terasa seperti kertas dan lampu kota.

Dua mode penuh (bukan sekadar "dark mode ala kadarnya"): token terpisah untuk
keduanya, kontras WCAG AA/AAA di tiap mode, dan elemen yang dirancang dua kali.

---

## 2. Referensi (diteliti, bukan ditebak)

| Sumber | Yang diadopsi |
|---|---|
| **Fiverr (redesign 2024–2026)** | Struktur katalog jasa, harga sebagai elemen utama, sticky order box |
| **Thumbtack / TaskRabbit / Urban Company** | Mental model marketplace jasa lokal: kategori konkret, est. harga, rating sosial |
| **Linear** | Easing `expo-out`, mikro-interaksi yang presisi, mode gelap yang hangat |
| **Vercel / Framer** | Tipografi editorial, grid noise halus, glow yang disiplin |
| **Stripe** | Kedalaman lewat bayangan berlapis & hierarki harga, bukan lewat dekorasi |
| **Raycast / Read.cv** | Glassmorphism yang fungsional, kbd hints, panel yang ringan |
| **Untitled UI / shadcn/ui** | Disiplin token, konsistensi radius/spacing, komponen yang dapat dipakai ulang |
| **Awwwards "Modern Marketplace" winners** | Hero editorial, angka statistik besar, seksi CTA berani |

**Anti-referensi (AI slop) — dilarang keras:**
- Gradien ungu-biru-toska (kombinasi default model AI)
- Emoji sebagai ikon produk
- `rounded-2xl` tanpa hierarki shadow
- Filler copy Indonesia yang kosong ("layanan ini cocok untuk kebutuhan Anda")
- Grid 6 kartu identik tanpa variasi komposisi
- Semua elemen center + simetris sempurna tanpa ketegangan visual

---

## 3. Design Tokens (single source of truth)

### 3.1 Warna — Light Mode (`light`, default hangat)

| Token | HSL | Hex | Peran |
|---|---|---|---|
| `background` | `40 33% 98%` | `#FBFAF8` | Kanvas krem hangat |
| `foreground` | `20 14% 4%` | `#0C0A09` | Hampir hitam, bukan hitam murni |
| `card` | `0 0% 100%` | `#FFFFFF` | Permukaan |
| `primary` | `25 95% 53%` | `#F97316` | Oranye aksi |
| `primary-foreground` | `40 33% 98%` | `#FBFAF8` | Teks di atas oranye |
| `secondary` | `25 40% 22%` | `#4A2C14` | Oranye gelap (hover, aksen) |
| `accent` | `40 60% 94%` | `#F7EFE4` | Wash oranye-krem |
| `muted` | `40 20% 94%` | `#F1EDE6` | Area redup |
| `muted-foreground` | `25 8% 40%` | `#6E665D` | Teks sekunder |
| `border` | `35 20% 88%` | `#E8E1D6` | Garis lembut |
| `destructive` | `0 72% 51%` | `#DC2626` | Error |

### 3.2 Warna — Dark Mode (`dark`, default untuk kesan premium)

| Token | HSL | Hex | Peran |
|---|---|---|---|
| `background` | `20 14% 4%` | `#0B0A09` | Hitam hangat (bukan #000 murni) |
| `foreground` | `40 20% 96%` | `#F5F1EA` | Krem terang |
| `card` | `24 10% 7%` | `#14110E` | Permukaan gelap |
| `primary` | `28 96% 58%` | `#FB7A23` | Oranye menyala (kontras di gelap) |
| `primary-foreground` | `20 14% 4%` | `#0B0A09` | Hitam di atas oranye |
| `accent` | `24 12% 13%` | `#24201B` | Wash oranye gelap |
| `muted` | `24 8% 11%` | `#1E1B17` | Area redup |
| `muted-foreground` | `30 8% 58%` | `#A29A90` | Teks sekunder |
| `border` | `24 8% 16%` | `#2B2722` | Garis halus di gelap |
| `destructive` | `0 70% 55%` | `#E5484D` | Error (terang di gelap) |

Aturan kontras: `primary` dipakai untuk teks/ikon di atas latar gelap hanya dalam
ukuran ≥ 1rem dan weight ≥ 600; selain itu pakai tone yang lebih terang
(`text-primary` pada latar gelap menggunakan varian `--primary-strong`).

### 3.3 Tipografi

- **Font**: Plus Jakarta Sans (Google Fonts via `next/font`) — geometris, hangat,
  sangat terbaca di layar, dan terasa Indonesia tanpa klise.
- Skala (clamp responsive):

| Role | Ukuran | Tracking | Weight |
|---|---|---|---|
| Display/Hero | `clamp(2.5rem, 6vw, 4.5rem)` | `-0.04em` | 800 |
| H2 seksi | `clamp(1.75rem, 3vw, 2.5rem)` | `-0.03em` | 700 |
| H3 kartu | `1.125rem` | `-0.01em` | 700 |
| Body | `0.9375rem` | `0` | 400 |
| Caption/label | `0.8125rem` | `0.01em` | 500 |
| Angka statistik | `clamp(2rem, 4vw, 3rem)` | `-0.03em` | 800 |

- Aksen editorial: kata kunci di headline memakai **serif italic** (Georgia/`font-serif italic`) berwarna oranye — teknik Framer/Linear untuk kedalaman tanpa gambar.

### 3.4 Radius, Shadow, Spacing

- Radius: `sm 8px / md 12px / lg 16px / xl 24px` (card utama `xl`, kontrol `md`).
- Shadow berlapis (light): `0 1px 2px rgba(12,10,9,.04), 0 8px 24px rgba(12,10,9,.06)`.
- Shadow berlapis (dark): `0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.5)`.
- Glow oranye (hanya untuk elemen fokus & CTA hero):
  `0 0 0 1px rgba(251,122,35,.2), 0 8px 32px rgba(251,122,35,.25)`.
- Spacing: basis 4px; ritme seksi `py-20 md:py-28`; ritme grid `gap-4/6/8`.
- Layout max `max-w-7xl`; konten editorial kadang sengaja tidak center.

### 3.5 Motion System

| Skala | Durasi | Easing | Kegunaan |
|---|---|---|---|
| Mikro (hover, tap) | 150–200ms | `cubic-bezier(.25,.1,.25,1)` | Button, link, ikon |
| Meso (masuk/keluar, tab) | 250–350ms | `cubic-bezier(.16,1,.3,1)` (expo-out) | Card, dropdown, panel |
| Makro (hero, seksi) | 600–1000ms | `cubic-bezier(.16,1,.3,1)` | Reveal scroll, GSAP timeline |

- **GSAP** (installed): ScrollTrigger untuk reveal seksi, counter statistik,
  timeline hero, parallax float cards.
- **Framer Motion** (installed): mikro-interaksi komponen, theme toggle, tabs.
- **React Three Fiber + drei** (installed): satu elemen 3D hero — orbs oranye
  melayang dengan material distort — bukan model 3D gimmick.
- `prefers-reduced-motion`: semua animasi non-esensial dimatikan (GSAP `matchMedia`).

---

## 4. Strategi 3D & Hero

Hero landing = layar pembuka yang menentukan kesan. Komposisi:
- **Kiri (teks)**: badge, headline editorial (serif italic accent), subcopy,
  search bar besar bergaya command, pills kategori, stats dengan counter.
- **Kanan (3D)**: `<Canvas>` R3F dengan `Float` + `MeshDistortMaterial` — orbs
  oranye menyala dengan tone hitam/abu hangat, pencahayaan ambient + point light
  oranye. Hanya dimuat client-side (`dynamic ssr:false`) agar LCP tidak terganggu.
- **Lapisan**: grid pattern + noise halus di background; dua glow radial oranye
  di kiri-atas dan kanan-tengah.
- Scroll: orb paralaks (GSAP) + floating glass card statistik yang ikut bergerak.

---

## 5. Komponen (inventory & spesifikasi)

| Komponen | Sebelum (slop) | Sesudah (v2) |
|---|---|---|
| Button | default shadcn | primary solid oranye, hover naik 1px + glow; outline halus; ghost untuk nav |
| Navbar | putih polos | glass (`backdrop-blur-xl` + border tipis), logo mark oranye, search dengan `/` hint, toggle tema, menu mobile sheet |
| Hero card | gradien biru | latar gelap, orb 3D, editorial headline, search command |
| Service card | emoji `🛠️` | ikon Lucide per kategori, area visual dengan gradien khas kategori + watermark ikon, hover lift + shadow, harga besar |
| Badge rating | polos | pill emas-amber konsisten, angka + jumlah ulasan |
| Kanban dashboard | 3 kolom polos | kolom dengan header dot status + count badge, kartu order dengan notes & CTA kontekstual |
| Stat card | ikon kotak generik | angka besar + label kecil + delta/trend |
| Tema | tidak ada | toggle sun/moon, persist localStorage, ikut sistem default |

---

## 6. Halaman per Halaman

1. **Landing** — hero gelap + 3D → kategori (bento 6, hover glow) → jasa terbaru
   (grid 3 kolom asimetris, kartu pertama lebih besar) → "cara kerja" 3 langkah
   bernomor editorial → trust/statistik → CTA band oranye gelap.
2. **Catalog `/services`** — sidebar filter kaca (sticky), hasil grid dengan
   skeleton halus, sort custom select, empty state bergambar ikon (bukan teks saja).
3. **Detail `/service/[slug]`** — galeri/visual utama, sticky order box dengan
   hierarki harga, tabs (deskripsi/ulasan/provider) dengan transisi halus,
   ulasan nyata dengan avatar & tanggal (hapus placeholder copy).
4. **Checkout** — ringkasan kiri / pembayaran kanan, metode bayar radio custom,
   state sukses dengan konfeti subtil (GSAP), trust badges.
5. **Dashboard** — statistik atas (4 kartu), kanban 3 kolom, tabel riwayat,
   semuanya otomatis ikut dark/light token.
6. **Auth** — kartu center minimal, pilihan role sebagai segmented control besar.

---

## 7. Kinerja & Aksesibilitas

- Bundle 3D hanya di landing & hanya client (`ssr:false`), lazy-loaded.
- Font `next/font` self-hosted, `display: swap`.
- Semua teks ≥ 4.5:1 terhadap latar (checklist kontras di kedua mode).
- Focus ring oranye konsisten; skip-link; aria-label untuk ikon murni.
- Scrollbar custom tipis; selection warna oranye.

---

## 8. Roadmap Eksekusi

| Fase | Isi | Status |
|---|---|---|
| **F0 — Fondasi** | Planning, install gsap/R3F/three, token warna+font, globals, theme provider | ✅ |
| **F1 — Sistem** | tailwind.config, globals.css (light+dark), ThemeProvider, layout, Navbar v2 | ✅ |
| **F2 — Landing** | Hero 3D + GSAP, kategori bento, jasa terbaru, cara kerja, trust, CTA | ✅ |
| **F3 — Katalog & Detail** | Filter glass, kartu jasa v2 (no emoji), detail page polish, dark-mode audit, filter lokasi, jasa serupa, SEO per halaman | ✅ |
| **F4 — Dashboard & Checkout** | Buka Jasa (form+kelola), review flow, detail pesanan, onboarding provider, tabel mobile, notifikasi polling, shortcut "/", transisi halaman | ✅ |
| **F5 — Ops** | Prisma Migrate, seed realistis (24 jasa/99 order/57 review), review window 60 hari, lokasi wajib provider, sitemap+robots, rating helper terpusat | ✅ |
| **F6 — Produksi** | FSM status pesanan + guard transisi, rate limiting Token Bucket per-endpoint, security headers, tes otomatis Vitest, metadata/OG/JSON-LD lengkap, skip-link a11y | ✅ (kecuali deploy) |
| **F7 — Deploy** | Vercel + Turso/Neon, notifikasi WebSocket | ⏸ ditunda (permintaan user) |

### Catatan F6

- **FSM pesanan** (`lib/order-status.ts`): `PENDING → IN_PROGRESS → COMPLETED`,
  pembatalan hanya dari state non-terminal. `COMPLETED`/`CANCELLED` terminal, jadi
  `completedAt` tidak pernah tertimpa dan jendela ulasan 60 hari tidak bisa direset.
  Ditegakkan di server (`PATCH /api/orders/[id]`, 409 bila ilegal) dan di UI
  (tombol transisi ilegal tidak dirender).
- **Rate limiting** (`lib/rate-limit.ts` + `lib/api-guard.ts`): Token Bucket
  in-memory, kunci per-user (fallback IP dari `x-forwarded-for`), header
  `RateLimit-*` + `Retry-After`. Terpasang di **19/19 route handler** (kecuali
  `[...nextauth]` yang dikelola Auth.js) — endpoint tulis maupun baca.
  Diverifikasi live: `POST /api/auth/register` menolak di request ke-6
  (429 + `retry-after`), `GET /api/search-suggestions` menolak setelah 60 hit
  dalam satu menit.
  **Batasan**: state per-proses — pada deploy multi-instance kuota efektif
  = limit × jumlah instance. Ganti `consume()` dengan Redis saat produksi.
- **CSV export hardening** (`app/api/admin/export/route.ts`): sel yang dimulai
  `= + - @` tab/CR diprefiks apostrof untuk mencegah formula injection saat
  dibuka di Excel/Sheets; angka murni dikecualikan agar kolom harga tetap
  numerik. Batas ekspor 5×/5 menit karena memuat seluruh tabel order.
- **Security headers** (`next.config.mjs`): `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS,
  `Cache-Control: no-store` untuk `/api/*`. CSP belum aktif (butuh nonce
  per-request karena inline hydration script Next.js).
- **Tes** (`npm test`, Vitest): 41 tes untuk FSM, rate limiter, agregat rating,
  escaping CSV, dan util format. Murni unit — belum ada E2E/integrasi DB.
- **SEO/GEO**: `metadataBase`, OG/Twitter global, `app/icon.tsx` +
  `app/opengraph-image.tsx` (Satori, 1200×630), JSON-LD `Organization` +
  `WebSite` + `SearchAction` di root, `FAQPage` di `/faq`, `noindex` untuk
  dashboard dan halaman auth.

---

## 9. Checklist Anti-Slop (wajib lolos sebelum disebut "selesai")

- [x] Tidak ada emoji di UI — `app/error.tsx` pakai `AlertTriangle`, footer pakai `Mail`/`HelpCircle`
- [x] Tidak ada gradien biru/ungu generik — logo Navbar `from-primary to-amber-500`
- [x] Setiap ikon = Lucide, setiap ikon punya peran
- [x] Dark & light mode keduanya dikerjakan (bukan default)
- [x] Kontras teks lolos WCAG AA di kedua mode
- [x] Animasi punya easing & durasi konsisten + reduced-motion
- [x] Copywriting Indonesia yang nyata (bukan filler)
- [x] Hierarki harga/CTA jelas di tiap halaman transaksional
- [x] Build + tipe bersih (`npm run build`, `npx tsc --noEmit`, `npm test` — 41/41)
- [x] Skip-link "Lewati ke konten utama" + `<main id="konten-utama">`
