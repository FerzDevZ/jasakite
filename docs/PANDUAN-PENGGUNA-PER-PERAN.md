# Panduan Pengguna per Peran — JASAKITE

> Manual operasional **klik demi klik** untuk setiap peran di JASAKITE: Customer,
> Provider, Admin, dan Super Admin. Ditulis untuk pemilik/pengelola aplikasi
> (client) yang belum pernah memakai aplikasi web sebelumnya — setiap langkah
> menyebut nama tombol **persis seperti yang tampil di layar**, diverifikasi
> langsung dari kode antarmuka.
>
> Dokumen pendamping: [PANDUAN-LENGKAP.md](PANDUAN-LENGKAP.md) (konsep & alur bisnis),
> [panduan-jasakite.pdf](../panduan-jasakite.pdf) (edisi pemula). Versi PDF dokumen ini:
> [PANDUAN-PENGGUNA-PER-PERAN.pdf](PANDUAN-PENGGUNA-PER-PERAN.pdf).

- Alamat aplikasi: `https://jasakite.vercel.app` (produksi)
- Wilayah layanan: Provinsi Kepulauan Bangka Belitung — 7 kabupaten/kota
- Kategori jasa: **Jasa Antar, Jasa Belanja, Jasa Pembayaran, Jasa Titip**

### Akun demo (untuk latihan)

Semua memakai password `password123`.

| Peran | Email | Dipakai untuk mencoba |
|---|---|---|
| Customer | `dewi.lestari@email.com` | Memesan & membayar jasa |
| Provider | `budi.santoso@email.com` | Menerima pesanan di kanban |
| Provider | `siti.rahayu@email.com` | Provider kedua (Sungailiat) |
| Admin | `admin@jasakite.id` | Moderasi & statistik |
| Super Admin | dibuat manual — lihat Bagian E | Keputusan uang + 2FA |

---

## Bagian A — Dasar untuk Semua Peran

### A.1 Membuka aplikasi

Buka browser (Chrome/Firefox/Safari, di HP maupun laptop) dan tuju
`https://jasakite.vercel.app`. Beranda menampilkan kotak pencarian,
4 kategori jasa, jasa terbaru, promo, dan voucher yang berlaku.

### A.2 Mendaftar akun baru

1. Klik tombol **Daftar** di pojok kanan atas (di HP: ikon menu garis-tiga).
2. Halaman **Daftar Akun JASAKITE** terbuka. Isi:
   - **Nama Lengkap**
   - **Email** — satu email hanya untuk satu akun.
   - **No. HP (opsional)**
   - **Password** — **minimal 8 karakter, wajib mengandung huruf kecil dan
     angka** (indikator Lemah/Sedang/Kuat/Sangat Kuat membantu; form menolak
     lebih awal bila syarat belum terpenuhi).
   - **Kabupaten / Kota Layanan** — contoh isian: `Pangkal Pinang`. Field ini
     **hanya muncul bila Anda mendaftar sebagai Provider**.
3. Pada bagian **Daftar sebagai**, pilih:
   - **Customer** — "Saya ingin memesan jasa", atau
   - **Provider** — "Saya ingin membuka jasa" (perlu langganan, lihat Bagian C).
   
   Peran tidak bisa diubah sendiri setelah mendaftar — hubungi Admin.
4. Klik **Daftar Sekarang**. Anda **tidak langsung masuk**: halaman berpindah
   ke halaman Masuk dengan pita hijau *"Pendaftaran berhasil"* — ketik email
   dan password yang baru dibuat, lalu klik **Masuk**.

> **Batas aman:** pendaftaran dibatasi 5 akun per jam dari satu jaringan
> (pesan "Terlalu banyak permintaan" bila terlampaui).

### A.3 Masuk (login)

1. Klik **Masuk** di pojok kanan atas.
2. Isi **Email** dan **Password**, klik tombol **Masuk**.
3. Setelah masuk, area kanan atas berganti menjadi: ikon keranjang, ikon
   pesan, lonceng, tombol **Dashboard**, tombol **Buka Jasa** (khusus
   Provider/Admin) atau **Jelajahi Jasa** (khusus Customer), foto profil, dan
   tombol **Keluar**.

