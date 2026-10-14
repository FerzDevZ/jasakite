---
name: "handoff"
description: "Writes complete handoff notes: current state, decisions, next steps, open questions. Invoke when switching agents, sessions, or developers."
---

# Handoff

Serah terima kerja yang rapih. Skill ini menulis catatan handoff yang lengkap: status saat ini, keputusan yang sudah diambil, langkah berikut, dan pertanyaan terbuka — supaya orang (atau agent) berikutnya langsung nyambung tanpa menebak-nebak, dan yang menyerahkan bisa pergi dengan tenang. Handoff yang bagus itu seperti kunci kontrak: kecil, tapi yang memegang bisa langsung menjalankan mobilnya.

## Tujuan

Menghasilkan catatan handoff yang menjawab semua pertanyaan yang akan muncul di sesi berikutnya: "sampai mana?", "kenapa begini?", "apa yang harus kulakukan selanjutnya?", "siapa/apa yang masih menggantung?". Catatan harus cukup mandiri — pembaca tidak boleh butuh bertanya ke orang yang sudah pergi.

## Kapan Memakai

- Ganti agent/sesi di tengah pekerjaan.
- Ganti developer (shift berakhir, orang resign, task dilimpahkan).
- Istirahat panjang di pekerjaan yang belum selesai — tulis dulu biar besok tidak bingung.
- User minta "tuliskan handoff" / "serahkan pekerjaan ini".
- Setelah context-compressor meringkas sesi — handoff memakai ringkasannya sebagai bahan.

Jangan pakai kalau: pekerjaan sudah tuntas (yang dibutuhkan laporan selesai, bukan handoff), atau yang dicari hanya posisi kerja singkat (itu cukup memory file).

## Struktur Catatan Handoff

```markdown
# Handoff — <Nama Task/Fitur/Bug>

## Status Saat Ini
- Apa yang sudah selesai, apa yang belum (jelas batasnya)

## Keputusan & Alasannya
- Keputusan penting yang mempengaruhi cara lanjut; kalau ada, link ADR

## Langkah Berikut
1. Langkah konkret berurutan (bisa dieksekusi tanpa tanya)

## Pertanyaan Terbuka
- Hal yang masih menggantung, butuh keputusan/jawaban orang lain

## Referensi
- File yang diubah, perintah yang dipakai, log, links (PR, issue)
```

Aturan: jujur soal status. "Belum selesai dan macet di X" lebih berharga daripada "hampir selesai" yang ternyata bohong.

## Workflow

1. **Kumpulkan fakta sesi.** Baca ulang hasil kerja: diff yang dibuat, file yang disentuh, output test, error yang tersisa. Kontrak dulu ke kode — jangan tulis dari ingatan kabur. Kalau ada ringkasan dari context-compressor, pakai sebagai kerangka.
   - Output: daftar fakta — apa yang benar-benar terjadi, bukan apa yang kamu kira terjadi.
2. **Tulis `Status Saat Ini`.** Satu paragraf singkat: tujuan task, apa yang sudah jalan, apa yang belum/macet, dan di file mana. Format: "fitur X: 80% jalan — create & read berfungsi (diuji), update & delete belum diimplementasi".
3. **Tulis `Keputusan & Alasannya`.** Hanya keputusan yang mempengaruhi kelanjutan kerja (arsitektur, pendekatan, trade-off yang dipilih). Sertakan alasan satu-dua baris — pembaca perlu tahu kenapa, supaya bisa membatalkan dengan benar kalau perlu.
4. **Tulis `Langkah Berikut`.** Daftar berurutan, tiap langkah harus memenuhi syarat: spesifik (file + apa yang dilakukan), bisa diverifikasi (output yang diharapkan), dan tidak membutuhkan info yang hanya ada di kepala penulis. Langkah pertama harus bisa langsung dieksekusi.
   - Output yang diharapkan: daftar langkah yang bisa dikerjakan tanpa satu pun pertanyaan ke penulis.
