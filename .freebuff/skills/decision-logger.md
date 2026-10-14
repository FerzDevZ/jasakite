---
name: "decision-logger"
description: "Records architectural and technical decisions (ADR-style): context, options, chosen path, rationale. Invoke after significant design decisions."
---

# Decision Logger

Pencatat keputusan ala ADR (Architecture Decision Record). Skill ini mendokumentasikan keputusan arsitektur/teknis yang signifikan: konteks masalahnya, opsi yang dipertimbangkan, jalan yang dipilih, dan alasan kenapa. Enam bulan kemudian, saat orang (atau dirimu sendiri) bertanya "kok bisa kode begini?", jawabannya sudah menunggu di file — tidak perlu autopsi git log. Dulu saya sering mikir "ah, ini pasti kebaca dari kodenya" — ternyata tidak pernah.

## Tujuan

Menghasilkan ADR singkat (1 file per keputusan, biasanya di `docs/adr/`) yang menjawab pertanyaan: kenapa keputusan ini diambil, opsi apa yang ditolak dan kenapa, apa konsekuensinya, dan kapan keputusan ini perlu ditinjau ulang. Tujuannya bukan birokrasi — tujuannya supaya keputusan bisa dipahami, dipertahankan, atau dibatalkan dengan benar.

## Kapan Memakai

- Keputusan arsitektur signifikan: pilih framework/database/library, desain API, struktur modul, strategi migrasi, trade-off performa.
- Keputusan yang berdampak lama dan sulit dibalik — inilah yang paling layak dicatat.
- User bilang "kenapa dipilih X?" atau "catat keputusan ini".
- Sepulang dari diskusi/meeting yang menghasilkan keputusan desain.

Jangan pakai kalau: hanya keputusan sepele (nama variabel, format string), pilihan yang gampang dibalik (mana-mana juga sama), atau keputusan yang sudah terdokumentasi baik di code comment (kalau begitu, arahkan untuk pakai comment).

## Struktur ADR

Gunakan format ADR standar (bukan narasi bebas):

```markdown
# ADR-<nomor>: <Judul Keputusan>

- Status: <Proposed | Accepted | Deprecated | Superseded by ADR-X>
- Tanggal: <YYYY-MM-DD>

## Konteks
- Masalah/kendala yang memicu keputusan ini (dengan fakta, bukan opini)

## Opsi yang Dipertimbangkan
- Opsi A: ... (kelebihan & kekurangan singkat)
- Opsi B: ...
- Opsi C: ...

## Keputusan
- Jalan yang dipilih, dalam satu-dua kalimat tegas ("Kita pakai X untuk Y")

## Alasan
- Kenapa opsi ini menang; trade-off yang diterima

## Konsekuensi
- Positif: ...
- Negatif / biaya yang harus dibayar: ...
- Kapan keputusan ini perlu ditinjau: ...
```

Nomor ADR berurutan (`ADR-001`, `ADR-002`, ...). Satu keputusan = satu file.

## Workflow

1. **Cek direktori ADR.** Cek `docs/adr/` (atau `decisions/`, ikuti konvensi proyek) — lihat nomor terakhir dan format yang dipakai. Kalau belum ada direktori, buat `docs/adr/` dan `README.md` berisi daftar singkat ADR.
   - Output yang diharapkan: tahu nomor ADR berikutnya + format yang konsisten dengan yang lama.
2. **Kumpulkan konteks.** Jawab: apa masalah nyata yang memicu keputusan? Fakta apa yang relevan (volume data, jumlah user, deadline, constraint operasional)? Konteks harus berdiri sendiri — pembaca 6 bulan lagi tidak ikut diskusi ini.
   - Output: 3-5 baris konteks dengan fakta.
3. **Buat daftar opsi yang sungguh dipertimbangkan.** Tulis semua opsi yang dibahas (minimal 2, idealnya 3+). Untuk tiap opsi: satu baris kelebihan, satu baris kekurangan. Jangan menambah opsi yang tidak pernah dibahas — daftar ini harus jujur mencerminkan diskusi.
4. **Tulis keputusan dengan tegas.** Hindari kata ragu-ragu ("mungkin", "sepertinya"). Format: "Kita pakai `<X>` untuk `<tujuan>`". Keputusan yang tidak tegas = bukan keputusan.
5. **Tulis alasan.** Ini bagian terpenting: kenapa menang. Sertakan trade-off yang DITERIMA — jangan cuma kelebihan. Kalau alasan utamanya "paling cepat implementasinya", katakan itu; bukan alasan murahan, itu alasan nyata.
   - Output yang diharapkan: ADR yang kalau dibaca bisa menjawab "kenapa tidak pakai opsi B?".
