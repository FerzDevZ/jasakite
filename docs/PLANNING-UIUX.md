# JASAKITE — Konsep UI/UX Dashboard per Role
### (Revisi: referensi nyata, modern, zero AI slop)

Dokumen ini menggantikan pendekatan "satu halaman dashboard dengan tab" menjadi
**dashboard terpisah per role** (Admin / Penyedia Jasa / Customer), masing-masing
dirancang dari produk nyata yang paling sukses di kelasnya.

---

## 1. Referensi Nyata yang Dijadikan Acuan

| Produk | Konteks | Yang Diadopsi untuk JASAKITE |
|---|---|---|
| **Stripe Dashboard** | Pembayaran & metrik | Kartu KPI dengan label kontekstual, angka pendapatan sebagai hero, tabel ringkas |
| **Vercel Dashboard** | Deployment & monitoring | Sidebar kiri + header kontekstual, daftar ringkas dengan status pill, spasi luas |
| **Linear** | Issue tracking | Kanban yang tenang, mikro-interaksi presisi, easing expo, mode gelap hangat |
| **Shopify Admin** | E-commerce | Struktur nav per fungsi, metrik penjualan, tabel order dengan aksi inline |
| **Fiverr Seller Dashboard** | Marketplace jasa | Fokus pendapatan + gig management, tab Pesanan Aktif/Selesai, statistik rating |
| **Airbnb Host Dashboard** | Ekonomi gig | Ringkasan pendapatan periodik, kalender/status, CTA "tindakan berikutnya" |
| **Gojek/Grab Driver App** | Jasa lokal Indonesia | Angka pendapatan hari ini besar, tugas segera (pending), bahasa lokal |
| **HubSpot / Zendesk** | Helpdesk | Tabel dengan filter status, badge warna status, empty state yang membimbing |
| **PostHog / Amplitude** | Analitik | Grafik area (trend) + bar (perbandingan), insight dalam 1 layar tanpa scroll |
| **Notion** | Workspace | Sidebar dengan grouping, user section di bawah, navigasi keyboard |

**Prinsip lintas referensi:**
1. Setiap role melihat **hanya** yang relevan untuknya — tidak ada tab yang
   mencampur role (keputusan arsitektural, bukan sekadar kosmetik).
2. **Angka uang adalah hero** di dashboard transaksional (Fiverr, Airbnb, Gojek).
3. Status selalu berupa **badge/pill berwarna konsisten** (Vercel, HubSpot).
4. Setiap dashboard punya **satu "tindakan berikutnya" yang jelas**.
5. Grafik hanya dipakai admin (postingan Stripe/PostHog); provider & customer
   cukup angka + daftar.

---

## 2. Arsitektur Navigasi (Dashboard Shell)

Semua dashboard memakai **shell yang sama** tapi **isi navigasi berbeda per role**:

```
┌──────────┬──────────────────────────────────────────┐
│ SIDEBAR  │  HEADER (judul halaman + aksi kontekstual)│
│ (240px)  │                                          │
│ logo     │                                          │
│ ──────── │                                          │
│ NAV role │                                          │
│  • item  │            KONTEN ROLE                    │
│  • item  │                                          │
│ ──────── │                                          │
│ USER     │                                          │
│ card     │                                          │
└──────────┴──────────────────────────────────────────┘
```

- **Desktop**: sidebar tetap (Stripe/Vercel), `border-r`, `bg-card`, nav active
  dengan `bg-primary/10 + text-primary + glow tipis`.
- **Mobile**: sidebar berubah jadi baris nav horizontal yang bisa di-scroll di
  bawah header (pola aplikasi fintech lokal).
- Role diputuskan di **server layout** (`auth()`), bukan di client.

### Navigasi per role

| Role | Nav | "Tindakan berikutnya" utama |
|---|---|---|
| **ADMIN** | Ringkasan · Moderasi Jasa · (Pesanan) | Aktifkan jasa draft yang menunggu moderasi |
| **PROVIDER** | Ringkasan · Pesanan · Kelola Jasa | Terima pesanan pending / buat jasa baru |
| **CUSTOMER** | Ringkasan · Pesanan Saya | Pantau pesanan berjalan / beri rating |

---

## 3. Dashboard Admin (referensi: Stripe + PostHog + Vercel)

**Tujuan**: kesehatan platform dalam satu layar; moderasi konten.

