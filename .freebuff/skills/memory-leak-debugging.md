---
name: "memory-leak-debugging"
description: "Finds memory leaks and high memory usage: heap snapshots, allocation analysis, fix strategies. Invoke when memory grows over time or OOM occurs."
---

# Memory Leak Debugging

Memory leak itu pajak diam-diam: app jalan mulus, tapi pelan-pelan makan RAM sampai suatu hari OOM killer datang mengetuk. Gejalanya khas: RSS naik terus kalau dibiarkan jalan, restart bikin "sembuh" — itu bukan sembuh, itu reset. Kuncinya jangan nebak. Ada alat untuk semua ekosistem: heap snapshot, profiler, allocation tracing. Ukur dulu di mana memory tumbuh, baru cari siapa yang menahan object itu tetap hidup.

## Tujuan

Menemukan memory leak dan penggunaan memory tinggi: mengukur pertumbuhan, mengambil heap snapshot, menganalisis allocation, dan menerapkan strategi fix — sampai memory stabil dan OOM tidak kembali.

## Kapan Memakai

- Memory usage naik terus seiring waktu (`free -h` / `top` / dashboard monitoring menunjukkan trend naik).
- OOM killer membunuh proses: `dmesg | grep -i oom` atau exit 137 / `SIGKILL`.
- Container/VM restart berkala karena memory cap — pola klasik leak bertahap.
- App crash setelah jalan lama ("jalan 3 hari terus mati").
- Code review: pola yang rawan leak (cache tanpa eviction, listener tidak di-unsubscribe, dsb.).

## Workflow

### Langkah 1: Konfirmasi ada leak (bukan sekadar memory tinggi)

1. Ukur trend: `ps aux --sort=-rss | head`, atau sampling `RSS` tiap 10 menit (`watch -n 600 'ps -o rss,cmd -p <pid>'`).
2. Kriterium leak: memory **naik monoton** tanpa batas di kondisi steady (load konstan). Kalau naik lalu turun = GC/cache normal. Kalau langsung tinggi sejak start = alokasi besar, bukan leak.
3. Cek baseline: restart app, catat RSS awal, jalan dengan beban normal 1-2 jam, bandingkan. Leak = pertumbuhan terus menerus.
4. Cek dmesg untuk OOM: `dmesg -T | grep -i -E "oom|killed process"` — kalau ada, proses mana yang dibunuh.

### Langkah 2: Ukur & profiling

5. Ambil heap snapshot berurutan (2 snapshot, jarak waktu dengan beban konstan):
   - Go: `pprof` — `go test -bench` atau attach: `curl http://localhost:6060/debug/pprof/heap > heap1.prof`, ulangi → `go tool pprof -top -diff_base=heap1.prof heap2.prof`.
   - Java: `jmap -dump:live,format=b,file=heap1.hprof <pid>` dua kali, bandingkan dengan Eclipse MAT (Leak Suspects report) atau JProfiler.
   - Node: `node --inspect` → Chrome DevTools Memory tab → Heap Snapshot dua kali → bandingkan "Retained Size" + "Allocation timeline".
   - Python: `tracemalloc` — `python -m tracemalloc`, atau `objgraph` untuk count per tipe: `objgraph.show_most_common_types()`.
   - C/C++: `valgrind --leak-check=full ./app` (lambat tapi teliti), atau `ASAN_OPTIONS=detect_leaks=1` build dengan `-fsanitize=address`.
6. Diff dua snapshot: **retained size** paling besar yang tumbuh = tersangka utama. Untuk Go, `-top -diff_base` langsung menunjukkan fungsi yang menambah allocation.

### Langkah 3: Telusuri siapa yang menahan object

7. Untuk GC language (Java/Node/Python/Go): leak = object tetap **reachable** dari root padahal tidak terpakai. Cari referensi: siapa yang menahan? (MAT: "Path to GC Roots"; DevTools: "Retainers" panel).
8. Pola leak klasik yang sering ketemu:
   - **Cache/map tanpa eviction**: `map[key] = value` tanpa limit/expiry — data tumbuh tak terbatas. Fix: LRU, TTL, atau batas ukuran.
   - **Listener/observer tidak di-unsubscribe**: event emitter, pub/sub, DOM listener di daur ulang komponen. Fix: unsubscribe di destroy.
   - **Static/global collection**: variabel static yang terus di-append.
   - **Callback/closure menahan konteks besar**: closure menyimpan scope besar (mis. seluruh response object) padahal butuh satu field. Fix: pass value kecil.
   - **Connection/pool tidak ditutup**: koneksi DB/HTTP/file yang di-leak per request. Fix: `defer close()`, try-with-resources, `with` block.
   - **Off-by-one lifecycle native**: object native (Bitmap, buffer, handle) tidak di-release — untuk hybrid app.
