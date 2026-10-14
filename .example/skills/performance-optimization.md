---
name: "performance-optimization"
description: "Finds and fixes performance bottlenecks: profile first, measure before/after, avoid premature optimization. Invoke when code is slow or user reports performance issues."
---

# Performance Optimization

Skill untuk menemukan dan memperbaiki bottleneck performa dengan cara yang ilmiah: profile dulu, ukur sebelum, ubah, ukur sesudah. Aturannya sederhana: **jangan optimasi apa yang belum diukur**. Sepuh yang sudah bertahun-tahun mikirin performa tahu — 90% "optimasi" yang terasa cerdas itu menyentuh kode yang cuma dipakai 1% dari waktu eksekusi; yang bikin lambat biasanya satu-dua titik yang tidak kamu duga sama sekali.

## Tujuan

Mengubah kode lambat menjadi cukup cepat dengan bukti angka: identifikasi bottleneck via profiling, perbaiki hanya yang terbukti dominan, dan verifikasi perbaikan dengan pengukuran before/after. Bukan menghafal micro-optimization.

## Kapan Memakai

- User lapor "kode ini lambat", "endpoint ini lama", "app-nya nge-lag", "loading berputar-putar terus".
- Ada timeout di produksi, query yang makin lama makin berat, atau resource usage yang mencurigakan.
- Sebelum release fitur yang jelas berpotensi berat (opsional, kalau diminta).

Jangan dipakai untuk: "optimasi" preventif tanpa masalah nyata (premature optimization), atau memperindah kode yang kecepatannya tidak relevan (mis. script sekali jalan).

## Workflow

1. **Reproduksi dan ukur baseline — WAJIB sebelum menyentuh kode.**
   - Minta/ciptakan skenario yang lambat: endpoint apa, input apa, berapa lama sekarang (`curl -w "%{time_total}"`, `time <command>`, atau timing di test).
   - Tentukan metrik: latency (ms), throughput, memory. Catat baseline-nya tertulis — tanpa angka awal, kamu tidak akan tahu apakah perbaikanmu berhasil.
   - Catat environment-nya (dev vs prod, ukuran data) — performa di data kecil sering bohong.

2. **Profile dulu, tebak belakangan.**
   - Jalankan profiler sesuai stack: Python `cProfile`/`py-spy`, Node `--cpu-prof` / clinic.js, Go `pprof`, Java/JVM `async-profiler`, browser DevTools Performance tab, DB `EXPLAIN ANALYZE` untuk query.
   - Cari di output profiler: fungsi mana yang menyumbang waktu eksekusi terbesar (cumulative time, self time). Fokus ke top 1-3, bukan semua.
   - Kalau ragu antara beberapa kandidat, ukur keduanya — jangan pilih pakai feeling.
   - Perhatikan juga: N+1 query, missing index, payload besar, blocking I/O di hot path.

3. **Tentukan perbaikan yang paling berdampak — jangan yang paling keren.**
   - Urutan kandidat perbaikan berdasarkan dampak × biaya (usaha vs resiko). Contoh klasik:
     - N+1 → batch query / join (dampak besar, resiko rendah).
     - Missing index → tambah index (dampak besar, resiko rendah, tapi ukur dulu).
     - Loop O(n²) → O(n) / O(n log n) dengan struktur data yang tepat (dampak besar kalau n besar).
     - Cache hasil mahal (dampak besar kalau data jarang berubah).
     - Micro-optimization (bit shifting, string concat ganti) → biasanya dampak kecil, skip.
   - Pilih 1-2 perbaikan teratas, kerjakan, ukur. Jangan sekaligus semua — kalau hasilnya bagus, kamu tidak tahu yang mana yang bekerja.

4. **Implementasi dengan hati-hati.**
   - Baca kode di sekitar sebelum mengubah — jangan optimasi dengan menebak isi fungsi.
   - Ubah sesedikit mungkin. Jangan refactor ulang seluruh modul "sekalian".
   - Pastikan perilaku tidak berubah: jalankan test yang ada. Kalau area ini tidak punya test, tulis test dasar dulu (lihat skill tdd/refactor).

