# Outline PDF Dokumen Penjelasan — JASAKITE (EMOSTFET 11)

> Sesuai output Guidebook: Latar belakang, Target pengguna, User flow, Penjelasan solusi desain. 8-10 halaman, A4, export PDF.

## Hal 1 — Cover
- Judul: **JASAKITE — Marketplace Jasa Lokal Nasional**
- Sub: *Designing Impactful Digital Solutions for Everyday Life*
- Visual: hero screenshot (oranye+hitam, 38 provinsi pill)
- Tim, 30 Aug 2025, jasakite.id

## Hal 2 — Latar Belakang Masalah (Pemahaman 20%)
- Foto chat WA grup "cari kurir / juru belanja" vs screenshot kosong.
- Data: 70% jasa lokal masih mulut-ke-mulut, tidak ada harga/rating (riset 15 wawancara kecil).
- Pain 3: banding harga susah, takut ditipu, provider Bangka Belitung tidak ditemukan nasional.

## Hal 3 — Target Pengguna (Persona)
- **Citra, 28, Ibu RT Bangka Belitung**: butuh bersih rumah mingguan, takut provider tidak datang.
- **Hendri, 35, Provider Pangkal Pinang**: sepi order, hanya andalkan spanduk.
- **Sari, 22, Mahasiswa Bandung**: butuh antar dokumen cepat, banding harga.
- Tabel Role: Customer / Provider / Admin (kebutuhan berbeda → dashboard terpisah).

## Hal 4 — User Flow (1 diagram)
```
Landing (search + pills Pangkal Pinang) → Catalog ?location=Bangka → Detail ?tab=reviews → Checkout (alamat + deadline chips) → Orders timeline + chat → Dashboard Kanban drag → Ulasan → ratingAvg
```
- Panah + screenshot kecil per step.

## Hal 5 — Solusi Desain: Katalog & Detail
- Filter `city` lowercase (bukan `mode:insensitive`), `contains` → `bangka` cocok `Kepulauan Bangka Belitung`.
- `ServiceTile` harga hero, `Badge` kategori, `Rating` pill.
- Detail: galeri `aspect-[4/3]` mobile swipe, `Tabs` deep-link `?tab=reviews`, `formatCity` Title Case.

## Hal 6 — Solusi: Checkout & Pesanan
- Checkout 2 langkah (Detail → Alamat & Bayar), bukan 3 menipu. Alamat placeholder `Pangkal Pinang, Kepulauan Bangka Belitung` + chip provinsi, deadline chips Besok/2 hari/Minggu.
- Orders: `FSM PENDING→IN_PROGRESS→COMPLETED` (`lib/order-status.ts`), `updatedAt` untuk "jam lalu", estimasi `createdAt + deliveryTimeDays`, chat `max-h-[50vh]`.

## Hal 7 — Solusi: Dashboard per Role
- Shell 240px (PLANNING-UIUX): Admin (Stripe PostHog), Provider (Fiverr + Gojek kanban grip), Customer (list bukan kanban). `tabular-nums` untuk uang.

## Hal 8 — UI System: Titik Terang
- Palet: `primary #F97316`, `primary-strong 5.0:1`, dark `#0B0A09`, krem `#FBFAF8`. Tipografi Plus Jakarta Sans + serif italic. Radius xl, shadow glow, motion `expo-out` + `prefers-reduced-motion` skip orb.

## Hal 9 — Teknologi & Inovasi
- Next.js 15, Prisma 5, NextAuth, Tailwind, R3F 1400 partikel, TanStack Query. Inovasi: `city` kolom terpisah (bukan hitung tiap request), transaksi rating, filter nasional 38 provinsi, upload device auto-kompresi 1280px.

## Hal 10 — Dampak & Next
- 46 jasa 44 aktif, 22 provider 21 kota, juri bisa coba `search Bangka`. Next: Midtrans, Upstash Redis, Pusher realtime.

> Export: Figma → PDF, 1920×1080 screenshot `npm run dev` + `npm run build` bukti.