9. Untuk native (C/C++): valgrind report menunjuk allocation site yang tidak pernah di-free. Baca stack allocasinya — biasanya jelas: fungsi yang membuat object tapi tidak mengembalikan kepemilikannya.

### Langkah 4: Fix

10. Fix paling sederhana yang menghilangkan pertumbuhan: batasi cache, unsubscribe listener, tutup resource — sesuai pola di atas.
11. Kalau fix "mengurangi tapi masih tumbuh pelan": ulangi snapshot & diff sampai pertumbuhan hilang. Iterasi ini wajib — satu fix jarang menyelesaikan semua leak.
12. Tambahkan guard di level arsitektur kalau perlu: cache eviction otomatis, limit collection, monitoring memory per komponen.
13. Untuk OOM crash yang tidak bisa ditunggu: tambahkan heap dump otomatis — JVM `-XX:+HeapDumpOnOutOfMemoryError`, Node `--heapsnapshot-near-heap-limit=1`, Go `GODEBUG=gctrace=1` di log. Kejadian berikutnya langsung terekam.

### Langkah 5: Verifikasi

14. Jalankan dengan beban konstan 24-48 jam (atau stress test dipercepat): RSS harus stabil di plateau. Kalau masih naik, balik ke Langkah 2.
15. Pastikan fix tidak mengorbankan performa: cache yang di-evict keras bisa bikin CPU naik — ukur keduanya.
16. Tambahkan monitoring: alert kalau RSS > threshold atau trend naik N jam berturut-turut.

## Checklist Penyelesaian

- [ ] Leak dikonfirmasi (trend naik monoton, bukan cache normal)
- [ ] OOM killer dicek via dmesg
- [ ] Dua heap snapshot diambil & di-diff
- [ ] Retained size terbesar teridentifikasi
- [ ] Path ke GC root / allocation site ditemukan
- [ ] Pola leak diklasifikasikan & di-fix
- [ ] Verifikasi: RSS stabil dengan beban konstan
- [ ] Heap dump otomatis aktif & monitoring terpasang

## Contoh

**Skenario:** Service Node mati tiap 2-3 hari. `dmesg` menunjukkan OOM killer. Restart bikin normal lagi.

1. Konfirmasi: `curl /metrics` RSS naik dari 200 MB → 1.5 GB dalam 2 hari, load konstan.
2. Snapshot: DevTools → heap snapshot jarak 30 menit → diff: `Map` tumbuh 800 MB. Retainers: `userSessions` — sebuah `Map` global.
3. Baca kode: `userSessions.set(sessionId, data)` di login, tapi logout lupa `delete`. Session expired juga tidak dibersihkan.
4. Fix: hapus session di logout + tambah TTL sweeper tiap 10 menit untuk session expired. Dua baris + interval.
5. Verifikasi: jalan 48 jam dengan beban produksi → RSS plateau di ~300 MB. Monitoring alert dipasang.
6. Catatan: pola yang sama bisa ada di tempat lain — grep semua `Map` global yang `.set` tanpa `.delete`.

**Output:**
> Leak: `userSessions` Map tanpa eviction — 800 MB session mati menumpuk. Fix logout + TTL sweeper. RSS stabil, OOM hilang.

## Anti-pattern

- ❌ Menambah RAM / restart otomatis sebagai "fix" — leak tetap ada, cuma bayar lebih mahal. Ini obat penenang, bukan obat.
- ❌ Nebak "pasti cache-nya" tanpa snapshot — ukur dulu, cache bisa jadi bukan biang kerok.
- ❌ Satu fix lalu berhenti — leak itu jamak. Verifikasi plateau dulu, baru tutup kasus.
- ❌ Melihat RSS naik sekali langsung vonis leak — cek baseline: bisa jadi cold start, load naik, atau fragmentasi yang normal.
- ❌ Menonaktifkan GC/profiler di produksi "biar cepat" — justru di situ bukti terkumpul.