**Khusus Super Admin dengan 2FA aktif:** setelah email + password benar muncul
layar kedua **Verifikasi 2FA** — buka aplikasi authenticator di HP (Google
Authenticator dan sejenisnya), ketik **kode 6 digit**, lalu klik **Verifikasi
dan masuk**. Kode berganti setiap 30 detik.

> **Terkunci gara-gara salah ketik?** Setelah 10 kali gagal dalam 15 menit
> untuk email yang sama, percobaan berikutnya ditolak sementara. Pesan yang
> tampil tetap "Email atau password salah." — tunggu 15 menit, lalu coba lagi.

### A.4 Mengenali layar utama

**Di atas (semua ukuran layar):**

| Elemen | Fungsi |
|---|---|
| Logo JASAKITE (kiri) | Kembali ke beranda |
| Kotak pencarian | Cari jasa; bisa dibuka cepat dengan tombol `/` di keyboard |
| Menu kategori (Jasa Antar dll.) | Turunannya berisi daftar kategori |
| **Jelajahi** | Membuka katalog `/services` |
| Ikon bulan/matahari | Ganti tema gelap ↔ terang |
| Ikon keranjang | Halaman keranjang |
| Ikon pesan (gelembung) | Daftar obrolan — badge merah = belum dibaca |
| Lonceng | Notifikasi |
| **Dashboard** | Ringkasan sesuai peran Anda |
| **Buka Jasa** / **Jelajahi Jasa** | Membuat jasa (Provider/Admin) / ke katalog (Customer) |
| Foto profil → **Keluar** | Keluar dari akun |

**Di HP, tambahan bar bawah** (selalu terlihat): **Beranda · Kategori ·
Pesanan · Pesan · Akun**. Tab Pesanan memunculkan badge jumlah pesanan aktif;
tab Pesan badge jumlah pesan belum dibaca.

Saat pertama masuk dashboard, muncul sekali **jendela sambutan** berisi 4
langkah singkat sesuai peran — klik **Mulai Menjelajahi** untuk menutup.

### A.5 Lupa password?

