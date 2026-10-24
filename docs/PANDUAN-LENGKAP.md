# Panduan Lengkap JASAKITE

Dokumen ini menjelaskan **siapa saja yang memakai JASAKITE, apa yang mereka lakukan, dan
bagaimana uang bergerak** — dari pelanggan memesan jasa sampai penyedia menarik saldo dan
membayar langganan bulanan. Ditulis untuk dipakai saat presentasi ke client: setiap alur di
sini bisa ditunjukkan langsung di aplikasi.

- Versi aplikasi: Next.js 15 (App Router) + Prisma + MongoDB
- Wilayah: Provinsi Kepulauan Bangka Belitung (7 kabupaten/kota)
- Bahasa antarmuka: Indonesia

---

## 1. Ringkasan dalam satu halaman

JASAKITE adalah marketplace jasa lokal dengan **uang ditahan platform (escrow)**:

1. Pelanggan memesan jasa dan membayar lewat **QRIS** (transfer manual).
2. **SUPER_ADMIN** memverifikasi bukti transfer; uang masuk escrow.
3. Penyedia mengerjakan pesanan **hanya setelah pembayaran terverifikasi**.
4. Setelah pesanan selesai, pendapatan penyedia masuk ke **saldo dompet** (dipotong komisi
   platform, bawaan 10%).
5. Penyedia dapat menarik saldo ke rekening bank, atau memakainya untuk **langganan bulanan
   Rp10.000** yang wajib aktif agar jasanya tayang di katalog.

Empat peran:

| Peran | Bisa melakukan | Tidak bisa |
|---|---|---|
| **CUSTOMER** | Cari & simpan jasa, pesan, bayar, chat, ulasan, isi saldo | Membuat jasa, memutuskan uang |
| **PROVIDER** | Kelola jasa, terima & kerjakan pesanan, tarik saldo, bayar langganan | Memverifikasi pembayaran |
| **ADMIN** | Moderasi jasa, kelola pengguna, lihat build/deploy, melihat antrean uang | Memutuskan uang, mengubah harga langganan |
| **SUPER_ADMIN** | Semua akses ADMIN + memutuskan uang (2FA wajib) + mengubah harga langganan | — |

---

## 2. Akun

### 2.1 Mendaftar
`/register` — nama, email, password, dan pilihan peran (**Pelanggan** atau **Penyedia**).
Setelah daftar, pengguna langsung masuk ke `/dashboard` sesuai perannya.
Pendaftaran dibatasi 5 akun per jam per IP (anti-spam).

### 2.2 Masuk
`/login` — email + password. Setelah 10 percobaan gagal dalam 15 menit untuk email yang sama,
percobaan berikutnya ditolak sementara. Halaman login akan meminta **kode 2FA** bila akun
SUPER_ADMIN sudah mengaktifkan authenticator.

### 2.3 Keamanan akun admin
Hanya SUPER_ADMIN memegang keputusan uang, dan setiap keputusan uang memerlukan **kode TOTP
6 digit**:

1. `/dashboard/admin/keamanan` → aktifkan 2FA (butuh password + pindai QR di aplikasi
   authenticator).
2. Kode yang sama tidak bisa dipakai dua kali (anti-replay, jendela ±30 detik).
3. Tanpa 2FA aktif, server menolak semua keputusan uang — bukan hanya menyembunyikan tombol.

### 2.4 Hak akses halaman
| Rute | Siapa |
|---|---|
| `/`, `/services`, `/service/*`, `/provider/*`, `/faq` | Publik |
| `/dashboard/customer`, `/orders`, `/keranjang`, `/checkout`, `/messages` | Login |
| `/dashboard/provider/*` | PROVIDER, ADMIN, SUPER_ADMIN |
| `/dashboard/admin/*` | ADMIN, SUPER_ADMIN |
| `/dashboard/admin/wallet`, `/dashboard/admin/langganan` (aksi) | SUPER_ADMIN |

---

## 3. Alur pelanggan (CUSTOMER)

```
Beranda → Cari/Filter → Detail jasa → (Keranjang) → Checkout
   → Transfer QRIS + unggah bukti → Menunggu verifikasi
   → Diverifikasi (PAID) → Penyedia mengerjakan → Selesai → Ulasan
```

### 3.1 Menemukan jasa
- **Beranda** menampilkan kategori nyata dari database, jasa terbaru, jasa paling banyak
  dipesan, dan penyedia aktif.
- **`/services`** mendukung pencarian multi-kata, filter kategori/harga/rating/lokasi, dan
  urutan (Terbaru, Harga, Rating, Terlaris). Jasa yang penyedianya tidak berlangganan aktif
  **tidak pernah muncul** di sini.
- **Simpan jasa** (bookmark) tersedia di kartu dan halaman detail.

