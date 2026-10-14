---
name: "intent-code-finder"
description: "Finds code by intent/behavior using semantic search across the codebase. Invoke when user describes functionality but doesn't know where the code lives."
---

# Intent Code Finder

Pencari kode berdasarkan niat. User bilang "mana kode yang handle upload gambar?" atau "di mana logika notifikasi email?" — tanpa tahu nama file, nama fungsi, atau letaknya. Skill ini menemukannya dengan semantic search: cari berdasarkan makna/perilaku, lalu konvergen dengan istilah persis. Jaman saya dulu cuma ada `grep -r`, jadi kalau tidak tahu katanya, tidak ketemu — sekarang ada senjata baru, tapi tetap harus tahu cara menggunakannya.

## Tujuan

Menemukan lokasi kode (file + baris) yang memenuhi deskripsi perilaku/inti user, walau user tidak menyebut simbol atau nama file apa pun. Output: daftar kandidat terurut relevansi, masing-masing dengan path, baris, dan alasan kenapa cocok — bukan satu tebakan tunggal.

## Kapan Memakai

- User bertanya "di mana kode yang melakukan X?" dengan X deskripsi perilaku.
- Mau memahami alur fitur tanpa tahu entry point-nya.
- User menyebut istilah domain (mis. "pembayaran", "keranjang") yang mungkin berbeda dengan nama kode (mis. `cart`, `basket`, `order-item`).
- Memulai eksplorasi codebase tak dikenal: "cari semua yang berhubungan dengan auth".

Jangan pakai kalau: user sudah menyebut nama simbol/file persis (itu kerjaan symbol-finder/file-finder), atau yang dicari cuma satu string literal (grep langsung lebih cepat). Kalau user bilang "cari fitur X" yang ternyata fitur lintas banyak file, ini tetap dipakai — tapi hasilnya jadi peta alur, bukan satu lokasi.

## Prinsip Pencarian

1. **Semantic dulu, literal kemudian.** Mulai dengan pertanyaan perilaku yang luas, lalu sempitkan dengan istilah persis untuk mengonfirmasi.
2. **Nama kode ≠ istilah user.** User bilang "transaksi", kode bisa `purchase`, `order`, `ledger_entry` — jangan kaku pada kata user.
3. **Bukti > relevansi model.** Semantic search memberi kandidat; konfirmasi dengan baca kode nyata sebelum menjawab "ini dia".
4. **Tandai ketidakpastian.** Kalau tidak yakin mana yang benar, bilang "kandidat A atau B, ini buktinya" — jangan memilih asal.

## Workflow

1. **Terjemahkan deskripsi user jadi query perilaku.** Ubah "handlenya upload gambar kayak yang dipakai di halaman profil" menjadi query: "where is the code that handles image upload used in the profile page". Sertakan konteks penting (halaman, fitur, alur) — query kaya konteks menghasilkan hasil lebih baik daripada satu kata. Kalau deskripsi user samar, pilih pertanyaan yang menyebutkan: aksi ("handles", "validates", "sends"), objek ("image", "payment", "email"), dan konteks ("in the profile page", "on checkout").
   - Output: 1-2 query semantic yang siap dijalankan.
2. **Jalankan semantic search.** Cari dengan query tersebut. Lihat hasil: perhatikan path, nama fungsi di sekitarnya, dan skor/urutan. Jangan berhenti di hasil pertama — baca 3-5 hasil teratas untuk memahami pola. Kalau hasil pertama meleset (mis. hasilnya file test), coba ulangi dengan query varian: ganti kata kunci dengan sinonim domain ("upload" → "save image", "profile" → "user avatar").
   - Output yang diharapkan: 3-5 kandidat file dengan baris relevan.
3. **Konvergen dengan grep.** Dari istilah yang muncul di hasil semantic (mis. `avatarUrl`, `multipart/form-data`, `uploadToS3`), jalankan grep untuk menemukan lebih banyak lokasi dan penggunaan lintas file. Istilah bisa juga dari user ("upload", "gambar", "profile"). Grep di sini berfungsi konfirmasi, bukan pencarian utama — kalau istilah yang di-grep tidak ketemu, bukan berarti kode tidak ada; kembali ke semantic dengan sinonim lain.
   - Output: kandidat bertambah/terkonfirmasi, daftar file meluas.
4. **Tentukan jawaban dengan membaca.** Baca potongan kode di kandidat teratas — apakah benar-benar melakukan perilaku yang ditanya? Periksa: fungsi yang memanggil, komentar, nama file. Kandidat yang cocok diberi alasan eksplisit ("file ini mem-parsing multipart dan menyimpan ke storage"). File test ikut dipertimbangkan: test sering menyingkap perilaku yang tidak terlihat dari implementasi.
   - Output: 1-3 jawaban final + bukti (path, baris, potongan kode).