**Zona (top → bottom):**
1. **KPI row (5 kartu)**: Pengguna (sub: +N provider aktif) · Pesanan (sub:
   breakdown status) · Pendapatan (sub: pesanan selesai) · Jasa aktif (sub:
   rata-rata rating) — angka hero besar, label kecil, ikon kotak.
2. **Grafik kiri**: **Area chart** — pesanan 14 hari terakhir (PostHog style).
3. **Grafik kanan**: **Bar chart** — pendapatan per kategori (Stripe style).
4. **Moderasi**: daftar jasa `DRAFT` dengan tombol **Aktifkan** inline
   (satu-klik, tanpa reload — invalidate query). Empty state: "Tidak ada jasa
   menunggu moderasi."
5. **Tabel pesanan terbaru** (8 baris): jasa, customer, provider, status pill,
   nominal — klik baris → `/orders/[id]`.
6. **Top 5 provider**: nama, pesanan selesai, pendapatan (Gojek leaderboard vibe).

**Motion**: KPI counter naik (GSAP Counter), grafik `animate` bawaan recharts,
baris tabel hover `bg-accent`.

**Hanya admin yang melihat**: total pendapatan platform & data lintas user.

---

## 4. Dashboard Provider (referensi: Fiverr Seller + Linear kanban + Gojek)

**Tujuan**: uang & pesanan. "Berapa yang saya dapat, apa yang harus saya
kerjakan sekarang."

**Zona:**
1. **Baris pendapatan hero**: Pendapatan selesai (bulan berjalan, besar) ·
   Pesanan menunggu (aksi!) · Dikerjakan · Selesai. Kartu menunggu memakai
   aksen oranye + glow agar mata tertuju ke aksi.
2. **Kanban 3 kolom** (Linear/Fiverr): Menunggu → Dikerjakan → Selesai, dengan
   kartu berisi judul jasa, #id, catatan, tombol kontekstual
   ("Terima & Kerjakan" / "Tandai Selesai").
3. **Kelola Jasa** (masuk via nav): daftar jasa sendiri dengan toggle
   Tayang/Sembunyikan, pratinjau, jumlah pesanan.
4. **Tabel riwayat**: mobile → kartu, desktop → tabel (sudah ada).
5. **Onboarding checklist** bila belum punya jasa/pesanan (sudah ada).

**Yang sengaja TIDAK ada**: data platform, data customer lain, total uang
platform — privasi antar-provider.

---

## 5. Dashboard Customer (referensi: Gojek order history + Fiverr buyer)

**Tujuan**: "pesanan saya di mana, kapan selesai, apakah perlu review."

**Zona:**
1. **KPI ringkas**: Total pesanan · Sedang berjalan · Selesai · Total belanja.
2. **Daftar pesanan** (bukan kanban — customer tidak mengelola status): kartu
   dengan status pill, provider, rating, nominal; klik → detail.
3. **CTA review** muncul di status COMPLETED (bawa ke `/orders/[id]`).
4. **Empty state** membimbing ke katalog: "Belum ada pesanan — jelajahi jasa".

**Yang sengaja TIDAK ada**: kanban, pendapatan, kelola jasa.

---

## 6. Aturan Visual Bersama (masih mengikuti tokens F0–F5)

- Sidebar & header: `bg-card`, border `border-border`, teks `muted-foreground`.
- Active nav: `bg-primary/10 text-primary` + ikon tetap 1:1.
- Status pill: PENDING outline · IN_PROGRESS secondary · COMPLETED primary ·
  CANCELLED destructive (konsisten di semua role).
- Semua angka pakai `tabular-nums` (agar kolom uang sejajar — Stripe).
- Motion: reveal seksi via `Reveal` (GSAP, reduced-motion aman), counter KPI.
- Skeleton shimmer saat loading (bukan spinner full-page di dashboard).

---

## 7. Anti-Slop Checklist (khusus dashboard)

- [ ] Tidak ada tab role campur dalam satu halaman
- [ ] Admin melihat pendapatan platform; provider/customer tidak
- [ ] Setiap kartu punya sub-label yang menjelaskan cakupan (bulan berjalan, dst.)
- [ ] Status konsisten 4 warna di semua role
- [ ] Angka uang = hero, bukan ikon
- [ ] Mobile: tabel → kartu; sidebar → nav horizontal
- [ ] Loading = skeleton, error = state dengan tombol ulang
