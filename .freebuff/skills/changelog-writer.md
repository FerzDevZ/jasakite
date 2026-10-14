---
name: "changelog-writer"
description: "Maintains changelog from commits/releases following Keep a Changelog conventions. Invoke when releasing or updating changelog."
---

# Changelog Writer

Penjaga CHANGELOG. Skill ini menyusun dan merawat changelog dari commit/release dengan konvensi Keep a Changelog: versi, tanggal rilis, dan kategori perubahan yang konsisten — supaya siapa pun bisa menjawab "apa yang berubah di versi ini?" tanpa membaca git log. Changelog yang ditulis manual biasanya langsung basi; yang ditulis pas release dengan disiplin, umurnya panjang. Jaman saya mulai dari changelog ala "fix minor bug" — kabur, orang baca tidak dapat apa-apa.

## Tujuan

Menghasilkan dan memelihara `CHANGELOG.md` yang: mengikuti format Keep a Changelog (KAC), berisi perubahan yang bermakna untuk pembaca (bukan semua commit), jujur soal breaking change, dan selalu sinkron dengan release terakhir.

## Kapan Memakai

- Mau rilis versi baru (tag/release) — changelog update pertama, baru versi.
- User minta "update changelog" / "tulis changelog".
- Ada "Unreleased" section yang sudah menumpuk dan perlu dirapikan.
- Review PR yang menyentuh changelog — verifikasi format dan ketepatan isi.

Jangan pakai kalau: itu project internal tanpa release publik (changelog bisa diganti release note di tempat lain), atau changelog-nya bukan praktik proyek — tanya dulu, jangan memaksakan konvensi baru.

## Format Keep a Changelog

```markdown
# Changelog

Semua perubahan menonjol pada proyek ini akan didokumentasikan di file ini.
Format berdasarkan [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
### Changed
### Fixed

## [1.4.0] - 2026-08-10
### Added
- ...

### Changed
- ...

### Fixed
- ...
```

Kategori (opsional sesuai kebutuhan): `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`. Custom kategori boleh — yang penting konsisten. Bahasa changelog ikuti konvensi proyek (baris Bahasa Indonesia boleh, kolom `Added` dkk tetap English).

## Workflow

1. **Cek changelog dan konvensi.** Baca `CHANGELOG.md` kalau ada — lihat format, kategori, bahasa, dan apakah pakai link versi. Cek juga `package.json`/manifest untuk versi sekarang, dan apakah project memakai conventional commits (untuk memudahkan ekstraksi). Kalau belum ada changelog, buat `CHANGELOG.md` dengan header dan section `## [Unreleased]`.
   - Output yang diharapkan: tahu format yang dipakai + versi saat ini.
2. **Kumpulkan perubahan sejak rilis terakhir.** `git log <tag-terakhir>..HEAD --oneline` (atau `git log -n 30` kalau belum ada tag). Baca PR/commit — pahami, jangan terjemahkan mentah. Filter: ambil yang berdampak untuk pengguna/developer, buang chore rutin (rename file internal, fix typo, refactor tanpa perubahan perilaku).
   - Output: daftar perubahan mentah (judul + deskripsi singkat tiap item).
3. **Verifikasi fakta ke kode.** Untuk setiap perubahan penting: centang ke file yang menyentuhinya. Kalau ragu "ini fix apa fitur", lihat diff dan test. Perubahan yang tidak bisa diverifikasi, konfirmasi ke user atau tandai di PR.
4. **Grupkan ke kategori KAC.** Tambahkan item baru ke `[Unreleased]` di kategori yang tepat:
   - `Added` — fitur baru, file/fungsi publik baru.
   - `Changed` — perubahan perilaku yang ada, update dependency mayor.
   - `Deprecated` — yang mulai ditinggalkan.
   - `Removed` — fitur yang dihapus (breaking).
   - `Fixed` — bug fix (jelaskan gejalanya, bukan teknisnya: "login gagal saat password mengandung karakter khusus", bukan "ubah regex di auth.js").
   - `Security` — kerentanan (prioritas, transparan).
