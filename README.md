# JASAKITE

Marketplace jasa lokal untuk pasar Indonesia — pertemukan pelanggan dengan penyedia jasa di sekitarnya: jasa antar barang, jasa belanja, jasa pembayaran, dan jasa titip.

Dibangun dengan Next.js 15 App Router, React 19, Prisma, dan Tailwind CSS. Mencakup empat peran (customer, provider, admin, super admin) dengan alur pesanan penuh dari pemesanan hingga ulasan, escrow pembayaran QRIS, dompet saldo, dan **langganan penyedia Rp10.000/bulan** yang dipotong otomatis dari saldo.

> Panduan penggunaan lengkap (akun, seluruh alur, langganan, operasional, skenario demo 5 menit): **[docs/PANDUAN-LENGKAP.md](docs/PANDUAN-LENGKAP.md)** · versi PDF: `docs/PANDUAN-LENGKAP.pdf`
>
> Manual operasional per peran (klik demi klik untuk Customer, Provider, Admin, Super Admin — semua label tombol diverifikasi dari kode): **[docs/PANDUAN-PENGGUNA-PER-PERAN.md](docs/PANDUAN-PENGGUNA-PER-PERAN.md)** · versi PDF: `docs/PANDUAN-PENGGUNA-PER-PERAN.pdf`

```
Katalog  →  Checkout  →  Provider terima  →  Dikerjakan  →  Selesai  →  Ulasan
```

---

## Isi Dokumen