5. **Ukur sesudah, bandingkan, laporkan.**
   - Jalankan pengukuran yang sama persis dengan baseline (input, environment, metrik yang sama).
   - Hitung selisihnya: "dari 2.4s → 180ms (93% lebih cepat) untuk order dengan 500 item".
   - Kalau tidak ada perbaikan berarti: jujur, coba kandidat berikutnya atau bilang bottleneck-nya di tempat lain (seringnya di DB atau network, bukan di kode).
   - Laporkan: apa yang diukur, angka before/after, apa yang diubah, dan apa yang sengaja TIDAK diubah beserta alasannya.

6. **Jaga agar tidak kembali lambat (hanya kalau diminta/berlaku):**
   - Tambahkan regression test/perf test untuk kasus yang baru diperbaiki, atau catat metriknya di monitoring.

## Checklist Penyelesaian

- [ ] Baseline diukur dan dicatat SEBELUM mengubah kode
- [ ] Profiler dipakai — bukan tebakan — untuk menemukan bottleneck
- [ ] Perbaikan dipilih berdasarkan dampak terukur, bukan "terasa" atau "katanya"
- [ ] Hanya 1-2 perbaikan sekaligus supaya efeknya bisa diatribusikan
- [ ] Kode di sekitar dibaca sebelum diubah
- [ ] Perilaku tidak berubah — test yang ada tetap hijau
- [ ] Pengukuran after memakai skenario yang sama dengan before
- [ ] Hasil dilaporkan dengan angka: before → after
- [ ] Kalau tidak ada perbaikan: dilaporkan jujur, bukan dibuat-buat
- [ ] Tidak ada optimasi micro yang tidak berdampak di dalam diff

## Prinsip

- **Measure, don't guess.** Insting soal performa sering salah — profiler tidak pernah bohong, ego yang bohong.
- **Perbaiki yang dominan.** Mempercepat fungsi yang dipanggil sekali sehari tidak mengubah apa pun yang user rasakan.
- **Hindari premature optimization.** Kode yang sulit dibaca demi 2ms yang tidak terasa adalah pajak yang dibayar setiap orang yang baca, untuk keuntungan yang tidak pernah ada.
- **Trade-off diakui.** Cache menambah kompleksitas & stale data; index memperlambat write. Sebutkan keduanya.

## Contoh

**User:** "Endpoint GET /api/orders makin lama makin berat, sekarang 3 detik di data 10 ribu order."

Langkah:

1. Baseline: `curl -w "%{time_total}" https://staging/api/orders?page=1` → 3.1s.
2. Profile: jalankan profiler di handler; hasilnya 82% waktu di `OrderRepository.get_orders` yang memanggil query per item order (N+1). Juga `EXPLAIN ANALYZE` menunjukkan scan penuh pada tabel `order_items` (belum ada index `order_id`).
3. Keputusan: (a) ganti loop query per item dengan satu `SELECT ... WHERE order_id IN (...)`; (b) tambah index `order_items(order_id)`. Dua perbaikan, dampak besar, resiko rendah.
4. Implementasi dengan test tetap hijau.
5. Ukur ulang: 3.1s → 210ms untuk skenario yang sama. Laporkan: N+1 dihilangkan, index ditambah — catat bahwa index menambah sedikit biaya write, tapi tidak signifikan untuk volume ini.

Kalau ternyata setelah profile bottleneck-nya di query eksternal (mis. call ke service lain yang lambat), jawabannya bisa berubah: cache response, atau timeout yang lebih cerdas — dan tetap dengan pengukuran.

## Anti-pattern

- ❌ Optimasi tanpa ukur baseline — "aku rasa ini lebih cepat" bukan laporan.
- ❌ Menebak bottleneck padahal profiler tersedia dan gampang dijalankan.
- ❌ Menerapkan 6 "perbaikan" sekaligus lalu mengklaim semuanya berhasil.
- ❌ Micro-optimization di hot path yang salah (mengoptimasi kode yang cuma 2% dari waktu eksekusi).
- ❌ Optimasi yang mengubah perilaku (mis. cache tanpa invalidasi → data basi) tanpa bilang.
- ❌ Menghapus test atau menurunkan kualitas baca demi performa tanpa data.
- ❌ Refactor besar-besaran "sambil optimasi" — dua pekerjaan, dua diff.
- ❌ Bilang "sudah dioptimasi" padahal belum diukur ulang.