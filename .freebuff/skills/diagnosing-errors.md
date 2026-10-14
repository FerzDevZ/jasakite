---
name: "diagnosing-errors"
description: "Reads error messages, stack traces, and logs to pinpoint root cause. Invoke when user pastes an error, stack trace, or log output."
---

# Diagnosing Errors

Error message itu bukan musuh — itu petunjuk. Yang membedakan sepuh dengan yang masih belajar: yang belajar panik lihat stack trace panjang, yang sepuh baca pelan-pelan dari baris paling atas sampai paling bawah, lalu cek baris yang benar-benar penting: baris **pertama** (jenis error) dan baris **frame pertama dari kode user** (bukan dari library). Sisanya noise.

## Tujuan

Mengubah error message/stack trace/log yang mentah menjadi diagnosis root cause yang bisa dieksekusi: tahu apa yang salah, di mana, dan langkah verifikasi berikutnya.

## Kapan Memakai

- User menempelkan pesan error, stack trace, atau output log dan bertanya "ini kenapa?".
- Error muncul di CI/CD, server, atau mesin lokal yang tidak bisa diakses langsung.
- Error langka/tidak familiar — analisis struktural dulu sebelum cari di internet.

## Workflow

### Langkah 1: Baca header error

1. Ambil baris pertama error: jenis + pesan. Contoh: `TypeError: Cannot read properties of undefined`, `EADDRINUSE`, `SyntaxError: Unexpected token`.
2. Terjemahkan maknanya: jenis error menentukan kategori — TypeError (nilai salah tipe), ReferenceError (variabel tidak ada), ENOENT (file tidak ada), EACCES (izin), ECONNREFUSED (koneksi ditolak), segfault (memory access invalid).
3. Pesan error sering sudah menyebut simbol spesifik: `undefined (reading 'length')` berarti property `length` dibaca dari undefined. Ini sudah 80% diagnosis.

### Langkah 2: Baca stack trace dari atas

4. Frame pertama yang merujuk file project (bukan node_modules/vendor/stdlib) adalah lokasi bug yang paling mungkin. Tandai baris file:line-nya.
5. Baca frame berikutnya untuk konteks pemanggil — siapa yang memanggil fungsi yang error. Kadang bug ada di pemanggil (mengirim nilai salah), bukan di penerima.
6. Kalau semua frame dari library: error di pemanggilan API library dengan argumen salah. Baca signature library (dokumentasi/type definition).

### Langkah 3: Klasifikasikan

7. Tentukan kategori:
   - **Runtime error**: nilai/siklus hidup — cek null/undefined, async ordering, state.
   - **Compile/syntax error**: typo, kurung, import salah — fix langsung di lokasi.
   - **Environment error**: port, izin file, dependency hilang, versi salah — cek `ls -la`, `which`, `node -v`, `npm ls`.
   - **Data error**: input tidak sesuai asumsi (null, format salah, encoding) — cek trust boundary.
8. Tulis satu kalimat diagnosis: "Saat X memanggil Y, Z bernilai undefined karena ...".

### Langkah 4: Verifikasi diagnosis

9. Baca kode di file:line hasil Langkah 2. Konfirmasi apakah variabel yang error memang bisa bernilai undefined/salah di jalur itu.
10. Cari jalur pemanggil: `Grep` nama fungsi yang error untuk menemukan semua pemanggil dan kondisi pemanggilannya.
11. Kalau perlu, tambahkan log/print sementara di atas baris error untuk melihat nilai aktual. Jangan hanya menebak nilai.
12. Kalau error environment: coba perintah diagnostik langsung — `ls -la path`, `netstat -tlnp | grep PORT`, `node -v && npm -v`.

### Langkah 5: Laporkan & fix

13. Sampaikan diagnosis dalam format: jenis error → lokasi → akar → bukti → fix yang disarankan.
14. Kalau user minta fix: terapkan fix minimal di root cause (lihat systematic-debugging), lalu verifikasi error tidak muncul lagi.

## Checklist Penyelesaian

- [ ] Jenis error diidentifikasi (header)
- [ ] Frame pertama dari kode project ditemukan
- [ ] Konteks pemanggil dipahami
- [ ] Kategori error ditentukan (runtime/compile/env/data)
- [ ] Diagnosis diverifikasi dengan baca kode atau eksperimen
- [ ] Fix (jika diminta) menyentuh root cause, bukan gejala
- [ ] Error diverifikasi hilang setelah fix

## Contoh

**Input user:**
```
TypeError: Cannot read properties of undefined (reading 'map')
    at renderItems (/app/src/views/list.js:42:21)
    at renderPage (/app/src/views/page.js:18:9)
    at handleRequest (/app/src/server.js:57:25)
```

**Analisis:**
1. Jenis: `TypeError` — nilai `undefined` dipanggil `.map()`.
2. Frame project pertama: `list.js:42` — variabel yang di-map kemungkinan `items`.
3. Pemanggil: `page.js:18` memanggil `renderItems(...)` — cek apa yang dikirim.
4. Hipotesis: `renderItems(items)` dipanggil dengan `items` dari state yang belum di-set (mis. `state.items` masih undefined sebelum data dimuat).
5. Verifikasi: baca `page.js:18` — ternyata `renderItems(page.items)` dan `page.items` hanya ada setelah fetch. Saat render awal, undefined.

**Output diagnosis:**
> Akar: `page.items` belum ter-set saat render pertama (race antara fetch dan render). Fix: guard `page.items ?? []` di render, atau jangan render sebelum data siap. Tambahkan test untuk render tanpa data.

## Anti-pattern

- ❌ Menyalin error mentah ke search engine tanpa membaca — error generik punya ratusan penyebab, konteks lokalmu tidak ada di hasil pencarian.
- ❌ Fokus ke baris terbawah stack trace — itu cuma frame pemanggil paling luar (sering framework).
- ❌ Menyalahkan library sebelum baca cara pakainya — 90% kasus salah pakai.
- ❌ Menganggap pesan error bahasa Inggris = kode rusak; error message itu spec perilaku, bukan cacat.
- ❌ Kasih fix tanpa verifikasi nilai aktual — "seharusnya" bukan bukti.