5. **Tulis `Pertanyaan Terbuka`.** Semua yang menggantung: keputusan user yang belum dijawab, ambiguitas requirement, blocker yang butuh pihak lain, asumsi yang dibuat tapi belum dikonfirmasi. Tandai yang berisiko tinggi.
6. **Tulis `Referensi`.** Path file yang diubah, perintah penting (test, build), URL (PR, issue), log. Ini peta untuk pembaca — tanpa ini, pembaca mengulang eksplorasi dari nol.
7. **Verifikasi dengan tes "majikan kosong".** Bayangkan penulis hilang dan pembaca hanya punya catatan ini — cek satu per satu: bisa lanjut? Pertanyaan mana yang tidak terjawab? Kalau ada, perbaiki. Kalau bisa, jalankan langkah pertama pembaca untuk memastikan petunjuknya benar (mis. nama file ada, perintah valid).
   - Output: handoff final yang lolos tes.

## Checklist Penyelesaian

- [ ] Status saat ini tertulis jujur dan spesifik, dengan batas jelas selesai/belum
- [ ] Keputusan penting tercatat dengan alasan
- [ ] Langkah berikut berurutan, spesifik, dan bisa diverifikasi
- [ ] Pertanyaan terbuka lengkap, yang berisiko ditandai
- [ ] Referensi lengkap: file, perintah, URL
- [ ] Tidak ada info yang hanya ada di kepala penulis (sudah ditulis semua)
- [ ] Handoff lolos tes "majikan kosong": pembaca bisa lanjut tanpa penulis

## Contoh

```markdown
# Handoff — Fitur export CSV laporan

## Status Saat Ini
- Export CSV untuk laporan bulanan SELESAI: `GET /api/reports/export?from=&to=`
  menghasilkan CSV valid (diuji manual + unit test di `tests/reports_test.py`).
- Belum: filter kolom custom (sudah dirancang, belum dikoding).
- Macet dulu di: streaming response — file besar (>50MB) makan memory; lihat `streaming` note di bawah.

## Keputusan & Alasannya
- Pakai stdlib `csv` module, bukan library pandas — dependency minim, kebutuhan sederhana.
- Response via StreamingResponse (FastAPI), bukan build-then-send — untuk file besar (keputusan 2026-08-10).

## Langkah Berikut
1. Implementasi filter kolom di `src/reports/exporter.py` — query param `columns=a,b,c`,
   default semua kolom. Verifikasi: `curl '.../export?columns=id,name'` hanya berisi 2 kolom.
2. Selesaikan streaming: `exporter.py:88` masih build array penuh; ganti generator
   (lihat TODO di kode). Verifikasi: export 50MB data tidak naik memory > 200MB.
3. Jalankan `pytest tests/` — semua hijau, termasuk 2 test baru.

## Pertanyaan Terbuka
- (HIGH) Format tanggal output: user bilang "biar konsisten" — konfirmasi mau
  ISO 8601 atau format lokal `dd/mm/yyyy`. Asumsi sementara: ISO 8601.
- (LOW) Header kolom pakai label Indonesian (user-facing) atau nama field teknis?

## Referensi
- File diubah: `src/reports/exporter.py`, `src/api/reports.py`, `tests/reports_test.py`
- Uji manual: `curl -o out.csv 'http://localhost:8000/api/reports/export?from=2026-01-01'`
- Issue: https://gitlab.example/reports/issue/42 (task ini) — update progress di sana
```

## Anti-pattern

- ❌ Menulis "hampir selesai" padahal macet — pembaca kaget di tengah jalan; jujur soal status.
- ❌ Handoff tanpa referensi file — pembaca harus eksplorasi ulang, handoff kehilangan gunanya.
- ❌ Menyimpan keputusan penting hanya di kepala ("aku pilih ini karena…") — alasan harus tertulis.
- ❌ Langkah berikut yang tidak bisa diverifikasi ("perbaiki bug itu") — harus spesifik: di file mana, output apa.
- ❌ Menimbun seluruh riwayat percakapan — handoff itu ekstrak, bukan dump; detail panjang ada di link/log.
- ❌ Menulis setelah lupa — handoff ditulis saat konteks masih segar, bukan besok pagi.