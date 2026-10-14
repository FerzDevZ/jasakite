---
name: "module-extractor"
description: "Extracts reusable modules from existing code: isolates logic, defines interfaces, tests in isolation. Invoke when code is duplicated or a self-contained unit should become a module."
---

# Module Extractor

Kode yang sama ketemu di tiga tempat = satu modul yang belum lahir. Skill ini untuk mengekstrak unit logika dari kode yang sudah ada menjadi modul mandiri: interface jelas, test jalan di isolasi, dan semua pemakaian asal tetap hijau. Ekstraksi yang baik tidak mengubah perilaku satu bit pun — ia cuma memindahkan kode ke tempat yang bisa diuji dan dipakai ulang.

## Tujuan

Mengubah duplikasi atau unit yang terkubur menjadi modul yang bisa digunakan ulang: identifikasi kandidat dengan bukti, definisikan interface sebelum menulis kode, pisahkan logika dari efek samping, beri test sendiri, lalu ganti semua call-site satu per satu — tanpa mengubah perilaku.

## Kapan Memakai

- Pola kode yang sama muncul di 2+ tempat; tiap duplikasi ditagih denda di maintenance berikutnya.
- Satu unit logika terkubur dalam file besar dan susah diuji berdiri sendiri.
- Mau membuka logika ke repo/paket lain, atau sekadar memisahkan concern (pure logic vs I/O).
- User bilang: "ini kepakai di mana-mana, tiap ngubah harus sentuh 3 file".

Jangan pakai kalau: kode dipakai sekali dan kecil (kost ekstraksi lebih besar dari manfaat), atau ekstraksi lintas modul besar (architecture-improver) / mau publish dependency (dependency-auditor untuk pemeriksaan).

## Workflow

1. **Temukan kandidat dengan bukti.** Grep duplikasi: cari blok berstruktur mirip (pola yang sama dengan input berbeda). Bantu dengan diff dua file untuk melihat kemiripan. Tandai: lokasi, jumlah pemakaian, panjang blok.
   - Output: daftar kandidat + lokasi + jumlah pemakaian.
2. **Pilih satu, batasi scope.** Satu ekstraksi per sesi — jangan mengekstrak 5 hal sekaligus. Tentukan batas modul: input apa, output apa, dan mana efek samping (I/O, DB, network, log) yang harus dipisah dari logika murni. Efek samping boleh di-inject sebagai parameter, bukan dikubur di dalam.
   - Output: keputusan scope — fungsi apa yang masuk modul, apa yang tidak.
3. **Definisikan interface DULU.** Tulis signature publik sebelum menyalin kode: nama, parameter, return, error yang mungkin dilempar. Interface yang baik: pemanggil paham tanpa membaca implementasi. Kalau interface butuh 3+ kalimat untuk dijelaskan, pecah lagi.
   - Output: signature + docstring singkat.
4. **Ekstrak pasif (copy).** Salin logika ke file modul baru (`src/lib/<nama>/` atau sesuai struktur yang berlaku). Jangan ubah kode asal dulu — duplikasi sementara di langkah ini itu normal dan disengaja.
   - Output: modul baru terisi; kode asal belum tersentuh.
5. **Uji modul di isolasi.** Tulis test untuk modul baru memakai input-output nyata dari pemakaian yang ada. Jalankan: harus hijau tanpa menyentuh kode lain. Ini bukti bahwa modul berdiri sendiri.
   - Output: test hijau di isolasi.
6. **Ganti call-site pertama.** Ubah satu pemakaian saja ke modul baru. Jalankan suite penuh. Kalau hasil beda dari yang lama, bandingkan output keduanya (jalankan versi lama vs baru dengan input sama) sebelum melanjutkan.
   - Output: satu call-site bermigrasi, suite hijau.
7. **Ganti sisa call-site satu per satu.** Setelah tiap ganti, test. Setelah semua call-site pindah, hapus kode duplikasi di tempat asal. Grep ulang pola lama untuk memastikan tidak ada sisa.
   - Output: semua call-site pakai modul; duplikasi asal terhapus; grep bersih.
