---
name: "context-compressor"
description: "Summarizes long sessions or large code context into concise working notes without losing critical details. Invoke when context is getting long or handing off work."
---

# Context Compressor

Skill kompresi konteks. Ketika sesi kerja sudah panjang, isi context window penuh log, output tool, dan diskusi yang berputar-putar — skill ini meringkasnya menjadi catatan kerja padat tanpa kehilangan detail kritis. Kompresi yang baik itu seperti ritsleting: hasilnya kecil, tapi bisa dibuka lagi tanpa sobek.

## Tujuan

Mengubah sesi/konteks yang panjang menjadi catatan kerja ringkas yang: (1) cukup untuk melanjutkan pekerjaan tanpa mengulang investigasi, (2) menyimpan fakta terverifikasi dan membuang spekulasi, (3) menandai dengan jelas apa yang belum selesai atau belum diverifikasi. Output utamanya berupa catatan terstruktur yang bisa langsung dipakai sebagai input sesi berikutnya.

## Kapan Memakai

- Konteks sesi terasa penuh: banyak output tool, banyak percobaan, progress lambat.
- Mau handoff ke agent/sesi lain — kompres dulu, baru tulis handoff (skill `handoff` memakai hasil ini).
- Selesai satu fase kerja (debug selesai, fitur jalan) dan mau mereset konteks untuk fase baru.
- User minta "rangkum di mana kita sekarang" atau "apa yang sudah ketemu".

Jangan pakai kalau: sesi masih pendek dan jelas, atau yang dibutuhkan justru detail mentah (log, output command) untuk audit — simpan file mentahnya, kompresi hanya untuk kerja.

## Prinsip Kompresi

1. **Fakta terverifikasi > spekulasi.** Klaim yang sudah dibuktikan (error message, test output, diff) wajib dipertahankan. Hipotesis yang belum terbukti ditandai "belum diverifikasi" atau dibuang.
2. **Detail kritis > detail menarik.** Yang menyimpan detail kritis: error message persis, path file, nama simbol, perintah yang dipakai, angka (waktu, ukuran, jumlah). Yang boleh dibuang: teks output yang panjang, penjelasan yang sudah dipahami, percakapan basa-basi.
3. **Semua yang dihapus harus bisa direkonstruksi.** Kalau info cuma ada di konteks yang akan hilang, simpan — entah di catatan, di file, atau di memory.
4. **Preserve struktur.** Arah alur (dari mana ke mana), urutan langkah, dan relasi (A menyebabkan B) jangan dipecah jadi fakta terisolasi.

## Workflow

1. **Kumpulkan sumber konteks.** Identifikasi semua yang akan dikompres: output tool yang panjang, hasil eksplorasi, percakapan, diff, error log. Tentukan mana yang perlu dibaca ulang dan mana yang sudah bisa diringkas dari pengetahuan saat ini.
   - Output: daftar sumber + perkiraan ukuran masing-masing.
2. **Petakan struktur cerita.** Jawab dulu: apa masalah/pekerjaan awal? Apa yang sudah dilakukan? Apa yang ditemukan? Di mana posisi sekarang? Ini kerangka catatan — tanpa ini, kompresi jadi daftar fakta acak.
3. **Ekstrak fakta terverifikasi.** Saring tiap sumber, catat: error message lengkap (jangan paraphrase error), file+baris yang relevan, perintah yang dijalankan + hasilnya, keputusan yang sudah diambil, kendala yang ditemui. Buang opini, dugaan, dan percobaan yang buntu (kecuali buntu-nya sendiri informatif: "cara X gagal karena Y").
   - Output: daftar fakta — tiap baris satu fakta, dengan referensi asal.
4. **Susun catatan terkompresi** dengan struktur:
   ```markdown
   # Ringkasan Sesi
   ## Tujuan awal
   ## Fakta terverifikasi
   ## Keputusan yang diambil
   ## Hipotesis / hal belum jelas
   ## Langkah berikut
   ## Referensi (file, perintah, log)
   ```
   Target: konteks 10.000+ baris menjadi 50-150 baris catatan. Detail kritis TIDAK boleh hilang — kalau ragu, simpan.
