---
name: "architecture-improver"
description: "Identifies architectural debt and evolves structure toward cleaner design: extraction, decoupling, gradual migration. Invoke when codebase feels tangled or hard to change."
---

# Architecture Improver

Codebase berantakan itu bukan dosa — yang dosa adalah membiarkannya tanpa rencana. Skill ini untuk mendiagnosis architectural debt dengan bukti (bukan perasaan), lalu merombaknya bertahap tanpa menghentikan produksi. Tujuannya bukan codebase sempurna, tapi codebase yang makin murah untuk diubah.

## Tujuan

Mengubah codebase yang terasa "susah diubah" menjadi lebih bersih: identifikasi debt (god object, dependency kusut, duplikasi, layer violation) dengan data terukur, susun perbaikan bertahap yang tiap langkahnya tetap hijau, dan eksekusi aman dengan checkpoint. Output: daftar debt terprioritas + rencana evolusi + perubahan yang sudah dieksekusi dan terukur.

## Kapan Memakai

- User bilang: "kode ini susah banget diubah", "nambah fitur kecil aja makan waktu berhari-hari".
- Banyak duplikasi, file raksasa (1000+ baris), god object, atau circular import.
- Mau menerapkan boy-scout rule: rapikan arsitektur sambil menambah fitur.
- Sebelum estimasi fitur besar, mau tahu beban teknis yang menghadang.

Jangan pakai kalau: mau desain dari nol (codebase-design), mau ekstrak satu unit (module-extractor), atau mau ganti framework (migration-planner).

## Workflow

1. **Ambil bukti, bukan opini.** Ukur dengan tool per ekosistem: file terbesar (`wc -l` diurutkan, atau `cloc`), kepadatan import, circular dependency (`madge` untuk JS, `import-linter` untuk Python, `cargo depgraph` untuk Rust), duplikasi (`jscpd`, atau grep blok yang identik strukturnya), file dengan terlalu banyak tanggung jawab (baca 2 file terbesar).
   - Output: data angka + lokasi (file:baris), bukan perasaan.
2. **Klasifikasi temuan.** Kelompokkan: (a) god file/module — ribuan baris, banyak tanggung jawab; (b) dependency kusut/circular; (c) duplikasi lintas modul; (d) layer violation (mis. UI akses DB langsung); (e) dead code — serahkan ke skill dead-code-hunter. Tiap temuan wajib punya lokasi.
   - Output: 5-10 temuan berkelompok dengan bukti lokasi.
3. **Prioritaskan: dampak × risiko.** Dampak = seberapa sering developer tersandung di sini (frekuensi perubahan file itu). Risiko = seberapa besar/berbahaya perubahan perbaikannya. Mulai dari dampak tinggi + risiko rendah (kemenangan cepat), bukan dari yang paling jelek secara visual.
   - Output: daftar prioritas; 1-3 item teratas yang akan dikerjakan.
4. **Rencanakan evolusi bertahap.** Untuk tiap item: urai jadi langkah kecil yang tiap langkahnya build + test tetap hijau. Pilih strategi per item: extract (pisah fungsi → file → modul), decouple (balik arah dependency lewat interface/adapter), atau consolidate (gabung pecahan yang terlalu kecil). Tulis checkpoint git per langkah.
   - Output: rencana langkah demi langkah ber-checkpoint.
5. **Eksekusi satu langkah kecil.** Kerjakan langkah pertama saja: refactor + test + build hijau + commit. Kalau macet di tengah, rollback ke checkpoint terakhir dan sesuaikan rencana — jangan dipaksa lewat. Satu langkah gagal bukan kegagalan rencana, tapi data untuk merevisi rencana.
   - Output: satu commit bersih + suite hijau.
6. **Ukur ulang.** Jalankan metrik langkah 1 lagi, bandingkan dengan baseline: file raksasa mengecil? circular berkurang? Catat progresnya angka demi angka — bukti yang bisa ditunjukkan ke tim dan manajemen.
   - Output: tabel baseline vs sekarang.
7. **Iterasi.** Lanjut ke item berikutnya sampai prioritas habis atau codebase "cukup bersih". Berhenti di "cukup" itu disiplin: bersih itu bukan tujuan, murahnya perubahan itulah tujuannya. Kalau metrik sudah stabil dan keluhan berhenti, selesai.

