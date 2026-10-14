---
name: "migration-planner"
description: "Plans multi-step migrations (framework, language, schema) with compatibility strategy and rollback path. Invoke when upgrading frameworks, languages, or large breaking changes."
---

# Migration Planner

Migrasi besar itu marathon, bukan sprint. Skill ini untuk merencanakan perpindahan framework/language/schema secara bertahap: strategi kompatibilitas, checkpoint yang bisa dicek, dan jalur mundur kapan saja. Prinsipnya satu: produksi tidak boleh berhenti, dan rencana harus bisa dibatalkan di tengah jalan tanpa luka.

## Tujuan

Menghasilkan rencana migrasi yang bisa dieksekusi tanpa big-bang: analisis scope, strategi transisi (strangler / incremental), peta kompatibilitas tiap titik sentuh, fase bertahap dengan checkpoint + rollback path, dan estimasi risiko. Rencana yang baik adalah rencana yang bisa di-rollback pada fase mana pun.

## Kapan Memakai

- Upgrade framework major (React 16 → 18, Express 4 → 5, Django 3 → 5).
- Ganti bahasa/runtime (JS → TS, Python 2 → 3, monolith → services).
- Migrasi schema/database (ganti DB engine, rename kolom massal, SQL → NoSQL).
- User bilang "kita migrasi X" dan belum ada rencana tertulis.

Jangan pakai kalau: minor/patch upgrade (cukup dependency-auditor), atau cuma reorganisasi folder (codebase-design).

## Workflow

1. **Tentukan tujuan & batas.** Definisikan sukses secara terukur ("semua route berjalan di Express 5, tidak ada lagi Express 4 di tree"). Tulis juga apa yang OUT OF SCOPE — fitur baru dilarang nyasar masuk ke migrasi; kalau masuk, migrasi kehilangan kontrol.
   - Output: definisi sukses + batas scope, tertulis.
2. **Inventarisasi permukaan.** Daftar semua titik sentuh: file yang mengimpor library lama, API schema, config, CI pipeline, dokumentasi. Grep statement impor + jalankan tool adapter otomatis untuk mengukur (`npx @next/codemod`, `django-upgrade`, `ts-migrate`) — biarkan tool mengestimasi volume.
   - Output: inventaris lengkap (jumlah file per jenis perubahan).
3. **Pilih strategi transisi.** Tiga opsi: (a) strangler — sistem lama & baru berjalan paralel, lalu bagian lama dipotong bertahap (paling aman untuk service & schema); (b) incremental in-place — upgrade per modul dalam satu codebase dengan kompatibilitas layer (untuk framework major); (c) big-bang — hanya layak untuk codebase kecil/demo. Pilih (a) atau (b) kalau ada pilihan.
   - Output: keputusan strategi + alasan satu paragraf.
4. **Rancang kompatibilitas layer.** Untuk tiap titik sentuh: bagaimana versi lama dan baru hidup berdampingan — adapter, polyfill, dual-write (untuk schema), feature flag. Tulis interface perantara yang dipakai kedua sisi. Ini bagian yang paling sering diremehkan dan paling sering jadi biang kegagalan.
   - Output: peta titik → strategi kompatibilitas.
5. **Susun fase bertahap dengan checkpoint.** Setiap fase harus: kecil, selesai sendiri (shippable), test hijau, dan bisa di-rollback. Untuk tiap fase tulis: langkah kerja, cara verifikasi keberhasilan, dan rollback-nya apa.
   - Output: daftar fase F1..Fn, tiap fase punya checkpoint + rollback.
6. **Rencanakan rollback path.** Per fase: git tag/branch checkpoint, cara balik (revert commit, matikan feature flag, hentikan dual-write). Rollback harus lebih cepat dari perbaikan — kalau rollback makan waktu sehari, itu bukan rollback, itu recovery plan.
   - Output: tabel fase → checkpoint → action rollback dengan durasi.
7. **Eksekusi F1, verifikasi, putuskan.** Kerjakan fase pertama, test, rilis ke staging (atau produksi jika strategi mengizinkan). Bandingkan metrik/perilaku lama vs baru (log, error rate, performa). Baru putuskan: lanjut ke F2 atau rollback. Jangan pernah lanjut dengan fase menggantung.
   - Output: F1 selesai + bukti verifikasi + keputusan tertulis.