### 3.2 Memesan
1. Buka `/service/<slug>` → pilih paket (bila ada) → tulis catatan & alamat.
2. Checkout membuat pesanan dengan status **PENDING** dan pembayaran **UNPAID**.
3. Total dihitung dari harga jasa/paket, ongkir bila ada, dan voucher yang valid.

### 3.3 Membayar (QRIS manual)
1. Halaman pesanan menampilkan QRIS platform + nominal.
2. Pelanggan mentransfer, mengunggah bukti, status pembayaran menjadi
   **WAITING_VERIFICATION**.
3. SUPER_ADMIN memeriksa bukti → **PAID** atau ditolak (bukti bisa diunggah ulang).
4. Selama menunggu verifikasi, pelanggan **tidak bisa membatalkan** pesanan — mencegah dana
   menggantung pada pesanan yang sudah dibatalkan.

### 3.4 Setelah bayar
- Penyedia baru boleh menekan "Mulai kerjakan" setelah pembayaran **PAID** (gerbang escrow).
- Pelanggan memantau status, chat penyedia di `/messages`, lalu menerima hasil.
- Pesanan **COMPLETED** → pelanggan dapat menulis **ulasan** (rating + komentar). Rating
  agregat tampil di katalog dan profil penyedia.

### 3.5 Status pesanan
| Status | Arti | Transisi berikutnya |
|---|---|---|
| **PENDING** | Menunggu konfirmasi/verifikasi | IN_PROGRESS, CANCELLED |
| **IN_PROGRESS** | Sedang dikerjakan | COMPLETED, CANCELLED |
| **COMPLETED** | Selesai (final) | — |
| **CANCELLED** | Dibatalkan (final) | — |

Status pembayaran terpisah: **UNPAID → WAITING_VERIFICATION → PAID** (atau ditolak).

---

## 4. Alur penyedia (PROVIDER)

```
Daftar → Aktifkan langganan (Rp10.000/bulan) → Buat jasa → Tayang di katalog
   → Terima pesanan → Kerjakan → Selesaikan → Saldo bertambah
   → Tarik saldo ke bank, atau pakai untuk langganan berikutnya
```

### 4.1 Langganan wajib
Menayangkan jasa adalah **layanan berlangganan**. Tanpa langganan aktif:

- jasa **tidak bisa dibuat** (`POST /api/services` → 402),
- jasa yang ada **tidak bisa diaktifkan** (`PATCH /api/services/<id>` → 402),
- jasa yang sudah tayang **disembunyikan dari katalog** sampai langganan diperpanjang,
- halaman detail jasanya menjawab **404**, dan slug-nya hilang dari `sitemap.xml`.

Penyedia tetap bisa membuka dashboard, melihat jasanya sendiri, dan menerima pesanan yang
sudah berjalan.

### 4.2 Membuat jasa
`/dashboard/provider/buka-jasa` — judul, deskripsi, harga, estimasi hari, kategori, gambar.
Jasa baru berstatus **ACTIVE** dan langsung tayang (bila langganan aktif). ADMIN dapat
menonaktifkan jasa lewat moderasi.

### 4.3 Mengerjakan pesanan
Dashboard penyedia menampilkan papan pesanan (kanban): Pending → Dikerjakan → Selesai.
Tombol "Mulai kerjakan" terkunci sampai pembayaran PAID. Setelah selesai, pesanan
COMPLETED dan pendapatan masuk saldo (total − komisi platform).

### 4.4 Saldo & penarikan
- Saldo dompet tampil di `/dashboard/wallet`, lengkap dengan riwayat.
- **Isi saldo**: transfer QRIS + unggah bukti, diverifikasi SUPER_ADMIN (minimal Rp10.000).
- **Tarik saldo**: minimal Rp50.000, wajib rekening bank lengkap. Dana dibekukan saat
  pengajuan (status PENDING) dan dikembalikan bila ditolak.
- Penarikan yang disetujui ditandai "sudah ditransfer" oleh SUPER_ADMIN.

### 4.5 Komisi platform
Komisi diambil dari nilai pesanan saat pesanan selesai. Bawaannya **10%**, dapat diubah
lewat env `PLATFORM_COMMISSION_PERCENT` (maksimum 50%). Angka ini tidak diubah dari UI admin.

---

## 5. Langganan penyedia (fitur berbayar)

### 5.1 Aturan
| Hal | Nilai |
|---|---|
| Harga bawaan | **Rp10.000 / 30 hari** |
| Siapa yang mengubah harga | **SUPER_ADMIN** (`/dashboard/admin/langganan`) |
| Batas harga | Rp1.000 – Rp1.000.000 (bilangan bulat) |
| Cara bayar | **Potong saldo dompet otomatis** (tanpa gateway) |
| Perpanjangan otomatis | Cron harian `0 1 * * *` (08.00 WIB) → `/api/cron/subscription` |
| Konfirmasi manual | Tombol "Perpanjang sekarang" di dashboard penyedia |
| Bila saldo kurang | Langganan berakhir, jasa disembunyikan, penyedia diberi notifikasi |