8. **Rapikan dan tutup.** Perbaiki nama/signature hanya jika pemakaian nyata menunjukkan masalah (jangan polishing berlebihan). Pastikan test modul mencakup perilaku penting, bukan hanya happy path — termasuk kasus error yang mungkin.

## Checklist Penyelesaian

- [ ] Kandidat didaftar dengan bukti (lokasi + jumlah pemakaian)
- [ ] Interface terdokumentasi sebelum ekstraksi dimulai
- [ ] Efek samping dipisah dari logika murni
- [ ] Modul baru punya test sendiri, hijau di isolasi
- [ ] Semua call-site dimigrasi satu per satu, suite hijau tiap langkah
- [ ] Duplikasi asal terhapus, grep pembuktian bersih
- [ ] Perilaku tidak berubah dari awal sampai akhir

## Contoh

**Duplikat:** format tanggal `dd-mm-yyyy` ada di 3 file (2 implementasi sedikit beda — bug laten di salah satunya).

**Interface:** `formatDate(value: Date): string` — pure function, tanpa I/O.
**Modul:** `src/shared/date/formatDate.js` + test 5 kasus (tanggal normal, leap year, jam malam, invalid input → throw `TypeError`, null → throw).
**Migrasi:** ganti 3 call-site bertahap; di call-site ketiga ketahuan hasil beda karena bug lama — test modul yang menangkapnya; hapus 3 salinan lama.

**Hasil:** satu implementasi, satu tempat perbaikan, bug lama mati dengan sendirinya.

## Trade-off

1. **Ekstraksi dini vs ekstraksi telat.** Ekstrak terlalu cepat = abstraksi menebak masa depan (YAGNI). Ekstrak terlalu telat = denda duplikasi menumpuk. Aturan praktis: ekstrak saat pemakaian kedua muncul, atau saat unit sudah susah diuji di tempatnya — bukan saat "mungkin suatu hari dipakai".
2. **DRY yang salah lebih mahal dari duplikasi.** Dua blok yang kebetulan mirip tapi beda makna domain tidak boleh disatukan. Satukan hanya kalau perubahan di satu sisi selalu harus ikut di sisi lain — itu tanda mereka memang satu hal.
3. **Modul internal vs paket terpisah.** Ekstraksi ke folder `src/lib/` itu murah; jadi paket terpisah mahal (versioning, publish, CI, semver). Naik level ke paket hanya kalau pemakaian lintas repo sudah nyata.
4. **Interface stabil = nilai utama.** Nilai sebuah modul bukan di panjang kodenya, tapi di interface yang tidak berubah saat implementasi di dalamnya berubah. Habiskan energi di sana.

## Prinsip Utama

1. **Perilaku itu kontrak.** Ekstraksi dianggap gagal kalau perilaku berubah, meski semua test hijau — jadi bandingkan output sebelum-sesudah pada input nyata, bukan hanya mengandalkan test.
2. **Satu ekstraksi, satu commit.** Calon modul yang dicampur refactor lain tidak bisa di-review dan tidak bisa di-rollback dengan bersih.
3. **Modul harus bisa dijelaskan tanpa membuka isinya.** Kalau pemakai harus baca implementasi untuk paham cara pakai, interface-nya belum selesai.

Ketiga prinsip ini yang membedakan ekstraksi yang menurunkan biaya dari ekstraksi yang cuma memindah masalah ke file baru.

## Anti-pattern

- ❌ Ekstraksi tanpa test — "kan tinggal pindahin" adalah jalan menuju bug halus yang baru ketahuan 6 bulan kemudian.
- ❌ Ganti semua call-site sekaligus tanpa checkpoint — kalau merah, susah cari biang keroknya.
- ❌ Menyatukan kode yang perilakunya beda tipis (beda timezone, beda format) demi DRY — duplikasi jujur lebih baik dari abstraksi bohong.
- ❌ Menambah parameter konfigurasi tak terbatas biar "fleksibel" — tambahkan saat pemakaian kedua benar-benar butuh, bukan di awal (YAGNI).
- ❌ Mengekstrak modul untuk satu pemakaian — itu cuma mindahin file sambil nambah lapisan.