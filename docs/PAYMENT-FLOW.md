# Alur Uang JASAKITE

Model: **escrow QRIS platform**. Pelanggan membayar ke merchant platform
(`QR QILABY CELL`), bukan ke penyedia. Dana ditahan platform sampai pekerjaan
selesai, lalu dilepas ke saldo penyedia setelah dipotong komisi.

## Peran

| Peran | Boleh apa |
|---|---|
| `CUSTOMER` | Memesan, membayar QRIS/saldo, mengunggah bukti, membatalkan pesanan yang belum berjalan. |
| `PROVIDER` | Menyiapkan jasa, menerima pesanan **setelah pembayaran PAID**, menandai selesai, menarik saldo. |
| `ADMIN` | Katalog, moderasi, pengguna. **Tidak boleh memutuskan uang.** |
| `SUPER_ADMIN` | Semua akses ADMIN + verifikasi top-up, penarikan, dan pembayaran pesanan. |

## 1. Mengisi saldo (top-up)

1. Pelanggan membuka **Dashboard → Dompet → Isi saldo**.
2. Sistem menampilkan QRIS statis platform, nama merchant, NMID, dan nominal.
   QRIS statis **tidak** memuat nominal, jadi pelanggan wajib mengetik nominal
   persis. Jangan membulatkan.
3. Pelanggan transfer, lalu mengunggah bukti (dikompres di perangkat).
4. Baris ledger `TOPUP` dibuat dengan status `PENDING`; **saldo belum berubah**.
5. `SUPER_ADMIN` membuka **Dashboard Admin → Verifikasi uang**, mencocokkan
   nominal, nama pengirim, dan waktu dengan mutasi QRIS, lalu menyetujui atau
   menolak dengan alasan.
6. Persetujuan mengkredit saldo secara atomik dan mengubah status menjadi
   `VERIFIED` dalam satu transaksi. Penolakan tidak menyentuh saldo.

## 2. Membayar pesanan

1. Checkout hanya menerima `qris` (termasuk alias lama `transfer`) dan `saldo`.
   `ewallet` dan `cod` ditolak karena tidak punya bukti yang bisa dicocokkan.
2. **Saldo** — total didebit atomik saat checkout, `paymentStatus = PAID`.
3. **QRIS** — pesanan dibuat dengan `paymentStatus = UNPAID`. Halaman pesanan
   menampilkan QRIS, nominal, dan kode pesanan. Pelanggan mengunggah bukti;
   status berubah menjadi `WAITING_VERIFICATION`.
4. `SUPER_ADMIN` memutuskan di halaman pesanan atau antrean admin:
   - Setuju → `PAID`. Pelanggan dan penyedia diberi notifikasi.
   - Tolak → `UNPAID` + alasan. Pelanggan mengunggah bukti baru.
5. Penyedia **tidak bisa** menekan "Terima & Mulai Kerjakan" sebelum `PAID`.
   Aturan ini diperiksa di server (`PATCH /api/orders/[id]`), bukan hanya UI.

## 3. Pelepasan dana & komisi

Saat penyedia menandai `COMPLETED`, dalam satu transaksi:

```
providerPayout = totalPrice − platformFee
platformFee    = round(totalPrice × PLATFORM_COMMISSION_PERCENT / 100)
```

- `platformFee` dan `providerPayout` dibekukan saat pesanan dibuat, sehingga
  perubahan persentase tidak mengubah pesanan lama.
- Saldo penyedia dikredit `providerPayout`, dicatat sebagai ledger `EARNING`.
- Komisi platform tidak masuk dompet siapa pun; ia tersimpan di pesanan untuk
  audit dan agregasi pendapatan.

Persentase diatur lewat env `PLATFORM_COMMISSION_PERCENT` (default **10**,
dibatasi 0–50).

## 4. Pembatalan & refund

- Belum dibayar (`UNPAID`) → pesanan batal, tidak ada perpindahan uang.
- Sedang diverifikasi (`WAITING_VERIFICATION`) → pelanggan **tidak boleh**
  membatalkan. Uang mungkin sudah dikirim; biarkan SUPER_ADMIN memutuskan dulu.
- Sudah dibayar (`PAID`, QRIS maupun saldo) → dana dikembalikan **ke saldo
  dompet pelanggan** dalam transaksi yang sama dengan pembatalan, lalu
  `paymentStatus = REFUNDED`. Tidak ada transfer manual ke rekening luar.

## 5. Penarikan saldo penyedia

Penyedia mengisi rekening (bank, nomor, nama), mengajukan nominal minimal
Rp50.000, dan saldo langsung dibekukan (debit atomik). `SUPER_ADMIN`
mentransfer manual lalu menandai "Sudah ditransfer", atau menolak dan dana
kembali otomatis.

## 6. Menambah jasa

Admin memakai **Dashboard Admin → Tambah jasa** (form yang sama dengan
penyedia). Jasa milik akun admin, sehingga payout-nya masuk ke dompet admin —
cocok untuk jasa yang dikerjakan platform sendiri. Jasa milik penyedia tetap
bisa diajukan dan diaktifkan lewat **Moderasi**.

## Operasional

Promosikan akun verifikator:

```bash
# `--db` wajib dan harus sama dengan nama database pada DATABASE_URL.
# Jalankan dengan DATABASE_URL produksi, bukan `.env` dev.
node scripts/promote-super-admin.js admin@jasakite.id --db=jasakite --yes
```

Setelah promosi, akun harus **keluar lalu masuk lagi** agar JWT membawa peran
baru. Verifikasi top-up/penarikan/pembayaran akan menolak `ADMIN` dengan 403.

Env opsional:

| Variabel | Fungsi |
|---|---|
| `PLATFORM_COMMISSION_PERCENT` | Komisi platform (default 10). |
| `PLATFORM_BANK_NAME` | Rekening alternatif selain QRIS. |
| `PLATFORM_BANK_ACCOUNT_NUMBER` | Nomor rekening alternatif. |
| `PLATFORM_BANK_ACCOUNT_NAME` | Nama pemilik rekening alternatif. |

Aset QRIS: `public/payment/qris.png`. Merchant dan NMID didefinisikan di
`lib/payments.ts`; ganti keduanya bila QRIS merchant berubah.