### 5.2 Apa yang terjadi setiap bulan
1. Cron memeriksa penyedia yang masa aktifnya habis dalam ≤ 2 hari.
2. Bila saldo ≥ harga, saldo dipotong dan masa aktif **ditambah 30 hari** dari sisa masa
   aktif (perpanjangan lebih awal tidak menghanguskan hari yang sudah dibayar).
3. Bila saldo kurang, langganan ditandai **EXPIRED**, penyedia menerima notifikasi berisi
   nominal yang dibutuhkan, dan jasanya hilang dari katalog.
4. Setelah penyedia mengisi saldo, ia menekan "Perpanjang sekarang" (atau menunggu cron
   berikutnya) → jasa tayang kembali otomatis.

### 5.3 Kenapa memotong saldo, bukan gateway
Saldo penyedia sudah berisi pendapatan pesanan. Memotong dari saldo membuat langganan
berjalan **tanpa kartu kredit, tanpa akun merchant, dan tanpa biaya transaksi** — cocok
untuk pasar lokal. Penagihan otomatis tetap terjadi karena cron berjalan setiap hari.

### 5.4 Yang dilihat penyedia
`/dashboard/provider/langganan`:
- status ("Aktif sampai 23 November 2026" / "Berakhir ..." / "Belum berlangganan"),
- sisa hari, harga per 30 hari, dan saldo dompet,
- tombol **Perpanjang Rp10.000** dan jalan pintas **Isi saldo**,
- riwayat 12 transaksi terakhir (tanggal periode, nominal, status, sumber).

### 5.5 Yang dilihat SUPER_ADMIN
`/dashboard/admin/langganan`:
- harga bulanan yang berlaku + form ubah harga (dinonaktifkan untuk ADMIN biasa),
- tombol **Tagih sekarang** (menjalankan penagihan yang sama dengan cron, untuk demo),
- tabel semua penyedia: status, sisa hari, saldo, jumlah jasa.

### 5.6 Penyedia lama (sebelum fitur ini)
Penyedia yang sudah punya jasa tetapi belum punya tanggal langganan diberi masa aktif awal
30 hari lewat skrip sekali jalan:

```bash
node scripts/backfill-subscription.js --db=<nama-database> --yes
```

Skrip ini tidak memotong saldo (dicatat sebagai `ADMIN_GRANT`) dan idempoten.

---

## 6. Dompet, escrow, dan komisi

| Objek | Arti |
|---|---|
| `balance` | Saldo rupiah pengguna. Hanya berubah lewat debit/kredit atomik + baris ledger |
| `WalletTransaction` | Ledger: TOPUP, PAYMENT, EARNING, WITHDRAW, REFUND, SUBSCRIPTION |
| Escrow | Uang pesanan ditahan platform sampai pesanan selesai |
| Komisi | Dipotong saat pesanan COMPLETED; sisanya masuk saldo penyedia |

Aturan yang dijaga server:

- Saldo tidak bisa minus: debit memakai syarat `balance >= amount` di dalam transaksi.
- Satu pengajuan hanya bisa diputus sekali (verifikasi bersifat final).
- Bukti transfer yang diganti pemiliknya diberi tanda "bukti diubah" untuk admin.
- SUPER_ADMIN wajib 2FA untuk setiap keputusan uang.

---

## 7. Admin & SUPER_ADMIN

| Halaman | Fungsi |
|---|---|
| `/dashboard/admin` | Ringkasan: pengguna, jasa, pesanan, pendapatan, komisi bulan ini, grafik 14 hari |
| `/dashboard/admin/wallet` | Antrean verifikasi: pembayaran pesanan, isi saldo, penarikan |
| `/dashboard/admin/langganan` | Harga langganan + status semua penyedia + tagih sekarang |
| `/dashboard/admin/users` | Daftar pengguna & peran |
| `/dashboard/admin/moderasi` | Jasa DRAFT/ACTIVE: aktifkan, arsipkan, pratinjau |
| `/dashboard/admin/keamanan` | Aktivasi/rotasi 2FA SUPER_ADMIN |
| `/dashboard/admin/vercel` | Status build & deploy terakhir |

Perbedaan ADMIN vs SUPER_ADMIN ditegakkan **di server**, bukan hanya di tampilan:
ADMIN yang memanggil endpoint keputusan uang akan menerima 403.

---

## 8. Kategori & katalog

