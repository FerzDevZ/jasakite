---
name: "implement-feature"
description: "Implements a feature end-to-end following existing codebase conventions: context first, smallest diff, verify by build. Invoke when user asks to implement something from a spec, TODO, or ticket."
---

# Implement Feature

Skill untuk mengimplementasikan fitur dari spec, TODO comment, atau ticket — end-to-end, mengikuti konvensi codebase yang sudah ada. Bedanya dari code-generator: di sini ada "kontrak" (spec/ticket) yang harus dipenuhi, bukan permintaan bebas, jadi langkah pertama selalu memahami kontrak dan codebase sebelum menulis apa pun.

## Tujuan

Menerjemahkan spec/TODO/ticket menjadi perubahan kode yang berfungsi dan konsisten dengan codebase: diff sekecil mungkin, konvensi dihormati, dan kebenaran dibuktikan dengan build/test — bukan janji.

## Kapan Memakai

- User kasih spec, ticket, issue, atau TODO comment dan minta "implementasikan".
- Ada task yang sudah didefinisikan jelas (acceptance criteria) tapi belum ada kodenya.
- User minta "lanjutin dari sini" dengan mengacu ke dokumen/issue tertentu.

Jangan dipakai untuk: permintaan menulis kode bebas tanpa spec (pakai code-generator), debug (pakai skill debugging), atau mengubah perilaku kode yang sudah jalan tanpa alasan dari spec.

## Workflow

1. **Baca dan pahami kontrak dulu.**
   - Baca spec/ticket/TODO sampai paham: apa yang harus terjadi (behavior), siapa penggunanya, apa acceptance criteria-nya.
   - Kalau ada yang ambigu, jangan menebak — tanyakan, atau catat asumsi dengan eksplisit sebelum mulai.
   - Cari di codebase: apakah bagian fitur ini sudah setengah jadi? Ada stub, TODO lain, atau branch yang relevan?

2. **Petakan konvensi codebase sebelum menulis kode.**
   - Baca file yang akan disentuh secara penuh — jangan cuma bagian yang kelihatan relevan.
   - Identifikasi pola sekitarnya: bagaimana error ditangani, bagaimana test ditulis, bagaimana modul diorganisir (folder, penamaan file).
   - Cek file konfigurasi: package.json scripts (`build`, `test`, `lint`), CI config, dsb.
   - Catat konvensi yang ditemukan: "di project ini, service pakai constructor injection", "semua handler punya middleware auth", dst.

3. **Rencanakan diff terkecil yang memenuhi spec.**
   - Tulis daftar perubahan yang dibutuhkan: file A ditambah fungsi X, file B dipanggil di sini, dsb.
   - Coret apa pun yang tidak dibutuhkan untuk memenuhi acceptance criteria.
   - Identifikasi risiko: perubahan yang bisa memecah behavior lama (tandai untuk diuji).

4. **Implementasi mengikuti konvensi.**
   - Ikuti style dan pola yang sudah ada — kalau codebase pakai kata kerja tertentu di nama fungsi, pakai juga.
   - Tambahkan atau perbarui test yang mencerminkan acceptance criteria. Satu test per perilaku yang diminta spec.
   - Jangan perbaiki hal di luar scope; kalau nemu bug lain saat jalan, catat dan laporkan, jangan diembat sekalian (kecuali menghalangi fitur ini).

5. **Verifikasi dengan build — wajib, bukan opsional.**
   - Jalankan build/type-check: `npm run build`, `tsc --noEmit`, `go build ./...`, `cargo check`, `python -m py_compile ...`.
   - Jalankan test yang relevan, lalu seluruh suite kalau waktunya masuk akal: `npm test`, `go test ./...`, `pytest`.
   - Jalankan linter/format kalau ada config-nya.
   - Kalau gagal: baca pesan error lengkap, telusuri ke akar (file/baris mana), perbaiki, ulangi. Jangan "perbaiki" dengan menonaktifkan test atau mengecilkan scope.

6. **Laporkan hasil dengan jujur.**
   - Sebutkan: file yang diubah, perilaku baru, cara memverifikasi (perintah yang dijalankan + hasil).
   - Sebutkan asumsi yang dibuat dan batasan yang tersisa (mis. "belum ada migration DB — masih pakai seed manual").
   - Sebutkan hal di luar scope yang ditemui tapi tidak disentuh.

## Checklist Penyelesaian

- [ ] Spec/ticket dibaca dan acceptance criteria dipahami; asumsi dicatat
- [ ] File yang akan disentuh dibaca penuh (bukan parsial)
- [ ] Konvensi codebase diidentifikasi dan diikuti
- [ ] Diff minimal — hanya perubahan yang dibutuhkan spec
- [ ] Test mencerminkan acceptance criteria
- [ ] Build / type-check hijau
- [ ] Seluruh test suite hijau
- [ ] Tidak ada perubahan di luar scope
- [ ] Hasil diverifikasi dengan perintah nyata (bukan "seharusnya jalan")
- [ ] Asumsi dan batasan dilaporkan ke user

## Prinsip

- **Context first.** Kode yang ditulis tanpa membaca konteks adalah tebakan. Sepuh baca dulu, baru bicara.
- **Kecil itu fitur.** Diff kecil lebih mudah direview, lebih mudah di-rollback, lebih sedikit yang bisa rusak. Jangan sekalian refactor.
- **Verifikasi, jangan percaya.** Nilai kerja diukur dari build hijau dan test lulus, bukan dari keyakinan.

## Contoh

**Ticket:** "TODO: tambahkan validasi email ke form registrasi — email harus format valid, error ditampilkan di field."

Langkah AI agent yang benar:

1. Baca file form registrasi (`src/pages/Register.tsx`) dan file validasi yang ada (`src/utils/validation.ts`).
2. Temukan bahwa project sudah punya `isValidEmail` di utils — tidak perlu tulis sendiri.
3. Baca test yang ada (`src/pages/__tests__/Register.test.tsx`) untuk lihat pola mock & render.
4. Tambahkan di handler submit: `if (!isValidEmail(email)) { setFieldError("email", "Format email tidak valid"); return; }` — mengikuti pola `setFieldError` yang sudah dipakai untuk field lain.
5. Tambahkan test: submit dengan email invalid → error muncul; submit dengan email valid → error tidak muncul.
6. Jalankan `npm run build` dan `npm test` — keduanya hijau.
7. Laporkan: 2 file diubah (Register.tsx, test), konvensi `isValidEmail` dipakai ulang, tidak menyentuh backend karena ticket tidak minta.

## Anti-pattern

- ❌ Langsung nulis kode tanpa baca spec — hasilnya fitur yang "mirip" tapi tidak sesuai acceptance criteria.
- ❌ Menebak saat spec ambigu; tanya atau tulis asumsi, jangan diam.
- ❌ Refactor file sekitarnya "biar rapi" — itu bukan tugas ticket ini.
- ❌ Menghapus/melemahkan test lama supaya hijau.
- ❌ Bilang "sudah selesai" tanpa menjalankan build/test.
- ❌ Menambah dependency baru padahal ada solusi dengan yang sudah terpasang.
- ❌ Nemu bug di luar scope, diam saja — laporkan, biar pemilik ticket yang putuskan.