8. **Dokumentasikan sisa rencana.** Rencana lengkap (fase, checkpoint, rollback) disimpan di repo — migrasi sering berpindah tangan dan fase terakhir dikerjakan orang lain. Rencana yang hanya ada di kepala adalah rumor.

## Checklist Penyelesaian

- [ ] Definisi sukses & out-of-scope tertulis
- [ ] Inventaris titik sentuh lengkap (file, schema, config, CI)
- [ ] Strategi transisi dipilih dengan alasan (strangler/incremental/big-bang)
- [ ] Kompatibilitas layer dirancang per titik sentuh
- [ ] Semua fase punya checkpoint + rollback path dengan durasi
- [ ] F1 dieksekusi, diverifikasi, keputusan lanjut/rollback tertulis
- [ ] Rencana tersimpan bisa dieksekusi orang lain

## Contoh

**Migrasi:** Express 4 → 5 (routing & path-parameter berubah). **Strategi:** incremental in-place. **Kompatibilitas:** adapter util untuk route lama; feature flag `USE_V5` di config.

**Fase:** F1: upgrade dependency, flag OFF → perilaku identik, hijau. F2: flag ON di staging, bandingkan error log 3 hari. F3: pindah per-modul ke sintaks v5, flag per-modul. F4: hapus adapter & flag.
**Rollback F2:** flag OFF + redeploy — 2 menit. **Bukti F2:** error rate staging v4 = v5.

## Trade-off

1. **Paralel vs cepat.** Strangler/incremental lebih aman tapi kedua sistem berjalan dalam waktu lama (biaya ganda: maintain, deploy, skill). Big-bang lebih cepat tapi risikonya total. Untuk produksi yang melayani user nyata, biaya paralel hampir selalu lebih kecil daripada risiko big-bang.
2. **Kompatibilitas layer vs kebersihan.** Layer kompatibilitas (adapter, flag, dual-write) itu utang yang disengaja — makin lama dipertahankan, makin mahal bunganya. Rencana yang baik selalu punya fase eksplisit "hapus kompatibilitas layer" di akhir.
3. **Otomasi vs manual.** Tool codemod mempercepat fase mekanis (rename, codemod), tapi jangan biarkan tool memutuskan arsitektur — hasil tool harus direview per-modul, bukan di-commit buta.
4. **Data vs perilaku.** Migrasi schema butuh verifikasi ganda: data tidak hilang (dual-write + reconciler) DAN perilaku tidak berubah (test + metrik). Satu saja cukup untuk bilang "berhasil" — dua-duanya wajib.
5. **Checkpoint itu komitmen, bukan saran.** Kalau sebuah fase tidak bisa di-rollback, fase itu belum layak dimulai.

## Prinsip

1. **Satu variabel berubah per fase.** Kalau satu fase mengubah dua hal sekaligus, kegagalan tidak bisa diisolasi ke penyebabnya.
2. **Rencana boleh berubah, definisi sukses tidak.** Tujuan akhir tetap; jalannya boleh menyesuaikan temuan lapangan.
3. **Migrasi yang tidak pernah selesai lebih mahal daripada migrasi yang dibatalkan.** Tidak ada fase "seterusnya" — setiap fase harus membawa sistem lebih dekat ke tujuan.

Kalau setelah F3 kamu masih belum yakin selesai, itu sinyal untuk berhenti dan mengevaluasi ulang, bukan menambah fase tanpa batas.

## Anti-pattern

- ❌ Big-bang tanpa rollback ("harus berhasil, tidak ada jalan mundur") — itu taruhan, bukan rencana.
- ❌ Migrasi dicampur fitur baru di codebase yang sama — dua variabel berubah sekaligus, error tidak bisa diisolasi.
- ❌ Tanpa baseline metrik/perilaku sebelum mulai — tidak ada cara membuktikan "tidak ada yang berubah".
- ❌ Fase "besar tapi cepat" — fase besar itu yang paling sering gagal dan paling mahal di-rollback; kecil dan sering menang.
- ❌ Migrasi schema tanpa dual-write — data lama hilang tanpa penebusan.

Kalau ragu soal urutan fase, ingat satu aturan jadul: yang bisa balik duluan, jalan duluan.