6. **Tulis konsekuensi.** Dampak positif (paling banyak 2-3), dampak negatif/biaya yang harus dibayar (jujur!), dan trigger review (mis. "tinjau ulang jika trafik > 10x" atau "saat versi X rilis"). Tanpa ini, ADR hanya arsip mati.
7. **Simpan & daftarkan.** Simpan sebagai `docs/adr/ADR-00X-<slug>.md`, tambahkan link ke daftar di `README.md` (kalau pola itu dipakai), dan referensikan nomor ADR di tempat yang relevan (PR description, memory file).
   - Output yang diharapkan: file ADR tersimpan, terdaftar, dan dirujuk.

## Checklist Penyelesaian

- [ ] Nomor ADR urut, format konsisten dengan ADR lama
- [ ] Konteks berdiri sendiri dengan fakta (bisa dibaca tanpa ikut diskusi)
- [ ] Minimal 2 opsi didokumentasikan dengan kelebihan & kekurangan jujur
- [ ] Keputusan ditulis tegas, tanpa kata ragu
- [ ] Alasan menyebutkan trade-off yang diterima
- [ ] Konsekuensi (positif & negatif) dan trigger review tercatat
- [ ] ADR terdaftar di index dan dirujuk di tempat yang relevan

## Contoh

```markdown
# ADR-007: Database Migration Menggunakan Go Migrate

- Status: Accepted
- Tanggal: 2026-08-12

## Konteks
- 3 orang kontributor, migrasi schema dilakukan manual via psql — dua kali
  terjadi drift antara dev dan staging. Butuh migrasi versi di codebase.

## Opsi yang Dipertimbangkan
- Go Migrate (CLI + library): satu tool untuk semua env, migration SQL murni, populer.
  Kelebihan: versioning jelas, rollback ada. Kekurangan: dependency Go baru untuk tim Python.
- Alembic (Python): sejalan stack (FastAPI + SQLAlchemy).
  Kelebihan: satu bahasa. Kekurangan: belajar API baru, migration auto-generate kadang salah.
- Script bash custom: tidak ada dependency.
  Kelebihan: sederhana. Kekurangan: tidak ada versioning/rollback — masalah awal tidak teratasi.

## Keputusan
- Kita pakai Go Migrate untuk versioning schema, dengan migration SQL ditulis manual.

## Alasan
- Masalah inti adalah drift antar env; Go Migrate menyelesaikannya dengan versioning
  deterministik. Alembic sebenarnya cocok juga, tapi tim sudah familier SQL murni dan
  workflow berbeda dengan SQLAlchemy models — biaya belajar tak sebanding untuk saat ini.
- Trade-off yang diterima: install Go toolchain di CI (satu kali, sekali setup).

## Konsekuensi
- Positif: migrate up/down deterministik di semua env; rollback mudah.
- Negatif: satu toolchain tambahan di proyek; migration harus ditulis SQL manual.
- Tinjau ulang jika: tim mulai menulis banyak migration per minggu (pertimbangkan pakai
  tool satu bahasa), atau Go Migrate ditinggalkan komunitas.
```

## Anti-pattern

- ❌ Mencatat keputusan sepele sampai jadi 50 ADR — tim berhenti membaca; simpan untuk keputusan berdampak dan sulit dibalik.
- ❌ Menulis konteks tanpa fakta ("kita butuh cepat") — harus ada angka/nama konkretnya.
- ❌ Opsi yang ditulis hanya versi "bagusnya sendiri" — ADR perlu opsi yang ditolak supaya "kenapa begini" terjawab.
- ❌ ADR jadi dokumen sakral yang tidak pernah ditinjau — sertakan trigger review, revisi kalau konteks berubah.
- ❌ Menyalin narasi rapat panjang-lebar — ADR itu 30-60 baris, bukan notulensi.