## Checklist Penyelesaian

- [ ] Temuan debt didukung data metrik + lokasi, bukan opini
- [ ] Temuan diklasifikasi (god file, circular, duplikasi, layer violation, dead code)
- [ ] Prioritas berdasar dampak × risiko, bukan yang paling jelek
- [ ] Rencana bertahap dengan checkpoint hijau per langkah
- [ ] Minimal satu langkah dieksekusi, suite hijau, ter-commit
- [ ] Metrik diukur ulang, progres tercatat angka
- [ ] Tidak ada big-bang rewrite tanpa rencana rollback

## Contoh

**Temuan (data):** `src/app.js` 2400 baris, 40 handler; `app.js` di-import 12 file lain → god object. Dampak tinggi (semua fitur lewat sini), risiko rendah untuk memisah handler auth (logika sudah terisolasi).

**Rencana F1:** (1) buat `src/auth/`, pindah 3 handler paling independen → test hijau; (2) pindah sisanya → test hijau; (3) hapus import silang dari `app.js` → test hijau. Hasil: `app.js` 900 baris, siap ke F2 (pisah payment).

**Bukti progres:** `app.js` 2400 → 900 baris; import circular 3 → 0.

## Tool Bukti per Ekosistem

- **JavaScript/TypeScript:** `madge --circular src/` untuk circular import; `jscpd` untuk duplikasi; `cloc` untuk ukuran file; `knip` untuk export yang tidak terpakai.
- **Python:** `import-linter` untuk dependency contract; `ruff` / `pylint` untuk import melanggar; `vulture` untuk kode tak terpakai; `pytest --cov` untuk coverage sebagai petunjuk dead branch.
- **Go:** `go list -deps` + `go mod graph` untuk peta dependency; `staticcheck` untuk masalah struktur; `go vet` untuk kesalahan umum.
- **Rust:** `cargo depgraph` untuk dependency antar-modul; `cargo clippy` untuk lint struktur; `cargo llvm-cov` untuk coverage.
- **Java:** `jdeps` untuk dependency antar-package; PMD/Checkstyle untuk kompleksitas; `sonar-scanner` untuk laporan terpusat kalau tersedia.

Angka dari tool ini adalah bahasa yang bisa dipakai ngobrol dengan tim dan manajemen — "12 file mengimport `app.js`" lebih meyakinkan daripada "`app.js` itu kayaknya god object". Gunakan yang tersedia di ekosistemnya saja; jangan memaksa tool dari bahasa lain.

Catatan: kalau repo tidak punya test suite sama sekali, langkah pertama dari pekerjaanmu bukan refactor, tapi menyarankan test untuk area yang akan disentuh — tanpa jaring pengaman, "perbaikan arsitektur" cuma pindah masalah.

## Trade-off

1. **Utang vs biaya.** Tidak semua debt wajib dibayar — bayar yang menghalangi perubahan, biarkan yang diam saja; membayar utang yang tidak mengganggu itu juga biaya.
2. **Kecepatan vs kedalaman.** Satu langkah kecil per sesi terasa lambat, tapi totalnya lebih cepat daripada refactor besar yang gagal dan harus diulang dari nol.
3. **Struktur vs kebiasaan.** Struktur baru yang ideal harus tetap menghormati pola yang sudah dikuasai tim — pindah pola sekaligus pindah struktur = dua perubahan dalam satu langkah, dua kali risiko.

## Anti-pattern

- ❌ Rewrite total "biar bersih" — produksi berhenti, tim kejar fitur sambil berkelahi dengan codebase baru; big-bang = big risk.
- ❌ Refactor tanpa test sebagai jaring pengaman — refactor adalah perubahan perilaku yang tidak boleh mengubah perilaku.
- ❌ "Sekalian aja" — scope creep yang menelan fitur lain dalam satu commit.
- ❌ Membersihkan yang tidak mengganggu — debt yang tidak menyakitkan tidak perlu diutang.
- ❌ Menyalahkan orang ("siapa yang bikin ini") — debt itu akumulasi keputusan wajar; yang penting diturunkan, bukan dihakimi.