5. **Tulis item dengan gaya pembaca.** Format: "Apa yang berubah" + (jika perlu) "dampaknya". Item yang bagus: `- Format ekspor CSV tidak lagi membungkus angka dengan tanda kutip, supaya bisa dibuka di Excel lama`. Satu item = satu perubahan; pecah item majemuk.
   - Output yang diharapkan: `[Unreleased]` terisi lengkap.
6. **Tekan rilis.** Saat rilis: pindahkan isi `[Unreleased]` ke section baru `## [<versi>] - <YYYY-MM-DD>`. Versi mengikuti SemVer — breaking change = mayor, fitur = minor, fix = patch (kalau project otomatis versi-nya, ikuti itu, jangan menghakimi). Kosongkan `[Unreleased]` lagi.
   - Output yang diharapkan: section rilis baru berisi semua perubahan, `[Unreleased]` kosong.
7. **Selesaikan link versi.** Kalau changelog memakai footer link `[1.4.0]: https://.../compare/v1.3.0...v1.4.0`, tambahkan link rilis baru dan update link `Unreleased`. Tanpa ini, navigasi antar versi putus.
8. **Verifikasi.** Baca ulang: ada duplikat antar kategori? Ada item yang tidak bisa dipahami tanpa konteks internal? Semua breaking change terlihat jelas (`Removed`/`Changed` dengan catatan breaking)? Kalau mau ketat: cek tiap commit penting punya item (tidak ada yang terlewat) dan tiap item terhubung ke commit/PR.

## Checklist Penyelesaian

- [ ] Format KAC diikuti: kategori, versi, tanggal, (jika ada) link compare
- [ ] Semua perubahan berdampak sejak rilis terakhir tercatat
- [ ] Tidak ada item yang hanya terjemahan commit internal (typo/chore)
- [ ] Breaking change jelas terlihat dan diberi catatan
- [ ] Item `Fixed` menjelaskan gejala, bukan detail teknis
- [ ] Versi rilis sesuai SemVer/disiplin proyek
- [ ] `[Unreleased]` berisi perubahan yang belum dirilis (bukan riwayat)
- [ ] Fakta diverifikasi ke kode — tidak ada klaim karangan

## Contoh

Dari `git log v1.3.0..HEAD`:

```markdown
## [Unreleased]
### Added
- Endpoint `GET /api/reports/export` untuk ekspor laporan bulanan ke CSV (#42)

### Changed
- Update dependency `bcrypt` 2.4 → 5.1 (perbaikan keamanan hash, khawatir format hash lama; migrasi otomatis saat login pertama)

### Fixed
- Login gagal saat password mengandung karakter khusus seperti `@` atau `#`
- Angka dalam laporan PDF terpotong di kolom lebar

## [1.3.0] - 2026-07-15
### Added
- Halaman dashboard ringkasan mingguan
...
```

Kalau rilis 1.3.1: pindahkan isi Unreleased ke `## [1.3.1] - 2026-08-12`, kategori `Fixed` berisi 2 fix, `Changed` tetap di Unreleased (belum rilis).

## Anti-pattern

- ❌ Menyalin semua commit mentah ke changelog — kebisingan; changelog untuk manusia, bukan untuk git log.
- ❌ Item ambigu ("perbaikan berbagai bug") — harus spesifik; kalau tidak bisa spesifik, itemnya belum dipahami.
- ❌ Menulis detail teknis internal di item Fixed ("ubah regex di auth.js:221") — pembaca butuh gejalanya.
- ❌ Update changelog SEBELUM tahu apa yang berubah — ekstrak dari log/PR dulu, baru menulis.
- ❌ Update changelog TAPI tidak versi, atau rilis TAPI changelog basi — keduanya harus jalan bersama.
- ❌ Menyembunyikan breaking change — itu yang paling mahal harganya kalau disembunyikan.