- Kategori disimpan di database; teks di beranda (contoh pencarian, pill kategori, deskripsi
  SEO) **diturunkan dari data**, sehingga tidak bisa menyebut layanan yang sudah dihapus.
- Kategori aktif saat ini: **Jasa Antar, Jasa Belanja, Jasa Pembayaran, Jasa Titip**.
- Visibilitas publik sebuah jasa = `status = ACTIVE` **dan** penyedianya berlangganan aktif.
  Aturan ini dipakai bersama oleh API katalog, halaman beranda, profil penyedia, sitemap,
  saran pencarian, dan kartu Open Graph.

---

## 9. Operasional

### 9.1 Variabel lingkungan penting
| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | MongoDB (lokal atau Atlas) |
| `AUTH_SECRET` | Kunci JWT sesi — wajib diganti di produksi |
| `NEXTAUTH_URL` | URL callback auth (domain produksi) |
| `NEXT_PUBLIC_SITE_URL` | URL kanonik untuk metadata, OG, sitemap |
| `PLATFORM_COMMISSION_PERCENT` | Komisi platform (bawaan 10) |
| `PLATFORM_BANK_*` | Rekening tujuan transfer manual |
| `CRON_SECRET` | **Wajib** — kunci endpoint `/api/cron/subscription` |

### 9.2 Cron
`vercel.json` mendaftarkan satu cron harian:

```json
{ "path": "/api/cron/subscription", "schedule": "0 1 * * *" }
```

Vercel mengirim `Authorization: Bearer $CRON_SECRET`. Tanpa `CRON_SECRET` yang cocok,
endpoint menjawab 503/401 — tidak ada cara memicu penagihan massal tanpa kunci.

### 9.3 Perintah berguna
```bash
npm run dev                 # server pengembangan
npm run build               # build produksi
npm test                    # unit test (vitest)
npm run test:e2e            # E2E (playwright)
npm run db:seed             # data demo (password: password123)
npm run admin:promote -- <email> --db=<db> --yes   # jadikan SUPER_ADMIN
node scripts/backfill-subscription.js --db=<db> --yes
```

### 9.4 Akun demo (hasil seed)
| Email | Peran |
|---|---|
| `admin@jasakite.id` | ADMIN |
| `siti.rahayu@email.com` | PROVIDER |
| `budi.santoso@email.com` | PROVIDER |
| pelanggan seed lainnya | CUSTOMER |

Semua akun demo memakai password `password123`.

---

## 10. Demo 5 menit untuk client

1. **Beranda** — tunjukkan kategori nyata dan jasa yang tayang.
2. **Cari jasa** — cari "antar" dan filter lokasi.
3. **Pesan sebagai pelanggan** — checkout, buka halaman pesanan, unggah bukti QRIS.
4. **Masuk sebagai SUPER_ADMIN** — verifikasi pembayaran (masukkan kode 2FA), pesanan
   berubah menjadi PAID.
5. **Masuk sebagai penyedia** — "Mulai kerjakan" baru aktif sekarang; selesaikan pesanan.
6. **Dompet penyedia** — tunjukkan pendapatan masuk (setelah komisi).
7. **Langganan** — buka `/dashboard/provider/langganan`; tunjukkan harga Rp10.000, saldo,
   dan tombol perpanjang.
8. **Admin langganan** — ubah harga menjadi Rp15.000, simpan, lalu tekan **Tagih sekarang**;
   tunjukkan status penyedia berubah.
9. **Bukti aturan** — kosongkan saldo penyedia dan biarkan masa aktif lewat: jasanya hilang
   dari katalog dan tautan detailnya 404. Isi saldo → tayang lagi.

---

## 11. Pertanyaan yang sering muncul

**Apakah pelanggan bisa membatalkan setelah transfer?**
Tidak selama bukti masih diperiksa. Setelah diverifikasi, pembatalan mengikuti aturan
pengembalian dana (ledger REFUND).

**Bagaimana kalau penyedia tidak bayar langganan?**
Jasanya disembunyikan dari katalog dan tautan detailnya 404. Pesanan yang sudah berjalan
tetap bisa diselesaikan, dan data tidak dihapus — tayang lagi begitu langganan aktif.

**Bisakah harga langganan berbeda per penyedia?**
Tidak. Satu harga berlaku untuk semua, diatur SUPER_ADMIN. Nominal yang sudah terpotong
disimpan sebagai snapshot di riwayat, jadi mengubah harga tidak mengubah riwayat lama.

**Apakah uang pelanggan langsung masuk ke penyedia?**
Tidak. Uang ditahan platform (escrow) sampai pesanan selesai, lalu masuk saldo penyedia
dipotong komisi.

**Di mana bukti transfer disimpan?**
Sebagai data URI terkompresi atau URL https di ledger dompet, hanya bisa dilihat pemilik
dan admin yang berwenang.