Aplikasi belum menyediakan reset password mandiri (tidak ada tautan "lupa
password" di halaman Masuk). Hubungi Admin — Admin dapat memeriksa akun Anda
lewat fitur *Masuk sebagai* atau membuatkan akun baru. Simpan password di
tempat aman.

---

## Bagian B — Customer (Pelanggan)

```
Cari jasa → Pesan / Keranjang → Bayar QRIS atau saldo → Verifikasi admin
→ Dikerjakan → Selesai → Ulasan
```

### B.1 Mencari jasa — tiga cara

1. **Kotak pencarian** (beranda atau bar atas) — ketik minimal 2 huruf
   (contoh: `antar`), saran muncul otomatis; tekan Enter untuk hasil lengkap.
2. **Kartu kategori** di beranda — klik Antar / Belanja / Pembayaran / Titip.
3. **Halaman katalog** (tombol **Jelajahi**) — paling lengkap:
   - pencarian multi-kata yang mencocokkan judul, deskripsi, **dan** nama
     penyedia sekaligus;
   - filter **kategori**, **harga** (min–maks atau preset `<100rb`,
     `100–300rb`, `300rb+`), **Rating Minimal** (4,5 / 4 / 3), dan **lokasi**
     (ketik atau pakai chip 7 daerah);
   - tombol **Terdekat** — memakai lokasi HP Anda untuk memilih daerah
     terdekat;
   - urutan: **Terbaru · Terlaris · Harga Terendah · Harga Tertinggi ·
     Rating Tertinggi**;
   - hasil bertambah otomatis saat digulir; tombol **Muat lebih banyak**.

> Jasa milik Provider yang langganannya tidak aktif **tidak pernah muncul** —
> Anda hanya melihat jasa yang benar-benar bisa dipesan sekarang.

### B.2 Halaman detail jasa

Klik kartu jasa. Halaman memuat: galeri foto (klik untuk memperbesar), harga,
estimasi, deskripsi, tab **Deskripsi / Ulasan (n) / Tentang Provider**, ulasan
asli beserta sebaran bintangnya, jasa serupa, dan profil penyedia (jumlah
pesanan selesai, anggota sejak). Tombol yang tersedia:

- **Pesan Sekarang** — langsung ke checkout jasa ini (di HP tombolnya **Pesan**).
- **Chat Penyedia** — bertanya dulu, tanpa perlu membuat pesanan.
- Tombol hati **Simpan / Disimpan** — menyimpan jasa ke daftar simpanan.
- Tombol **WhatsApp** dan **salin tautan** — membagikan halaman jasa.
- Blok **Pilih paket** — bila penyedia menyediakan paket (mis. Basic /
  Standard / Premium), pilih sebelum memesan; harga & estimasi menyesuaikan.

### B.3 Memesan — dua jalur

**Jalur 1 — Pesan langsung** (`/checkout?service=...`): klik **Pesan
Sekarang** di halaman detail. Halaman checkout menampilkan stepper **1 Detail
Jasa → 2 Alamat & Bayar**. Isi catatan, alamat (wajib memuat nama
kabupaten/kota — ada chip contoh alamat untuk mempermudah), jadwal, lalu pilih
metode pembayaran — **QRIS / Transfer platform** atau **Saldo JASAKITE** — dan
klik **Konfirmasi Pesanan**.

**Jalur 2 — Keranjang (beberapa jasa sekaligus):**

1. Di halaman detail, masukkan jasa ke **keranjang**.
2. Buka halaman **Keranjang** (ikon keranjang). Atur tiap baris:
   - **jumlah** (maksimal 20 per baris),
   - **+ Tambah catatan** — contoh isian: *2 dus sembako, belanja di pasar
     pagi, antar ke Jl. Merdeka* (maks 300 karakter),
   - tombol tempat sampah untuk **menghapus** satu baris, atau **Kosongkan**
     untuk semuanya.
   
   Baris yang berlabel merah *"Jasa ini sudah tidak tayang"* memblokir
   checkout — hapus dulu baris itu.
3. Lanjutkan ke checkout — **tiga langkah** dengan stepper di bagian atas:

| Langkah | Nama di stepper | Yang dilakukan |
|---|---|---|
| 1 | **Alamat** | Pilih alamat tersimpan, atau isi alamat baru (tersimpan otomatis untuk pemakaian berikutnya) |
| 2 | **Jadwal** | Pilih kapan pekerjaan diinginkan (preset: Segera / Minggu ini / 2 minggu / Bulan depan, atau tanggal sendiri) |
| 3 | **Bayar** | Buka **Pakai voucher / kode promo**, pilih metode, kirim |

   Tombol navigasinya: **Lanjut ke jadwal** → **Lanjut ke pembayaran** →
   **Buat pesanan · Rp X**. Bila saldo kurang, tombol terakhir terkunci dan
   muncul tombol **Isi saldo**.

Dua metode pembayaran yang berlaku:

| Metode | Cara kerja |
|---|---|
| **QRIS / Transfer platform** | Uang ditahan platform (escrow). Scan QRIS di halaman pesanan, unggah bukti, Super Admin memverifikasi. Provider baru dibayar setelah pesanan selesai. |
| **Saldo JASAKITE** | Total langsung dipotong dari saldo dompet; pembatalan mengembalikan saldo penuh. |

Checkout multi-jasa otomatis dipecah menjadi **satu pesanan per penyedia**,
masing-masing dengan kode sendiri — mis. 3 jasa dari 2 penyedia = 2 pesanan.

### B.4 Membayar dengan QRIS — langkah demi langkah

1. Setelah checkout, Anda tiba di halaman pesanan. Kartu pembayaran
   menampilkan kode QRIS, nama merchant, NMID, dan **Nominal yang harus
   dibayar** — transfer **persis sesuai nominal, jangan dibulatkan**.
2. Buka aplikasi mobile banking / e-wallet → scan QRIS → transfer.
3. Klik **Bukti transfer** → **Pilih atau jepret foto bukti transfer**
   (foto dikompres otomatis) → **Kirim bukti untuk diverifikasi**.
4. Status berubah menjadi **Menunggu verifikasi**. Bila bukti kurang jelas,
   klik **Ganti bukti transfer** → **Kirim bukti pengganti**.
5. Super Admin memeriksa: cocok → **Pembayaran terverifikasi** dan penyedia
   boleh mulai bekerja; ditolak → alasan penolakan tampil (*"Bukti sebelumnya
   ditolak: ..."*) dan Anda diminta mengunggah ulang.

Status pembayaran yang tampil ke Anda: **Belum dibayar → Menunggu verifikasi
→ Pembayaran terverifikasi** (atau **Dana dikembalikan** bila pesanan batal
setelah dibayar).

### B.5 Memantau pesanan & mengobrol

- **Tab Pesanan** (HP) atau **Dashboard → Pesanan**: daftar pesanan dengan
  saran **Semua / Aktif / Selesai**; klik untuk membuka detail.
- Halaman detail menampilkan **kode pesanan** (mis. `JK-2F9K3`), linimasa
  **Dipesan → Dikerjakan → Selesai** dengan cap waktu, dan kotak obrolan.
- Obrolan: tekan Enter untuk kirim, Shift+Enter untuk baris baru, maksimal
  500 karakter; ada indikator *"sedang mengetik"* dan balasan masuk otomatis
  tanpa muat ulang halaman.
- Lonceng memberi kabar penting (pesanan diterima, selesai, dsb.); arsip
  lengkap di halaman **Notifikasi** dengan saran **Semua / Belum dibaca** dan
  tanda-baca.

### B.6 Membatalkan pesanan

Tombol **Batalkan Pesanan** hanya tampil **selama status pesanan masih
"Menunggu konfirmasi"**. Klik → dialog konfirmasi → **Ya, Batalkan** (atau
**Tetap Pertahankan**).

- Saat pembayaran *Menunggu verifikasi*, pembatalan ditolak server dengan
  pesan *"Bukti pembayaran sedang diverifikasi. Tunggu keputusan SUPER_ADMIN
  sebelum membatalkan."* — tunggu keputusannya dulu.
- Bila pesanan sudah dibayar lalu dibatalkan, dana otomatis **kembali penuh
  ke saldo JASAKITE** Anda ("Dana dikembalikan").
- Setelah penyedia mulai bekerja (status *Sedang dikerjakan*), pembatalan
  oleh customer tidak lagi tersedia — koordinasikan lewat obrolan.

### B.7 Memberi ulasan

Setelah pesanan **Selesai**, kartu **Beri Ulasan** muncul di halaman pesanan
(tombol **Beri Rating & Ulasan**):

1. Pilih rating **1–5 bintang** (Sangat kurang … Sangat puas).
2. Tulis komentar — opsional, maksimal 500 karakter.
3. Klik **Kirim Ulasan**. Rating rata-rata penyedia langsung diperbarui.

Aturannya: satu pesanan satu ulasan, hanya dalam **60 hari** setelah pesanan
selesai. (Unggahan foto ke ulasan belum tersedia.)

### B.8 Voucher & promo

- Voucher tampil di beranda (bagian voucher) dan di langkah **Bayar** pada
  checkout (**Pakai voucher / kode promo** → tombol **Pilih**; lepas dengan
  **Lepas**).
- Alasan penolakan yang bisa muncul: voucher tidak aktif, belum berlaku,
  kedaluwarsa, kuota habis, hanya bisa dipakai sekali, minimal belanja belum
  tercapai, hanya berlaku di kota tertentu, atau tidak memberi potongan untuk
  pesanan Anda.

### B.9 Dompet

Menu **Dashboard → Dompet**:

- **Isi saldo** — pilih nominal (preset 50rb/100rb/200rb/500rb atau isi
  sendiri; minimal Rp10.000, maksimal Rp10.000.000) → transfer QRIS sesuai
  kode unik **JK-TOP-XXXX** yang tampil → **Lampirkan bukti transfer** →
  **Kirim untuk verifikasi**. Pengajuan yang masih menunggu diverifikasi
  tampil sebagai banner di atas halaman; bukti bisa diganti selama menunggu.
- **Riwayat Transaksi** — semua mutasi dengan label ramah: *Isi saldo, Bayar
  pesanan, Pendapatan pesanan, Tarik saldo, Pengembalian dana, Langganan
  penyedia*.
- Saldo dipakai untuk: pembayaran instan saat checkout.

### Arti status pesanan

| Status di layar | Artinya |
|---|---|
| **Menunggu konfirmasi** | Pesanan dibuat; menunggu pembayaran diverifikasi / penyedia menerima |
| **Sedang dikerjakan** | Penyedia sedang mengerjakan |
| **Selesai** | Pekerjaan tuntas — bisa memberi ulasan |
| **Dibatalkan** | Pesanan batal; dana kembali ke saldo bila sudah dibayar |

---

## Bagian C — Provider (Penyedia Jasa)

### C.1 Aturan utama: langganan Rp 10.000 per 30 hari

Menayangkan jasa adalah layanan berlangganan (30 hari, bukan bulan kalender).
Tanpa langganan aktif:

- membuat jasa baru **ditolak** (pesan: *"Langganan penyedia belum aktif.
  Aktifkan dulu di Dashboard → Langganan untuk dapat menayangkan jasa."*),
- jasa yang sudah tayang **hilang dari katalog** dan halaman detailnya
  menjawab **404** (tautan hidup lagi begitu langganan diperpanjang),
- pesanan yang sedang berjalan **tetap bisa diselesaikan** dan tetap dibayar.

Halaman **Dashboard → Langganan** menampilkan: status (*"Aktif sampai 23
November 2026"* / *"Berakhir ..."* / *"Belum berlangganan"*), kalimat *"Sisa
{X} hari. Perpanjangan berikutnya dipotong otomatis dari saldo."*, harga per
30 hari, saldo dompet, tombol **Perpanjang Rp 10.000**, dan pintasan **Isi
saldo**. Riwayat 12 periode terakhir memuat status (*Aktif/Berakhir*), sumber
(*Potong saldo otomatis* / *Diberikan admin*), dan nominal (*Gratis* bila
pemberian admin).

Penagihan otomatis berjalan tiap hari (pukul 08.00 WIB) dan mulai mencoba
**2 hari sebelum** masa aktif habis; perpanjangan dini tidak menghanguskan
sisa hari. Bila saldo kurang, langganan berakhir dan Anda menerima notifikasi
berisi nominal yang dibutuhkan — isi saldo lalu klik **Perpanjang Rp 10.000**.

### C.2 Menyiapkan dompet & rekening

Menu **Dashboard → Dompet**:

1. **Isi saldo** — bahan bakar langganan (alur sama dengan B.9).
2. **Rekening saya** — membuka formulir **"Rekening penarikan"**: isi nama
   bank, nomor rekening, nama pemilik, lalu **Simpan rekening**.
3. **Tarik saldo** — membuka formulir **"Tarik saldo"** (nominal minimal
   50.000). Dana **dibekukan** sejak diajukan; Super Admin mentransfer ke
   rekening terdaftar dan menandai **"Sudah ditransfer"**. Bila ditolak,
   saldo kembali otomatis beserta alasan.

Bila rekening belum lengkap, muncul peringatan: *"Rekening penarikan belum
lengkap — buka 'Rekening saya' dulu."*

### C.3 Membuat jasa (Buka Jasa)

1. Klik **Buka Jasa** di bar atas, atau tombol **Tambah Layanan** di
   dashboard provider.
2. Isi formulir — kartu **Pratinjau Kartu** di sisi kanan berubah langsung
   saat Anda mengetik:
   - **Judul Jasa** — contoh: *Antar Paket Dokumen Pangkal Pinang*
   - **Kategori** — pilih dari daftar (Antar / Belanja / Pembayaran / Titip)
   - **Estimasi Pengerjaan (hari)** — 1–90 hari, contoh: 3
   - **Harga (Rp)** — minimal 10.000, naik kelipatan 5.000; hint "Tampil
     sebagai Rp X" menunjukkan bentuk akhirnya
   - **Deskripsi Jasa** — 20–500 karakter; deskripsi jelas meningkatkan
     peluang dipesan
   - **Gambar Cover (opsional — URL atau upload device, auto sesuaikan)**
3. Klik **Publikasikan Jasa**. Jasa langsung berstatus tayang (bila
   langganan aktif).

> **Foto dari perangkat** otomatis dikompres (maks sisi 1280px, hasil ≤300KB)
> sebelum dikirim. Bisa juga seret-lepas, atau tempel URL gambar dari host
> yang diizinkan (mis. `images.unsplash.com`). Foto melebihi batas setelah
> kompresi? Pilih yang lebih sederhana atau pakai URL.

Paket bertingkat (Basic/Standard/Premium) ada di data dan tampil di halaman
detail jasa, tetapi formulir pembuatannya belum tersedia di UI — harga tunggal
sudah cukup untuk tayang.

### C.4 Mengelola jasa yang tayang

Dashboard provider → bagian **Layanan Kamu** → **Kelola semua**. Tiap baris
menampilkan judul, badge status, kategori, jumlah pesanan, dan harga, dengan
dua tombol:

- **Sembunyikan** — jasa turun dari katalog (berubah jadi DRAFT).
- **Tayangkan** — jasa naik lagi.
- Ikon tautan — membuka halaman publik jasa di tab baru.

(Edit isi dan hapus jasa belum tersedia di UI.)

### C.5 Mengerjakan pesanan (papan Kanban)

Dashboard provider menampilkan kartu ringkasan (*Total Layanan, Nilai
Portofolio, Order Masuk, Order Hari Ini*) lalu papan tiga kolom:
**Menunggu → Dikerjakan → Selesai**.

1. Pesanan baru masuk ke kolom **Menunggu**.
2. Klik **Terima & Kerjakan**. Sebelum pembayaran pesanan terverifikasi,
   server menolak dengan pesan *"Pembayaran belum terverifikasi. Tunggu
   SUPER_ADMIN memeriksa bukti transfer pelanggan."* — kartu kembali ke
   semula; tunggu customer mengunggah bukti.
3. Setelah selesai, klik **Tandai Selesai**. Konfeti merayakan pesanan
   selesai 🙂 dan pendapatan langsung masuk saldo: rincian **Total pesanan −
   Komisi platform = Masuk ke saldo** (komisi bawaan 10%).
4. Cara lain memindahkan kartu: **seret** dari gagang bulat di pojok kiri
   atas kartu, atau di komputer pakai **panah kiri/kanan**; **Enter** membuka
   detail. Setelah memindah, ada tombol **Urungkan** selama 5 detik.
5. Pesanan yang dibatalkan pelanggan terlipat di bagian **Dibatalkan (n)**.

### C.6 Komunikasi & reputasi

- Balas obrolan dari halaman pesanan atau tab **Pesan** — respons cepat
  menaikkan kepercayaan.
- Ulasan pelanggan (bintang + komentar) menentukan **Rating Rata-rata** yang
  tampil di dashboard dan katalog.

---

## Bagian D — Admin

### D.1 Ringkasan Platform

`/dashboard/admin` — KPI: **Pengguna, Pesanan, Komisi Platform, Jasa Aktif,
Rating Rata-rata**; grafik **Pesanan 14 Hari Terakhir** dan **Komisi per
Kategori**; tabel **Pesanan Terbaru**; **Top 5 Provider**; tombol **Ekspor
CSV Pesanan** untuk mengunduh data.

### D.2 Moderasi jasa

`/dashboard/admin/moderasi` — daftar jasa beserta statusnya. Tombol per jasa:

- **Lihat** — pratinjau halaman jasa di tab baru.
- **Aktifkan** — menayangkan jasa yang statusnya draf.

Catatan: jasa yang baru dibuat provider langsung tayang; halaman ini terutama
menangani jasa yang disembunyikan/draf.

### D.3 Pengguna & "Masuk sebagai" (impersonasi)

`/dashboard/admin/users` — cari akun (nama, email, kota), lihat peran
(*Super Admin / Admin / Penyedia Jasa / Customer*) dan statistiknya. Tombol
**Masuk sebagai** (hanya untuk akun non-admin) membuka tampilan web
sebagaimana dilihat pengguna itu — berguna membantu customer bermasalah.
Selama impersonasi:

- bar peringatan **"Mode tampil sebagai: {nama}"** selalu tampil di atas,
- sesi impersonasi kedaluwarsa sendiri setelah 15 menit,
- tombol **Kembali ke Admin** mengembalikan ke akun Admin Anda.

### D.4 Antrean uang (hanya melihat)

`/dashboard/admin/wallet` — Admin biasa melihat tiga antrean dalam mode
hanya-baca dengan peringatan *"Anda masuk sebagai ADMIN. Verifikasi uang
hanya bisa dilakukan SUPER_ADMIN — antrean ini hanya-baca untuk Anda."*
Keputusan ada di Bagian E.

### D.5 Status build & deploy

`/dashboard/admin/vercel` — status build dan deployment produksi/preview
terakhir.

---

## Bagian E — Super Admin

Super Admin memegang **semua kemampuan Admin** plus **keputusan uang**. Setiap
keputusan uang wajib **kode 2FA 6 digit** — sesi login saja tidak cukup,
sehingga akun yang dibajak tetap tidak bisa memindahkan uang.

### E.1 Aktivasi 2FA (sekali di awal)

1. Buka `/dashboard/admin/keamanan` — halaman **Keamanan Akun**.
2. Masukkan password Anda → tombol **Mulai pengaturan**.
3. **Pindai QR** dengan aplikasi authenticator (atau salin secret manual).
4. Ketik kode dari aplikasi → **Aktifkan 2FA**.

Setelah aktif: login menjadi dua langkah (password → kode), ada tombol
**Ganti perangkat authenticator** bila ganti HP. Tanpa 2FA, server menolak
**semua** keputusan uang: *"Aktifkan 2FA (TOTP) terlebih dahulu sebelum
memverifikasi uang."* Kehilangan HP: jalankan
`npm run admin:reset-totp <email> --db=<db> --yes` dari server — akun bisa
masuk lagi, tetapi keputusan uang tetap ditolak sampai 2FA didaftarkan ulang.

### E.2 Verifikasi uang (tugas harian)

Buka `/dashboard/admin/wallet` — **Verifikasi Saldo**. Antrean terbagi tiga
kartu: **Pembayaran Pesanan Menunggu**, **Isi Saldo Menunggu**, **Penarikan
Menunggu**. Cara memutuskan:

1. Ketik **kode 2FA** (6 digit) sekali di awal sesi kerja — kode yang sah
   membuka **jendela kepercayaan 15 menit** di perangkat itu: selama jendela
   hidup (chip hijau bertuliskan sisa waktunya), semua keputusan berikutnya
   tidak meminta kode lagi; setelah habis, kolom kode muncul kembali. Satu
   kode tetap tak boleh dipakai dua kali.
2. Periksa bukti tiap kartu (klik untuk memperbesar). Perhatikan badge
   **"Bukti diubah"** (bukti diganti setelah diajukan) dan **"Bukti belum
   dilampirkan"**.
3. Tekan tombol keputusan:

| Kartu | Tombol setuju | Tombol tolak |
|---|---|---|
| Pembayaran pesanan | **Verifikasi** | **Tolak** |
| Isi saldo (top-up) | **Setujui** | **Tolak** |
| Penarikan | **Sudah ditransfer** | **Tolak & kembalikan saldo** |

Penolakan membuka formulir **Alasan penolakan** (3–300 karakter) yang tampil
ke pemilik dana.

### E.3 Harga langganan & penagihan

`/dashboard/admin/langganan`:

- **Harga per 30 hari (Rp)** — berlaku Rp1.000–Rp1.000.000, bawaan Rp10.000;
  simpan dengan **Simpan harga**. Harga baru berlaku untuk penagihan
  berikutnya; riwayat lama tetap memakai harga saat itu.
- **Tagih sekarang** — menjalankan penagihan yang sama dengan jadwal otomatis
  harian. Aman diklik berulang: tagihan tidak pernah dobel.
- Tabel **Penyedia** — status (*Aktif · {n} hari* / Berakhir / Belum
  berlangganan), saldo, dan jumlah jasa tiap penyedia.

### E.4 Membuat akun Super Admin

Super Admin tidak dibuat lewat halaman web, melainkan lewat perintah sekali
dari komputer server:

```bash
node scripts/promote-super-admin.js <email> --db=<nama-database> --yes
```

`--db` wajib sama dengan nama database di `DATABASE_URL` (skrip menolak bila
beda — pengaman salah target). Setelah promosi, akun harus **keluar lalu
masuk lagi** agar sesinya membawa peran baru.

---

## Bagian F — Masalah Umum & Solusinya

| Gejala | Penyebab | Solusi |
|---|---|---|
| Jasa saya tidak muncul di katalog | Langganan tidak aktif | Dashboard → Langganan → **Isi saldo** → **Perpanjang Rp 10.000** |
| Tautan jasa saya jadi 404 saat dibuka orang | Sama — jasa non-aktif otomatis 404 | Perpanjang langganan; tautan hidup lagi tanpa buat ulang |
| Tidak bisa membuat jasa (ditolak) | Langganan belum aktif | Aktifkan langganan dulu, baru klik **Publikasikan Jasa** |
| Foto jasa ditolak (>300KB) | Foto terlalu padat bahkan setelah kompresi otomatis 1280px | Pilih foto lebih sederhana, atau pakai URL gambar (mis. `images.unsplash.com`) |
| "Tombol Terima & Kerjakan" saya ditolak server | Pembayaran pesanan belum diverifikasi | Tunggu customer unggah bukti & Super Admin memverifikasi |
| Tidak bisa membatalkan pesanan | Pembayaran sedang *Menunggu verifikasi*, atau pesanan sudah *Sedang dikerjakan* | Tunggu keputusan verifikasi; setelah dikerjakan, koordinasi lewat obrolan |
| Password baru ditolak saat daftar | Server minta minimal 8 karakter + huruf + angka | Pakai ≥8 karakter dengan huruf kecil dan angka |
| Login terus gagal padahal benar | 10× gagal dalam 15 menit mengunci email itu sementara | Tunggu 15 menit, lalu coba lagi |
| Voucher ditolak | Kuota habis / minimum belanja / sekali pakai / khusus kota | Baca alasan pada kartu voucher |
| Tarik saldo tidak bisa diajukan | Rekening belum lengkap atau nominal < Rp50.000 | Buka **Rekening saya** → lengkapi → **Simpan rekening**; ajukan ≥ Rp50.000 |
| Ulasan tidak muncul | Pesanan belum **Selesai**, sudah pernah diulas, atau lewat 60 hari | Minta provider **Tandai Selesai**; ulas segera setelah selesai |
| Saldo berkurang sendiri? | Perpanjangan langganan otomatis | Cek **Riwayat Transaksi** — ada baris *Langganan penyedia* |
| Login Super Admin minta kode terus | 2FA aktif — memang seharusnya begitu | Gunakan aplikasi authenticator; HP hilang → `admin:reset-totp` oleh admin lain |

---

## Bagian G — Ringkasan & Glosarium

### Siapa bisa apa

| Kemampuan | Customer | Provider | Admin | Super Admin |
|---|:-:|:-:|:-:|:-:|
| Mencari & memesan jasa | ✅ | ✅ | ✅ | ✅ |
| Membuat/mengelola jasa | — | ✅ | — | — |
| Membayar pesanan | ✅ | ✅ | — | — |
| Verifikasi bukti/top-up/penarikan | — | — | lihat saja | ✅ (2FA) |
| Ubah harga langganan & tagih | — | — | — | ✅ |
| Moderasi jasa & pengguna | — | — | ✅ | ✅ |
| Masuk sebagai pengguna lain | — | — | ✅ | ✅ |

### Glosarium

- **Escrow** — uang customer *ditahan platform* sampai pekerjaan selesai;
  seperti titipan di kasir: provider yakin dibayar, customer yakin pekerjaan
  dikerjakan.
- **Saldo JASAKITE** — dompet di dalam aplikasi: diisi lewat **Isi saldo**
  terverifikasi, dipakai membayar pesanan instan, langganan, serta menerima
  pendapatan.
- **Kode pesanan (`JK-XXXXX`)** — nomor pesanan yang mudah dibacakan/diingat.
- **Kode top-up (`JK-TOP-XXXX`)** — kode unik per pengajuan isi saldo agar
  mutasi bank mudah dicocokkan admin.
- **Langganan provider** — Rp 10.000 per 30 hari agar jasa tayang; dipotong
  otomatis dari saldo.
- **Komisi platform** — bagian platform dari nilai pesanan (bawaan 10%),
  dipotong saat pesanan selesai; sisanya masuk saldo provider.
- **Verifikasi** — pemeriksaan bukti transfer oleh Super Admin sebelum uang
  dianggap masuk.
- **2FA (TOTP)** — kode 6 digit dari aplikasi authenticator yang berganti
  tiap 30 detik; wajib untuk semua keputusan uang.
- **Impersonasi ("Masuk sebagai")** — Admin melihat tampilan sebagai pengguna
  lain untuk mendiagnosis masalah; bar peringatan selalu terlihat, sesi
  15 menit.
