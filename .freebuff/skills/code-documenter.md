---
name: "code-documenter"
description: "Writes honest code documentation: why-comments over what-comments, README, API docs, docstrings that match code. Invoke when documenting code, reviewing docs, or fixing outdated docs."
---

# Code Documenter

Dokumentasi yang bagus itu jujur: dia bilang kenapa kode begini, bukan sekadar mengulang apa yang kode sudah bilang. Sepuh sudah muak membaca komentar `// increment i` di samping `i++` — itu bukan dokumentasi, itu gema. Komentar terbaik menjelaskan yang tidak bisa dibaca dari kode.

## Tujuan

Menulis dan memelihara dokumentasi yang benar-benar membantu: komentar "kenapa" (bukan "apa"), docstring yang akurat, README yang memandu, dan docs yang tidak berbohong terhadap kode.

## Kapan Memakai

- Menambahkan komentar/docstring ke kode yang sedang dikerjakan.
- Menulis atau memperbarui README / docs.
- Mengejar dokumen yang sudah tidak sesuai kode (outdated docs).
- Menambah konteks pada kode yang tidak jelas alasannya.

## Prinsip Dasar

1. **Komentar = kenapa, kode = apa.** Kalau komentar mengulang kode, hapus. Kalau komentar menjelaskan keputusan (kenapa pakai cara ini, kenapa tidak cara lain), pertahankan.
2. **Docs yang usang lebih buruk dari tanpa docs.** Docs yang salah menyesatkan lebih parah daripada docs yang tidak ada. Update atau hapus.
3. **Docstring itu kontrak** — param, return, error. Orang memakai docstring untuk memakai fungsi tanpa baca implementasi.
4. **README = pintu masuk** — 30 detik pertama menentukan orang lanjut atau kabur.

## Workflow

1. **Audit yang ada** — baca komentar/docs yang sudah ada: mana yang akurat, mana yang usang, mana yang mengulang kode. Jangan tambah di atas sampah — bereskan dulu.
2. **Tulis komentar kenapa** — untuk bagian yang tidak obvious: keputusan desain, constraint, workaround, alasan tidak memakai cara standar. Referensikan issue/commit bila ada.
3. **Tulis/mutakhirkan docstring API** — signature, deskripsi singkat, tiap param (tipe + arti), return, exceptions/errors. Cocokkan dengan implementasi asli.
4. **Perbarui README** — apa project ini, cara install, cara run, cara test, struktur singkat, link docs. Uji: orang asing bisa jalan dalam 5 menit?
5. **Hapus/update docs usang** — kalau kode berubah tapi docs tidak: update docs, atau tandai jelas kalau deprecated.
6. **Verifikasi akurasi** — comot 5 docstring/komentar acak, bandingkan dengan kode nyata. Kalau ada yang bohong: perbaiki sekarang, bukan nanti.

## Checklist Penyelesaian

- [ ] Tidak ada komentar yang mengulang kode (gema)
- [ ] Keputusan non-obvious punya komentar kenapa
- [ ] Docstring API: params, return, errors — sesuai implementasi
- [ ] README memandu dari nol ke jalan dalam 5 menit
- [ ] Tidak ada docs yang menyalahi kode saat ini
- [ ] Contoh di docs benar-benar bisa dijalankan

## Contoh

**Gema (hapus):**
```js
i++; // increment i
```

**Bermakna (pertahankan):**
```js
// Jangan pakai Math.round di sini: nilai ini harus selalu dibulatkan ke bawah
// agar invoice tidak pernah melebihi total (lihat bug #142).
price = Math.floor(total / qty);
```

## Anti-pattern

- ❌ Komentar apa-yang-sudah-dibilang-kode (`// set name` di `user.setName()`).
- ❌ Docs hasil copy-paste dari fungsi lain (param salah, deskripsi nyasar).
- ❌ Update kode tanpa update docs — diam-diam membuat docs berbohong.
- ❌ README 5000 kata sejarah — padahal user cuma mau tahu cara run.
- ❌ Komentar todo `FIXME` tanpa konteks — siapa, kapan, kenapa.