5. **Saring hasil redundant.** Kalau ada beberapa kandidat (mis. wrapper dan implementasi), tunjukkan keduanya dengan hubungannya ("`uploadImage()` di `api/users.js` memanggil `saveFile()` di `storage.js`") — user butuh peta, bukan daftar. Kalau kandidat ternyata file test atau contoh (sample/example), beri label itu — jangan dianggap implementasi utama.
6. **Jawab dengan path + alasan.** Jawaban format: "Kode X ada di `src/.../file.js:12-30` (fungsi `foo`), karena …". Kalau tidak ketemu: bilang jujur, laporkan apa yang sudah dicoba, dan tawarkan pendekatan lain (cari dari test, cari dari entry point). Jangan mengarang lokasi.

## Format Jawaban

Jawaban akhir mengikuti pola ini supaya user tidak perlu tanya balik:

1. **Lokasi utama** — path + baris + nama fungsi, dalam satu kalimat.
2. **Alasan** — satu-dua baris kenapa ini yang dimaksud (perilaku yang cocok).
3. **Konteks tambahan** — pemanggil, dependensi, atau kandidat sekunder yang relevan.
4. **Tawaran lanjut** — "kalau mau, saya telusuri alurnya sampai entry point" (opsional).

Contoh ringkas: "Kode upload gambar ada di `src/api/users.js:22` — `uploadImage()` menerima `multipart/form-data` dan menyimpan file ke `storage.js`. Dipakai dari `ProfilePage.vue:41`."

## Checklist Penyelesaian

- [ ] Deskripsi user diterjemahkan jadi query perilaku yang kaya konteks
- [ ] Semantic search dijalankan dengan 1-2 query, hasil teratas dibaca
- [ ] Grep konfirmasi dijalankan dengan istilah yang muncul
- [ ] Jawaban diverifikasi dengan membaca kode nyata (bukan cuma skor model)
- [ ] Jawaban memuat path, baris, nama fungsi, dan alasan kenapa cocok
- [ ] Relasi antar kandidat dijelaskan bila lebih dari satu
- [ ] Tidak ada jawaban yang dipaksakan — ketidakpastian dilaporkan

## Contoh

**User:** "Kode yang bikin error message email 'already registered' itu di mana?"

1. Query: "where is the error message 'email already registered' produced during signup".
2. Hasil semantic: `src/api/auth/signup.js` (baris 45, pembuatan error), `src/validators/email.js` (validasi format).
3. Konvergen: grep `"already registered"` dan `"registered"` → `src/api/auth/signup.js:45` (satu-satunya lokasi), plus `src/locales/en.json` (text user-facing).
4. Baca: `signup.js:40-50` — cek `findUserByEmail()` sebelum insert, error dilempar di sini. Benar.
5. Jawaban: "Error-nya dibuat di `src/api/auth/signup.js:45` — `throw new ApiError('EMAIL_TAKEN', 'Email already registered')`, dipicu saat `findUserByEmail()` mengembalikan user. Teks tampilannya ada di `src/locales/en.json`."

**Tidak ketemu?** Laporkan: "Tidak ditemukan string persis. Yang ada: validasi email format di `validators/email.js`, dan pesan 'account exists' di `src/services/register.js:88` — mungkin ini yang dimaksud? Kalau mau, saya telusuri dari alur signup end-to-end."

**Contoh lain — fitur lintas banyak file:** User: "mana kode yang ngitung diskon pas checkout?" Query: "where is the discount calculation applied during checkout". Hasil semantic: `services/cart.js` (hitung subtotal), `services/pricing.js` (logika diskon). Grep konfirmasi: `discount` → `pricing.js:12` (fungsi `applyDiscount`), dipanggil `cart.js:88` dan `api/checkout.js:41`. Jawaban: peta 3 file dengan alur `checkout.js → cart.js → pricing.js` — bukan satu lokasi, tapi rantai, karena itu yang diminta user.

## Anti-pattern

- ❌ Menjawab dari skor semantic tanpa membaca kode — model bisa salah arah; bukti wajib.
- ❌ Kaku pada kata user — user bilang "cart" tapi kode `basket`; kalah pintar dengan sinonim.
- ❌ Berhenti di hasil pertama — kandidat kedua sering yang benar (wrapper vs implementasi).
- ❌ Query satu kata ("upload") — hasilnya kabur; konteks perilaku lebih penting.
- ❌ Membuang waktu grep istilah acak sebelum semantic search — urutannya semantic dulu, konfirmasi belakangan.
- ❌ Menjawab "tidak ada" tanpa mencoba sinonim domain atau menelusuri dari test — dua jalan ini sering menyelamatkan pencarian.