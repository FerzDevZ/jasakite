# Script Presentasi Grand Final 5 Menit — JASAKITE

> Untuk 3 tim final 7 Sep (10% nilai). Latihan 4:30 agar sisa tanya.

**0:00-0:30 — Hook masalah (20%)**
"Kami wawancara 15 orang: cari tukang AC masih via status WA, tidak ada harga, tidak ada rating. Di Bangka Belitung, Hendri provider Pangkal Pinang hanya dapat order dari spanduk. Tema *Impactful for Everyday Life* — kami buat marketplace jasa lokal nasional."

**0:30-1:30 — Demo 90 detik (UX 30%)**
1. Landing `38 provinsi Aceh→Papua` → klik pill `Pangkal Pinang`
2. Catalog `?location=Kepulauan Bangka Belitung` → 2 jasa Hendri muncul (bukti filter `city` works)
3. Detail `?tab=reviews` → galeri swipe, `formatCity` Title Case
4. Checkout → isi alamat `Jl. Depati Amir Pangkal Pinang, Kepulauan Bangka Belitung` (placeholder nasional) → pilih `E-Wallet` → `Konfirmasi` → success confetti
5. Provider kanban drag `Menunggu → Dikerjakan → Selesai` (grip, bukan seluruh kartu) → customer ulasan 5 bintang
"Semua klikable, bukan Figma."

**1:30-2:30 — Kenapa UI gini (UI 25%)**
"Titik Terang: oranye #F97316 di hitam pekat #0B0A09 = hangat tetangga + tegas transaksi. Plus Jakarta Sans, clamp fluid, glow hanya CTA. Dark & light token terpisah, kontras 5.0:1 lolos WCAG (test 47). Referensi Fiverr (katalog), Linear (kanban expo easing), Gojek (KPI uang hero), Vercel (glass). Anti-slop: tanpa gradien ungu, tanpa emoji."

**2:30-3:30 — Dashboard per role (Kreativitas 15%)**
"Admin Strip+PostHog (5 KPI + area 14 hari), Provider Fiverr+Linear (kanban dot status), Customer Gojek (list bukan kanban). `city` kolom terpisah (bukan hitung tiap request), FSM `PENDING→IN_PROGRESS→COMPLETED` 409, upload device auto-kompresi 1280px canvas 0.82."

**3:30-4:30 — Dampak & Teknik**
"46 jasa, 22 provider, 21 kota, 146 order selesai. Next: Midtrans, Upstash, Pusher. Build `typecheck 0, vitest 108, next build` sukses, `vercel --prod` siap."

**4:30-5:00 — Penutup**
"JASAKITE bukan demo — Hendri Bangka kini bisa dipesan dari Jakarta. Terima kasih."

> Q&A siap: kenapa `city` lowercase? Kenapa `contains` bukan `equals`? Kenapa `data:image` 2.5MB limit?