1. [Fitur](#fitur)
2. [Teknologi](#teknologi)
3. [Mulai Cepat](#mulai-cepat)
4. [Variabel Lingkungan](#variabel-lingkungan)
5. [Perintah npm](#perintah-npm)
6. [Struktur Proyek](#struktur-proyek)
7. [Model Data](#model-data)
8. [Rute Halaman](#rute-halaman)
9. [Rute API](#rute-api)
10. [Autentikasi & Otorisasi](#autentikasi--otorisasi)
11. [Rate Limiting](#rate-limiting)
12. [Sistem Desain](#sistem-desain)
13. [Pengujian](#pengujian)
14. [CI](#ci)
15. [Deployment](#deployment)
16. [Keputusan Teknis](#keputusan-teknis)
17. [Batasan yang Diketahui](#batasan-yang-diketahui)

---

## Fitur

### Untuk Pelanggan

- **Katalog dengan filter** — kategori, rentang harga, rating minimum, dan kota. Pencarian multi-kata mencocokkan judul, deskripsi, dan nama penyedia.
- **Detail jasa** — harga, estimasi pengerjaan, profil penyedia, ulasan asli, dan jasa serupa dari kategori yang sama.
- **Keranjang multi-item** — kumpulkan beberapa jasa sekaligus, atur jumlah tiap baris, lalu checkout tiga langkah (alamat → jadwal → bayar) yang menghasilkan satu grup pesanan.
- **Buku alamat** — simpan alamat bertanda default; kota wajib salah satu dari 7 kabupaten/kota Kepulauan Bangka Belitung.
- **Voucher & promo** — klaim voucher di checkout (server menghitung ulang potongannya), rail voucher dan banner promo di beranda.
- **Pelacakan pesanan** — kode pesanan (mis. `JK-23467`) plus linimasa bertahap dengan cap waktu: diterima, dikerjakan, selesai, dibatalkan.
- **Notifikasi** — lonceng navbar untuk kabar terbaru dan `/notifications` sebagai arsip lengkap dengan saran `Semua`/`Belum dibaca` dan tanda-baca massal.
- **Checkout** — catatan pesanan, pilihan metode pembayaran (simulasi), ringkasan harga.
- **Dashboard** — KPI ringkas, riwayat pesanan dengan status, dan daftar jasa yang disimpan.
- **Simpan jasa** — bookmark untuk dibandingkan nanti.
- **Ulasan** — rating 1–5 bintang plus komentar, hanya setelah pesanan selesai.
- **Pesan** — koordinasi jadwal dan alamat langsung dengan penyedia di halaman pesanan.

### Untuk Penyedia Jasa

- **Kanban pesanan** — tiga kolom (Menunggu → Dikerjakan → Selesai) dengan tombol kontekstual per kartu, tanpa perlu membuka halaman detail.
- **Kelola jasa** — buat jasa baru dengan pratinjau kartu langsung, tayangkan atau sembunyikan kapan saja.
- **Langganan penyedia** — Rp10.000 per 30 hari (harga diatur SUPER_ADMIN), dipotong otomatis dari saldo dompet lewat cron harian; tanpa langganan aktif, jasa tidak tayang dan tidak bisa dibuat.
- **Ringkasan pendapatan** — total dari pesanan yang selesai, jumlah pesanan menunggu tindakan, rating rata-rata.
- **Tabel riwayat** — tabel di desktop, kartu di mobile.

### Untuk Admin

- **Ringkasan platform** — KPI, grafik pesanan 14 hari, pendapatan per kategori, provider teratas.
- **Moderasi jasa** — tinjau jasa berstatus draf sebelum tayang ke publik.
- **Kelola pengguna** — cari akun, lihat statistik per pengguna.
- **Langganan penyedia** — SUPER_ADMIN mengubah harga bulanan dan menjalankan penagihan; ADMIN melihat status dan saldo semua penyedia.
- **Impersonasi** — masuk sebagai pengguna tertentu untuk melihat pengalaman mereka, dengan bar peringatan yang selalu tampak.
- **Ekspor CSV** — unduh data platform.

---

## Teknologi

| Lapisan | Pilihan |
|---|---|
| Framework | Next.js 15.5.24 (App Router, Server Components) |
| UI | React 19, Tailwind CSS 3.4, Radix UI primitives |
| Bahasa | TypeScript (strict) |
| Database | Prisma 5.22 + MongoDB Atlas (`ap-southeast-1`) — dev dan prod |
| Auth | NextAuth v5 beta — Credentials provider, sesi JWT 30d |
| State server | TanStack Query v5 (keepPreviousData) |
| Form | react-hook-form + Zod |
| Animasi | GSAP 3.15 + ScrollTrigger |
| 3D | React Three Fiber 9.7 + Three 0.185 (hero, lazy-loaded) |
| Grafik | Recharts (dynamic import) |
| Notifikasi | Sonner |
| Unit test | Vitest (263 tests) |
| E2E test | Playwright (chromium + mobile-320; iphone-se/WebKit opt-in `E2E_WEBKIT=1`) |

---

## Mulai Cepat

Prasyarat: Node.js 20+ dan npm.

```bash
git clone https://github.com/FerzDevZ/web-lomba.git
cd web-lomba
npm install
```

Buat berkas `.env` di root (lihat [Variabel Lingkungan](#variabel-lingkungan)):

```bash
# SQLite tidak lagi didukung: prisma/schema.prisma memakai provider = "mongodb".
# Dev: mongod lokal (atau cluster Atlas khusus pengembangan).
DATABASE_URL="mongodb://127.0.0.1:27017/jasakite"
# prod: DATABASE_URL="mongodb+srv://USER:PASS@ferz.bj80suv.mongodb.net/jasakite?retryWrites=true&w=majority&maxPoolSize=10"
AUTH_SECRET="ganti-dengan-hasil-openssl-rand-base64-32"
AUTH_TRUST_HOST=true
NEXTAUTH_URL="http://localhost:3000"
```

Siapkan database dan jalankan:

```bash
npx prisma generate
npx prisma db push      # samakan koleksi MongoDB dengan schema (bukan migrate)
npm run db:seed         # isi data contoh
npm run dev
```

Buka <http://localhost:3000>.

### Akun Contoh

Semua akun hasil seed memakai password `password123`.

| Peran | Email |
|---|---|
| Admin | `admin@jasakite.id` |
| Provider | `budi.santoso@email.com` |
| Customer | `dewi.lestari@email.com` |

Seed menghasilkan 34 pengguna (1 admin, 21 provider, 12 customer), 4 kategori, dan 30 jasa (28 aktif) yang tersebar di 7 kabupaten/kota Kepulauan Bangka Belitung.

---

## Variabel Lingkungan

Berkas `.env` tidak di-commit — ia berisi rahasia. Buat sendiri berdasarkan tabel ini.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | Ya | Connection string MongoDB. Dev: `mongodb://127.0.0.1:27017/jasakite`. Prod: `mongodb+srv://…` ke Atlas, sertakan `retryWrites=true&w=majority` dan `maxPoolSize` (default driver 100/instance terlalu besar untuk serverless). |
| `AUTH_SECRET` | Ya | Kunci penandatangan JWT. Hasilkan dengan `openssl rand -base64 32`. |
| `AUTH_TRUST_HOST` | Ya | Setel `true`. NextAuth v5 beta menolak start tanpa ini. |
| `NEXTAUTH_URL` | Dev | URL callback OAuth. Di produksi, gunakan `NEXT_PUBLIC_SITE_URL`. |
| `NEXT_PUBLIC_SITE_URL` | Produksi | URL kanonik publik, dipakai metadata, Open Graph, JSON-LD, sitemap, dan robots.txt. |
| `CRON_SECRET` | Ya (produksi) | Kunci `Authorization: Bearer` untuk `/api/cron/subscription` (penagihan langganan harian). Tanpa ini endpoint menjawab 503. Hasilkan dengan `openssl rand -hex 32`. |
| `PLATFORM_COMMISSION_PERCENT` | Tidak | Komisi platform dari nilai pesanan. Bawaan `10`, maksimum `50`. |

**Penting:** Di Vercel, setel `NEXT_PUBLIC_SITE_URL` ke `https://weblomba-rouge.vercel.app` untuk produksi dan preview. Tanpa variabel ini, seluruh metadata (Open Graph, JSON-LD, sitemap, robots.txt) menunjuk `http://localhost:3000` dan crawler tidak bisa mengambil preview. Aplikasi mencetak peringatan ke log bila ini terjadi — akibatnya tidak terlihat di UI, jadi jangan mengandalkan tampilan untuk mendeteksinya. Variabel ini di-Vercel disetel sebagai sensitive di environment vars prod+preview, bukan di `.env` (karena `.env` gitignored).

---

## Perintah npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server dengan hot reload. |
| `npm run build` | Build produksi. |
| `npm start` | Jalankan hasil build. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Unit test Vitest (sekali jalan). |
| `npm run test:watch` | Vitest mode watch. |
| `npm run test:e2e` | Playwright — build harus sudah ada. |
| `npm run test:e2e:ui` | Playwright dengan UI interaktif. |
| `npm run test:branding-dns` | Audit DNS domain merek (opt-in, butuh jaringan). |
| `npm run db:migrate` | `prisma migrate deploy`. |
| `npm run db:seed` | Isi database dengan data contoh. |
| `npm run db:backfill-city` | Turunkan `User.city` dari `User.location`. Idempoten; `--dry-run` untuk pratinjau. |
| `npm run admin:reset-totp` | Hapus pendaftaran 2FA satu SUPER_ADMIN (pemulihan perangkat hilang). Butuh `--db=` + `--yes`. |
| `npm run hooks:install` | Paksa sinkronkan guard `pre-push` ke **semua** salinan: direktori hook aktif (mengikuti `core.hooksPath`) dan `.git/hooks`, lalu keluar bukan nol bila masih ada yang berbeda. |
| `npm run hooks:check` | Periksa apakah guard `pre-push` yang dijalankan git sama dengan `scripts/githooks/pre-push`. Gagal bila drift. |

Guard `pre-push` dipasang otomatis oleh lifecycle `prepare` saat `npm install`, lalu memindai setiap commit yang benar-benar dikirim. Yang ditolak: GitHub PAT, AWS access key, private key PEM, URI MongoDB yang memuat user dan password (bentuk `DATABASE_URL` produksi), token Freebuff, serta **berkas `.env` yang ikut ter-commit** — `.env.example` dan templat serupa tetap diizinkan. Yang terakhir itu berbasis nama berkas, bukan isi, karena `git add -f` bisa melewati `.gitignore` dan isi `.env` yang “aman” tetap membawa `DATABASE_URL` serta `AUTH_SECRET`.

---

## Struktur Proyek

```
app/
├── (auth)/login, register       Halaman auth (route group, layout terpisah)
├── api/                         20 route handler
├── checkout/                    Alur pemesanan
├── dashboard/
│   ├── admin/                   Ringkasan, moderasi, pengguna
│   ├── customer/                Pesanan & jasa tersimpan
│   └── provider/                Kanban, kelola jasa
├── orders/[id]/                 Detail pesanan, timeline, pesan, ulasan
├── provider/[id]/               Profil penyedia publik
├── service/[slug]/              Detail jasa publik
├── services/                    Katalog dengan filter
├── faq/                         Pusat bantuan
├── layout.tsx                   Root layout, metadata, JSON-LD, footer
├── sitemap.ts, robots.ts        SEO
└── loading.tsx, error.tsx       Boundary per rute (semua rute punya)

components/
├── dashboard/                   Shell, skeleton, kartu statistik, grafik
├── landing/                     Hero, reveal, counter
├── layout/                      Navbar, footer bits, page shell, error panel
├── orders/                      Timeline, badge status, thread pesan, form ulasan
├── provider/                    Form buka jasa, daftar jasa, kanban
├── services/                    Kartu jasa, filter, tombol simpan, rating
├── three/                       Hero orb (WebGL)
└── ui/                          Primitives: button, card, input, dialog, dll.

lib/
├── api-guard.ts                 Pembungkus rate limit untuk route handler
├── auth.ts                      Konfigurasi NextAuth
├── location.ts                  Normalisasi alamat → nama kota
├── motion.ts                    Token durasi & easing animasi
├── order-status.ts              Mesin status pesanan (FSM)
├── prisma.ts                    Prisma client singleton
├── rate-limit.ts                Token bucket in-memory
└── site-url.ts                  Resolusi URL kanonik

prisma/
├── schema.prisma                Model data (MongoDB @id @default(auto()) @map("_id") @db.ObjectId) — SATU-SATUNYA schema
├── migrations/                  Riwayat migrasi (SQLite dev)
├── postgresql/                  Panduan & script migrasi ke PostgreSQL
├── seed.js                      Data contoh (30 jasa, 21 provider, 4 kategori, 7 kabupaten/kota)
└── backfill-city.js             Backfill kolom city

tests/                           Unit test Vitest (9 berkas, 149 test)
e2e/                             Playwright (10 berkas, 3 projects)
docs/                            Dokumentasi lengkap + PPT Swiss Orange 26 slides
```

---

## Model Data

Tujuh model inti + enam model pendukung keranjang/checkout. `schema.prisma` adalah satu-satunya sumber kebenaran — dulu ada salinan `schema.mongo.prisma` yang disalin menimpa schema asli saat build Vercel, dan salinan itu sempat tertinggal (model `OgPhotoPreflightSnapshot` hilang dari build produksi tanpa membuat build gagal). `tests/prisma-schema-parity.test.ts` menolak salinan schema yang berbeda maupun model yang dipakai kode tapi tidak ada di schema.

```
User ──┬── Service (provider)
       ├── Order (customer)
       ├── Review
       ├── Message
       ├── SavedService
       ├── Address          (buku alamat)
       ├── CartItem         (keranjang)
       └── Notification     (kotak masuk)

Category ── Service

Service ──┬── Order
          └── SavedService

Order ──┬── Review
        └── Message

Voucher ── VoucherRedemption     (klaim, kuota + per-user)
PromoBanner                      (rail promo beranda)
```

**User** — `role` bernilai `CUSTOMER`, `PROVIDER`, atau `ADMIN`. Dua kolom lokasi yang berbeda peran:

- `location` menyimpan alamat lengkap seperti yang ditulis penyedia (`"Jl. Braga No.45, Bandung"`) dan hanya untuk ditampilkan.
- `city` menyimpan nama kota yang sudah dinormalkan dan di-lowercase (`"bandung"`), dan inilah yang difilter.

Pemisahan ini bukan kerapian belaka. Filter katalog memakai `contains`, jadi mencocokkannya ke `location` membuat kueri `"Jl"` — atau bahkan satu huruf `"a"` — mengembalikan seluruh katalog. Nilai lowercase juga menghindari ketergantungan pada `mode: "insensitive"`, yang tidak didukung Prisma di SQLite dan akan membuat filter jadi case-sensitive begitu pindah ke PostgreSQL.

**Service** — `status` bernilai `ACTIVE`, `DRAFT`, atau `ARCHIVED`. Hanya `ACTIVE` yang tampil publik; `slug` unik dan dipakai di URL.

**Order** — `status` bernilai `PENDING`, `IN_PROGRESS`, `COMPLETED`, atau `CANCELLED`. Transisi dijaga FSM di `lib/order-status.ts`.

**Review** — satu ulasan per pesanan, hanya boleh dibuat pada status `COMPLETED`. Menulis ulasan memperbarui `ratingAvg` dan `totalReviews` pada jasa terkait.

---

## Rute Halaman

### Publik

| Rute | Isi |
|---|---|
| `/` | Landing: hero, kategori, jasa terbaru, statistik, CTA penyedia. |
| `/services` | Katalog dengan filter dan paginasi. |
| `/service/[slug]` | Detail jasa, ulasan, jasa serupa, JSON-LD. |
| `/provider/[id]` | Profil penyedia dan jasa yang ditawarkan. |
| `/faq` | Pusat bantuan dengan anchor per bagian. |
| `/login`, `/register` | Autentikasi. |

### Perlu Login

| Rute | Peran |
|---|---|
| `/dashboard` | Semua — mengalihkan sesuai peran. |
| `/dashboard/customer` | Customer |
| `/dashboard/provider` | Provider, Admin |
| `/dashboard/provider/buka-jasa` | Provider, Admin |
| `/dashboard/admin` | Admin |
| `/dashboard/admin/moderasi` | Admin |
| `/dashboard/admin/users` | Admin |
| `/checkout?service=<slug>` | Customer |
| `/checkout?from=cart` | Customer — checkout keranjang tiga langkah |
| `/keranjang` | Customer — keranjang belanja (noindex) |
| `/orders` | Customer — daftar pesanan dengan saran status (noindex) |
| `/orders/[id]` | Pihak yang terlibat saja |
| `/notifications` | Semua yang masuk — kotak masuk notifikasi (noindex) |

Setiap rute punya `loading.tsx` dan `error.tsx` sendiri.

---

## Rute API

Semua route handler kecuali `[...nextauth]` dilindungi rate limit.

### Publik

| Metode | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/services` | Daftar jasa. Query: `search`, `slug`, `category`, `minPrice`, `maxPrice`, `rating`, `location`, `sort`, `page`. |
| `GET` | `/api/services/[id]` | Satu jasa. |
| `GET` | `/api/services/resolve` | Keadaan satu slug (`active`/`inactive`/`missing`) untuk gerbang 404 middleware. Internal, tanpa rate limit. |
| `GET` | `/api/services/[id]/reviews` | Ulasan sebuah jasa. |
| `GET` | `/api/categories` | Semua kategori. |
| `GET` | `/api/search-suggestions` | Autocomplete pencarian. |
| `GET` | `/api/promos` | Banner promo aktif untuk rail beranda. |
| `POST` | `/api/auth/register` | Buat akun. Menurunkan `city` dari `location`. |

### Perlu Login

| Metode | Endpoint | Fungsi |
|---|---|---|
| `GET`/`POST` | `/api/orders` | Daftar / buat pesanan. `POST` menerima `serviceId` lama ATAU `items[]` (keranjang) + `voucherCode`. |
| `GET`/`PATCH` | `/api/orders/[id]` | Detail / ubah status (lewat FSM) + cap waktu tahap & notifikasi pihak lawan. |
| `GET`/`POST` | `/api/orders/[id]/messages` | Thread pesan. |
| `POST` | `/api/reviews` | Kirim ulasan. |
| `GET`/`POST`/`DELETE` | `/api/saved` | Jasa tersimpan. |
| `GET` | `/api/notifications` | Kotak masuk notifikasi (`?unread=1` untuk saran belum dibaca). |
| `PATCH` | `/api/notifications`, `/api/notifications/[id]` | Tandai semua / satu notifikasi sudah dibaca. |
| `GET`/`POST` | `/api/cart`, `/api/cart/[id]` | Keranjang: tambah baris, ubah qty, hapus. |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/addresses`, `/api/addresses/[id]` | Buku alamat; kota divalidasi ke 7 kabupaten/kota. |
| `GET`/`POST` | `/api/vouchers` | Klaim voucher (kuota + per-user dijaga CAS). |
| `POST` | `/api/vouchers/validate` | Cek voucher untuk checkout: diskon, alasan ditolak. |
| `POST` | `/api/services` | Buat jasa (provider). |
| `PATCH` | `/api/services/[id]` | Ubah jasa / status tayang. |
| `GET` | `/api/provider/orders` | Pesanan masuk (kanban). |
| `GET` | `/api/provider/services` | Jasa milik sendiri. |

### Admin

| Metode | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/admin/stats` | KPI platform & jasa draf. |
| `GET` | `/api/admin/users` | Daftar pengguna. |
| `GET` | `/api/admin/export` | Ekspor CSV. |
| `POST` | `/api/admin/users/[id]/impersonate` | Mulai impersonasi. |
| `POST` | `/api/auth/unimpersonate` | Kembali ke akun admin. |
| `GET`/`POST`/`PATCH` | `/api/admin/totp` | Status 2FA, mulai pendaftaran authenticator, konfirmasi kode. Hanya SUPER_ADMIN. |

---

## Autentikasi & Otorisasi

NextAuth v5 dengan Credentials provider dan sesi JWT. Password di-hash bcrypt (10 round).

Otorisasi berlapis dua, dan keduanya diperlukan:

**`middleware.ts`** memakai daftar-putih. Apa pun di luar `PUBLIC_PATHS` dialihkan ke `/login`, termasuk rute yang tidak ada — jadi struktur rute internal tidak terekspos. Middleware juga menegakkan peran: `/dashboard/provider` hanya untuk provider dan admin, `/dashboard/admin` hanya untuk admin.

**Route handler** memeriksa ulang kepemilikan di level data. Middleware tidak tahu bahwa pesanan #42 milik pengguna tertentu; hanya handler yang bisa memastikannya. Contoh: hanya provider pemilik jasa yang boleh mengubah status pesanan, dan hanya customer pemesan yang boleh menulis ulasan.

### 2FA TOTP untuk SUPER_ADMIN

Keputusan uang (verifikasi top-up, penarikan, pembayaran pesanan) membutuhkan dua hal: peran SUPER_ADMIN **dan** kode TOTP 6 digit pada permintaan itu sendiri. Cookie sesi saja tidak cukup, sehingga sesi yang dibajak tidak bisa mengkredit saldo.

- Pendaftaran: `/dashboard/admin/keamanan` → konfirmasi password → pindai QR → masukkan satu kode. Secret disimpan terenkripsi AES-256-GCM dengan kunci turunan `AUTH_SECRET`.
- Login SUPER_ADMIN ber-2FA menjadi dua langkah: password dulu, lalu kode. Langkah kedua hanya muncul setelah password benar.
- Satu kode hanya berlaku sekali (anti-replay). Kode juga ditolak bila langkah waktunya sudah dipakai untuk masuk.
- Lupa perangkat: `npm run admin:reset-totp <email> --db=<nama-db> --yes`. Setelah reset, akun bisa masuk tanpa kode tetapi **semua keputusan uang tetap ditolak** sampai authenticator baru didaftarkan.

### Impersonasi

Admin bisa masuk sebagai pengguna lain untuk mendiagnosis masalah. Sesi asli disimpan di dalam token, dan bar peringatan berwarna selalu tampil selama mode ini aktif. Tombol kembali memeriksa respons server sebelum mengalihkan — tanpa itu, kegagalan akan membuat admin mendarat di halaman pengguna sambil masih menyandang sesi orang lain tanpa tahu.

---

## Rate Limiting

Token bucket in-memory di `lib/rate-limit.ts`, dipasang lewat `lib/api-guard.ts`. Batasnya disesuaikan per jenis operasi:

| Operasi | Batas |
|---|---|
| Registrasi | 5 / jam |
| Buat pesanan | 10 / 10 menit |
| Ubah pesanan | 30 / 5 menit |
| Ulasan | 10 / jam |
| Pesan | 40 / menit |
| Baca (katalog, dll.) | 120 / menit |
| Ekspor admin | 5 / 5 menit |
| Impersonasi | 10 / jam |

Respons `429` menyertakan header `X-RateLimit-*` dan `Retry-After`.

Penyimpanan in-memory berarti batas ini berlaku per instance. Pada deployment serverless dengan banyak instance, gunakan penyimpanan bersama seperti Redis atau Upstash.

---

## Sistem Desain

Prinsip lengkapnya ada di `docs/PLANNING.md` dan `docs/PLANNING-UIUX.md`. Ringkasnya:

**Token warna semantik** di `app/globals.css` sebagai HSL, dipetakan ke Tailwind. Beberapa token punya varian `-strong` khusus untuk teks:

- `text-primary-strong` untuk teks oranye, bukan `text-primary`. Yang terakhir hanya 2.68:1 di light mode — gagal WCAG AA sebagai teks, dan hanya layak untuk isian solid berpasangan dengan `text-primary-foreground`.
- `text-destructive-strong` untuk teks merah, terutama di atas `bg-destructive/10`. Kombinasi dengan `text-destructive` hanya 4.11:1 di light dan 3.34:1 di dark.

`tests/color-contrast.test.ts` menghitung rasio kontras langsung dari `globals.css`, sehingga regresi token menggagalkan CI alih-alih diam-diam lolos ke produksi.

**Tipografi fluid** — skala `fontSize` di `tailwind.config.ts` memakai `clamp()`, jadi satu kelas mencakup mobile hingga desktop tanpa breakpoint manual. Menambahkan `md:text-4xl` di atas token yang sudah `clamp()` justru menimpanya dan mengembalikan dua ukuran diskrit.

**Aksesibilitas** — satu `h1` per halaman tanpa lompatan level, `CardTitle` merender heading sungguhan (default `h2`, dapat diubah lewat prop `as`), utility `.focus-ring` konsisten, `RadioCardGroup` dengan roving tabindex dan navigasi panah, serta dukungan `prefers-reduced-motion`. Struktur heading diverifikasi di E2E, bukan diasumsikan.

**Motion** — durasi dan easing terpusat di `lib/motion.ts`.

---

## Pengujian

### Unit — Vitest

```bash
npm test
```

18 berkas, 263 test. Fokus pada logika murni:

| Berkas | Cakupan |
|---|---|
| `color-contrast.test.ts` | Rasio kontras semua pasangan token, light & dark. |
| `order-status.test.ts` | FSM transisi status pesanan. |
| `order-code.test.ts` | Kode pesanan: format, karakter tak tertukar, fallback tabrakan. |
| `cart.test.ts` | Subtotal multi-item, batas qty/baris, pembagian diskon. |
| `vouchers.test.ts` | Kuota, per-user, jendela waktu, alasan ditolak. |
| `rate-limit.test.ts` | Token bucket, jendela waktu, header. |
| `location.test.ts` | Parsing alamat → kota, hitung kota unik. |
| `provinces.test.ts` | Cakupan 7 kabupaten/kota, filter lokasi, validasi kota alamat. |
| `rating.test.ts` | Agregasi rating. |
| `csv-escape.test.ts` | Escaping ekspor CSV. |
| `utils.test.ts` | Format mata uang dan helper. |
| `csrf.test.ts` | Double-submit CSRF helper. |
| `ids.test.ts` | Dual ID ObjectId/number (Mongo/SQLite). |
| `branding.test.ts` | Ekstraksi hostname brand (selalu jalan); audit DNS domain opt-in via `npm run test:branding-dns`. |

### E2E — Playwright

```bash
npm run build
npm run test:e2e
```

65 test di 14 berkas, terhadap build produksi (`npm run build:e2e` + `start:e2e`), bukan dev server — perilaku caching dan streaming keduanya berbeda, sehingga bug khas produksi bisa lolos kalau diuji lewat dev. Dua project aktif secara bawaan: `chromium` dan `mobile-320` (viewport Pixel 5). Project ketiga `iphone-se` memakai WebKit dan hanya aktif bila diunduh serta diminta eksplisit:

```bash
npx playwright install webkit   # sekali saja
E2E_WEBKIT=1 npm run test:e2e
```

`e2e/order-lifecycle.spec.ts` menjalankan siklus penuh: ambil jasa aktif milik provider uji, customer memesan, pesanan tampil sebagai PENDING, customer terbukti tidak bisa memajukan status sendiri, provider menerima dari kanban, provider menandai selesai, customer memberi ulasan.

`e2e/public-pages.spec.ts` memeriksa hal yang tidak bisa dibuktikan unit test: hero merender data dari database, struktur heading tanpa lompatan level, rute terproteksi mengalihkan, dan filter kota tidak lagi cocok pada penggal alamat.

`e2e/cart-checkout.spec.ts` menjalankan keranjang → checkout tiga langkah → pesanan terdaftar, sedangkan `e2e/notifications.spec.ts` menjalankan rantai peristiwa nyata: pesanan dibuat pelanggan, dipindah penyedia ke IN_PROGRESS, kabarnya muncul di `/notifications`, lalu saran `Belum dibaca` jadi kosong setelah tanda-baca massal. `e2e/home-superapp.spec.ts` menjaga rail beranda (promo, pintasan kategori, voucher, feed) tampil sesuai data API.

Catatan: di layar sempit kolom kanban menumpuk vertikal, jadi drag antar kolom diuji lewat jalur tombol `Terima & Kerjakan` pada project `mobile-320`.

E2E menambah data nyata (pesanan dan ulasan) setiap kali dijalankan. Jalankan `npm run db:seed` bila ingin keadaan bersih.

---

## CI

`.github/workflows/ci.yml` berjalan pada setiap push ke `main` dan setiap pull request, dengan dua job:

**`verify`** — `npm ci`, generate Prisma, `prisma db push` ke MongoDB service container (`mongo:7`), seed, typecheck, unit test, build, lalu smoke test HTTP terhadap server produksi. Audit DNS domain (`npm run test:branding-dns`) berjalan terpisah sebagai langkah non-blocking — domain belum terdaftar tidak boleh menyalakan CI. Langkah terakhir ini penting: build yang berhasil belum membuktikan halaman benar-benar bisa dirender. Kesalahan yang hanya muncul saat render — misalnya kueri Prisma di server component — hanya tertangkap dengan benar-benar meminta halamannya.

**`e2e`** — build lalu jalankan Playwright. Browser di-cache berdasarkan hash `package-lock.json`; tanpa itu setiap run menghabiskan menit hanya untuk mengunduh ulang ~130 MB. Trace dan laporan diunggah sebagai artifact bila ada kegagalan.

---

## Deployment

### Vercel + MongoDB Atlas

1. **Siapkan cluster Atlas** (cluster `ferz`, region `ap-southeast-1` Singapore — `ferz.bj80suv.mongodb.net`).
2. **Izinkan IP Vercel.** Function Vercel memakai egress IP dinamis, jadi Network Access perlu `0.0.0.0/0` selama tidak ada egress tetap. Kalau tidak ingin terbuka untuk semua IP, pakai Static IP/`Secure Compute` milik Vercel lalu daftarkan alamat itu. Ini juga berlaku untuk **build**: langkah build membaca database (lihat poin 5).
3. **Batas koneksi.** Driver MongoDB memakai `maxPoolSize` 100 per instance. Di serverless, instance yang menumpuk bisa menghabiskan batas koneksi Atlas dan mengubah error aplikasi menjadi *connection timeout* yang muncul di mana-mana. Setel eksplisit di `DATABASE_URL`, mis. `?retryWrites=true&w=majority&maxPoolSize=10` sesuai tier cluster.
4. **Setel environment variables di Vercel (Production + Preview, sensitive):**
   - `DATABASE_URL` — `mongodb+srv://USER:PASS@ferz.bj80suv.mongodb.net/jasakite?retryWrites=true&w=majority&maxPoolSize=10`
   - `AUTH_SECRET` / `NEXTAUTH_SECRET` — hasil `openssl rand -base64 32` (fallback `AUTH_SECRET ?? NEXTAUTH_SECRET`). Wajib ada juga saat build: `next build` mem-prerender kode yang menyentuh Auth.js.
   - `AUTH_TRUST_HOST` — `true`
   - `NEXT_PUBLIC_SITE_URL` — `https://weblomba-rouge.vercel.app` (jangan pakai `VERCEL_URL`)
5. **Build.** `npm run vercel-build` = `node scripts/vercel-preflight.js && prisma generate && NODE_ENV=production next build` (sudah dipakai `vercel.json`). Preflight itu sengaja hanya memeriksa — dulu ia **menyalin** `prisma/schema.mongo.prisma` menimpa `prisma/schema.prisma`, dan salinan yang tertinggal membuat Prisma Client produksi kehilangan model `OgPhotoPreflightSnapshot` tanpa build gagal. Sekarang ada satu schema, dan preflight menolak `DATABASE_URL` yang kosong/SQLite/PostgreSQL atau `directConnection=true` pada URI `+srv` dengan pesan yang menyebut penyebabnya.
6. **Rute yang menyentuh database saat build.** `sitemap.xml` (ISR 1 jam) membaca daftar jasa, dan `next build` akan membuatnya; kalau Atlas tidak terjangkau saat build, build gagal di situ, bukan menghasilkan sitemap kosong. Kartu Open Graph sudah `force-dynamic` (`/services`) atau bergantung parameter (`/service/[slug]`, `/provider/[id]`), jadi tidak ada angka yang dipanggang ke dalam build. Kartu `/services` juga memasang `cache-control: public, max-age=0, s-maxage=300, stale-while-revalidate=600` — bawaan Next untuk rute `opengraph-image` adalah `max-age=31536000, immutable` (terukur di `next start`), yang berarti kartu berisi angka platform disimpan setahun; `s-maxage` inilah yang dipakai CDN Vercel untuk menyimpan, dan 5 menit cukup untuk menyerap lonjakan crawler tanpa membuat angkanya basi.
7. Backfill kolom kota bila memigrasikan data lama: `npm run db:backfill-city`.
8. **Halaman admin Build & Deploy.** `/dashboard/admin/vercel` (ADMIN dan SUPER_ADMIN) menampilkan `ignoreCommand` beserta daftar pola pemicu build — dibaca dari `vercel.json` dan `lib/vercel-build-inputs.json`, berkas yang sama yang dipakai `scripts/vercel-ignore-build.js` — serta deployment produksi **dan preview** terakhir. Untuk data deployment, setel `VERCEL_TOKEN` (buat di vercel.com/account/tokens) dan `VERCEL_PROJECT_ID` (Project Settings → General); `VERCEL_TEAM_ID` hanya bila project berada di team. Tanpa variabel itu halaman tetap terbuka dan menampilkan variabel mana yang belum disetel, bukan data palsu. Token hanya dipakai di server (`/api/admin/vercel`) dan tidak ikut ke payload mana pun. Dengan token, halaman juga membaca isian **Ignored Build Step** di Project Settings (`commandForIgnoringBuildStep`): bila isian itu terisi dan berbeda dari `vercel.json`, halaman menandainya sebagai override, sebab setelan dashboard menimpa berkas repo dan berlaku sama untuk produksi maupun preview (`tests/vercel-deployments.test.ts` mengunci aturan ini, `e2e/admin-vercel.spec.ts` memastikan halamannya benar-benar ter-render untuk ADMIN).
9. **Status 404 rute jasa diputuskan middleware.** `/service/<slug>` yang tidak ada (atau berstatus bukan `ACTIVE` dan penontonnya bukan ADMIN) dijawab **404 sungguhan** oleh gerbang di `middleware.ts` — bukan lagi 200 berisi UI not-found. Gerbangnya bertanya ke `/api/services/resolve` (satu kueri berindeks, `select: { status: true }`), lalu me-rewrite permintaan ke path yang tidak cocok dengan rute mana pun sehingga Next sendiri yang menjawab 404. Kenapa harus di middleware: root layout membaca sesi, sehingga setiap rute dirender dinamis dan di-stream — header sudah terkirim sebelum `notFound()` di halaman dievaluasi. `notFound()` di `generateMetadata`, menghapus `loading.tsx`, dan `force-static` semuanya sudah diukur dan **tidak** mengubah status. Yang perlu dijaga saat mengubah rute ini: permintaan RSC/prefetch (`?_rsc=`, `next-router-prefetch`) sengaja dilewatkan gerbang, galat gerbang bersifat *fail open* (jangan pernah mengubah halaman sehat menjadi 404), dan `/service/<slug>/opengraph-image` tidak boleh ikut digerbangi. `tests/service-route-guard.test.ts` mengunci parsing path, `e2e/public-pages.spec.ts` mengunci status 404/200 beserta kartu OG.
10. **Build dilewati untuk perubahan non-aplikasi.** `vercel.json` memakai `ignoreCommand: node scripts/vercel-ignore-build.js`, yang membandingkan `VERCEL_GIT_PREVIOUS_SHA` (atau `HEAD^`) dengan `HEAD` dan hanya menjalankan build bila ada berkas yang masuk ke keluaran aplikasi (`app/`, `components/`, `lib/`, `prisma/`, `public/`, konfigurasi build, dan lockfile). Perubahan di `scripts/`, `tests/`, atau dokumentasi tidak lagi menghabiskan menit build. Arah defaultnya sengaja **build**: bila pembanding tidak tersedia, gerbang ini membangun daripada berisiko melewatkan deploy. Uji lokal: `node scripts/vercel-ignore-build.js; echo $?` (0 = dilewati, 1 = build).

Gunakan `NEXT_PUBLIC_SITE_URL`, bukan `VERCEL_URL`. Nilai `VERCEL_URL` berubah setiap deployment preview, sehingga URL kanonik dan tag Open Graph ikut berubah-ubah.

Menyiapkan koleksi MongoDB dari schema: `npx prisma db push` (bukan `prisma migrate` — provider Mongo tidak memakai direktori migrasi; `prisma/migrations/` adalah warisan era SQLite dan tidak dipakai).

### Migrasi SQLite → PostgreSQL

`prisma/postgresql/` berisi perangkat lengkapnya:

| Berkas | Fungsi |
|---|---|
| `MIGRASI_POSTGRESQL.md` | Panduan langkah demi langkah, pemetaan tipe data, troubleshooting. |
| `schema.sql` | Schema PostgreSQL (TEXT-based). |
| `schema_enums.sql` | Alternatif dengan ENUM dan trigger `updatedAt`. |
| `migrate_data.js` / `.py` | Script migrasi data, mendukung `--dry-run`. |
| `verify.sql` | Kueri verifikasi integritas pasca-migrasi. |
| `rollback.sql` | Kembalikan keadaan. |

---

## Keputusan Teknis

**Next.js 15, bukan 16.** Binary SWC Next.js 16 crash (SIGBUS) pada CPU Intel Skylake generasi ke-6, yang dipakai untuk pengembangan proyek ini.

**Prisma 5 dengan `new PrismaClient()` biasa.** Prisma 7 mewajibkan driver adapter untuk SQLite, yang menambah dua dependensi native tanpa manfaat untuk proyek ini.

**`city` sebagai kolom sendiri, bukan dihitung saat membaca.** Menormalkan alamat pada setiap request berarti menghitung ulang untuk ribuan baris hanya untuk memfilter. Kolom terpisah bisa diindeks (`@@index([role, city])`); nilai turunan diisi saat penulisan di API register dan seed.

**Aturan parsing lokasi tersalin di tiga tempat.** `lib/location.ts`, `prisma/backfill-city.js`, dan `prisma/seed.js` memuat logika yang sama karena dua yang terakhir berjalan sebagai Node polos tanpa build step dan tidak bisa mengimpor TypeScript. `tests/location.test.ts` adalah kontrak yang menjaga ketiganya sinkron — kalau aturannya berubah, ubah di tiga tempat itu sekaligus.

**Hero WebGL lazy-loaded.** Bundle three.js sekitar 227 KB gzip, tapi tidak ada di manifest awal — dimuat lewat `next/dynamic` setelah halaman interaktif, sehingga tidak menyentuh Core Web Vitals. Cincin konsentris CSS memberi bentuk pada area itu bahkan sebelum WebGL memuat atau kalau perangkat tidak mendukungnya.

**Ekstraksi komponen dipicu bug, bukan estetika.** Halaman `buka-jasa` dipecah dari 464 baris ke 81 karena saat memisahkannya ditemukan bahwa `toggleStatus` mengabaikan `res.ok` sepenuhnya — kegagalan server tampak seperti sukses. Kanban provider diekstrak karena komponen aslinya tidak pernah diimpor oleh siapa pun sehingga fiturnya tidak pernah tampil.

---

## Batasan yang Diketahui

**Status 404 hanya untuk rute detail jasa.** `/provider/<id>` yang tidak ada masih dijawab 200 berisi UI not-found, karena alasan yang sama (render dinamis + streaming). Gerbang yang sama bisa dipasang untuk rute itu — `lib/service-route-guard.ts` tinggal diberi pola path kedua — tapi belum dikerjakan supaya perubahan ini tetap terbatas pada satu rute.

**Rate limit global memakai MongoDB, dengan dua konsekuensi yang perlu diketahui.** Hitungannya kini dibagi semua instance (`RateLimitBucket`, satu `findAndModify` atomik per permintaan), jadi kuota tidak lagi berlipat mengikuti jumlah lambda. Tapi: (1) jendelanya tetap, bukan token bucket, sehingga pemakaian bisa mencapai 2× limit tepat di perbatasan dua jendela; (2) setiap permintaan yang dibatasi menambah satu operasi tulis ke database — pada volume tinggi, Redis/Upstash adalah penggantinya (cukup ganti `consumeGlobal`, pemanggil tidak berubah). Kalau database tidak terjangkau, limiter jatuh ke bucket per proses dan mencatat peringatan: gangguan kecil tidak berubah menjadi pemadaman.

**Pembayaran masih simulasi.** Pilihan metode pembayaran tersimpan di pesanan, tapi tidak ada integrasi payment gateway.

**Notifikasi lonceng memakai SSE; halaman arsipnya masih HTTP.** Lonceng navbar menumpang stream `/api/messages/stream` (satu koneksi per tab, berbagi dengan badge pesan) dan menerima event `notifications` setiap 20 detik bila isinya berubah — bukan polling 60 detik lagi. `/notifications` tetap memuat data lewat HTTP biasa, dan interval 60 detik hanya hidup kalau stream gagal total. Baris notifikasi ditulis oleh server SETELAH transaksi pesanan commit (`lib/notifications.ts`), dan kegagalan menulis notifikasi tidak pernah membatalkan operasi utamanya.

**Filter kota memakai `contains`, bukan kecocokan tepat.** Artinya `"jakarta"` juga mencocokkan `"jakarta selatan"`. Ini disengaja agar pencarian sebagian tetap berguna, tapi bukan pencocokan wilayah administratif yang presisi.

**E2E mengubah data.** Setiap kali dijalankan, siklus pesanan menambah pesanan dan ulasan baru ke database.

---

## Lisensi

Belum ditentukan.