5. **Verifikasi dengan tes "orang asing".** Baca ulang catatan — bisakah orang yang tidak ikut sesi melanjutkan pekerjaan dari catatan ini saja? Cek: error message masih persis, path file masih valid, langkah berikut actionable. Kalau ada pertanyaan yang jawabannya cuma ada di konteks lama, catat sebagai "perlu dicek".
   - Output yang diharapkan: catatan yang lolos tes — semua info kritis ada, tidak ada referensi ke konteks yang sudah hilang.
6. **Simpan dan (opsional) lanjutkan.** Tulis catatan ke file (mis. `NOTES.md` atau section di memory file) kalau sesi akan dilanjutkan/handoff. Kalau ini kompresi tengah-sesi, ringkasan ini menjadi konteks kerja baru — lanjutkan dari sini, jangan dari memori lama.

## Checklist Penyelesaian

- [ ] Kerangka cerita jelas: tujuan awal, apa yang dilakukan, posisi sekarang
- [ ] Semua error message penting tersimpan persis, bukan paraphrase
- [ ] Path file, nama simbol, dan perintah yang relevan tercatat
- [ ] Keputusan yang diambil tercatat dengan alasan singkat
- [ ] Hipotesis belum terverifikasi ditandai eksplisit
- [ ] Langkah berikut actionable (bisa dieksekusi tanpa tanya ulang)
- [ ] Lolos tes "orang asing": bisa melanjutkan tanpa konteks lama
- [ ] Catatan jauh lebih pendek dari sumbernya (target < 2% volume)

## Contoh

Sesi debugging 3 jam, ~12.000 baris konteks, disaring menjadi:

```markdown
# Ringkasan Sesi — Bug login staging

## Tujuan awal
- Investigasi "login gagal di staging, jalan di local".

## Fakta terverifikasi
- Error: `Error: Invalid input: password hash invalid` (dari `src/auth/hash.js:42`).
- Reproduce: `curl -X POST /api/login -d '{"email":"a@b.c","password":"x"}'` → HTTP 500.
- Local jalan; staging gagal. Diff env: staging pakai `bcrypt` v2.4, local v5.1.
- Dependency lock: `package-lock.json` masih v2.4 — deploy staging pakai lock, local npm install ulang.
- Log staging: hash verify return `false` pada user pertama (seed data).

## Keputusan
- Fix: bump `bcrypt` ke v5.1 di lockfile, rehash seed user (2026-08-12).
- Bukan menambah try-catch di handler — hash invalid harus tetap error keras.

## Hipotesis / belum jelas
- Apakah seed user dibuat dengan bcrypt v5 (hash format beda) — perlu cek `seed.js` (belum diverifikasi).

## Langkah berikut
1. Cek `seed.js` — hash seed dibuat dengan versi mana.
2. Bump bcrypt, `npm ci`, deploy ulang, verifikasi dengan curl di atas.
3. Update memory file: gotcha "staging selalu npm ci dari lockfile".

## Referensi
- `src/auth/hash.js:42`, `seed.js`, `deploy/staging.env`
- Log lengkap: `/tmp/staging-auth.log` (sudah di-copy, aman dibuang dari konteks)
```

## Anti-pattern

- ❌ Paraphrase error message — detail persis (hash, kode, tanda baca) sering jadi kunci diagnosis.
- ❌ Membuang percobaan yang gagal — "cara X gagal karena Y" itu informasi berharga, hemat waktu pengulangan.
- ❌ Kompresi jadi kehilangan arah — catatan berisi fakta tapi tidak menjawab "kita mau ke mana".
- ❌ Menyimpan semua karena takut kehilangan — kalau tidak dibedakan mana kritis, hasilnya setebal sumbernya.
- ❌ Lupa menyimpan referensi (log file, command history) untuk yang memang harus tetap ada mentah.
- ❌ Menulis ulang dari ingatan — kompresi harus berdasarkan sumber, bukan rekonstruksi imajinatif.