---
name: "race-condition-debugging"
description: "Diagnoses concurrency bugs: races, deadlocks, data corruption. Invoke when behavior is flaky, non-deterministic, or concurrency issues are suspected."
---

# Race Condition Debugging

Bug concurrency itu setan yang paling licik: di mesinmu bersih, di produksi rusak, jalan 1000 kali baru gagal sekali. Bukan karena kode salah tulis — tapi karena kode jalan di waktu yang salah. Aturannya satu: kalau perilaku **non-deterministik** (kadang jalan, kadang tidak, tergantung timing), itu concurrency sampai terbukti bukan. Dan jangan pernah coba "mengerti" dengan print — race itu soal timing, print justru mengubah timing.

## Tujuan

Mendiagnosis bug concurrency: data race, deadlock, livelock, starvation, data corruption karena shared state — dengan alat deteksi otomatis (race detector, deadlock detector) dan analisis struktur locking.

## Kapan Memakai

- Perilaku flaky: kadang jalan kadang tidak, gagal hanya di produksi / load tinggi / multi-core.
- Data korup tanpa error jelas: nilai aneh, crash di tempat acak.
- App hang total (deadlock) atau satu thread macet tapi app lain hidup.
- Kode baru memperkenalkan goroutine/thread/async/worker — review concurrency preventif.
- CI gagal random tanpa perubahan kode.

## Workflow

### Langkah 1: Konfirmasi ini masalah concurrency

1. Ciri khas: hasil beda antar run dengan input sama (`./app; ./app` dua kali, hasil beda).
2. Cek timing dependency: error muncul saat load tinggi, atau hilang saat ditambah `sleep`/print (print mengubah timing = sinyal kuat race).
3. Periksa kode: shared state (variabel global, map/slice bersama, cache, DB record) yang diakses dari 2+ thread/goroutine/async tanpa sinkronisasi.
4. Kalau bukan concurrency (deterministik), balik ke systematic-debugging — jangan paksa.

### Langkah 2: Pakai race detector

5. Aktifkan race detector bawaan — ini wajib, bukan opsional:
   - Go: `go test -race ./...`, `go run -race main.go`.
   - C/C++: compile dengan `-fsanitize=thread` (TSan).
   - Rust: `cargo test` + `RUSTFLAGS="-Z sanitizer=thread"` (nightly) atau pakai `cargo loom` untuk model checking.
   - Java: `-XX:+UseTSan` (JDK 21+), atau JFR + JMC untuk analysis.
   - Python: `python -X dev` / `faulthandler`, atau `helgrind` (valgrind) untuk native parts.
6. Jalankan test suite lengkap dengan detector. TSan/Go race detector melaporkan: dua goroutine/thread akses address sama, satu write, tanpa sinkronisasi — plus stack trace kedua-duanya.
7. Race yang tidak ketemu: stress test — `go test -race -count=100 ./...`, atau jalankan binary dengan load generator. TSan ketemu race kalau race itu dieksekusi; makin sering dijalankan makin besar peluang.

### Langkah 3: Analisis laporan race

8. Baca laporan: ada dua stack trace (writer & reader) dan lokasi shared variable. Baca **dua-duanya** — fix hanya di satu sisi sering gagal.
9. Tentukan pola:
   - **Unsynchronized read/write**: akses langsung tanpa lock — fix: mutex/RWMutex, atau atomic.
   - **Check-then-act**: `if len(m) > 0 { m[0] }` — cek dan akses bukan satu operasi atomik. Fix: lock di sekitar keduanya.
   - **Released lock terlalu cepat**: data dibagikan setelah unlock. Fix: pindahkan shared data ke dalam kritikal section.
   - **Iterasi sambil modifikasi**: map/slice dibaca saat ditulis thread lain. Fix: copy-on-write, immutable snapshot, atau lock.
10. Tentukan ownership: kalau data hanya ditulis satu thread dan dibaca setelah "handoff" yang jelas, tidak perlu lock — dokumentasikan handoff-nya.

### Langkah 4: Deadlock

11. Gejala: app hang, CPU 0%, thread stuck. Dapatkan stack semua thread:
    - Go: `SIGQUIT` ke proses → dump semua goroutine dengan status.
    - JVM: `jstack <pid>`.
    - Native: `gdb -p <pid>` → `thread apply all bt`.
    - Node: `node --inspect` → Debugger → pause semua thread, atau `kill -USR1` + `--trace` untuk async.
12. Cari pola deadlock klasik: `lock A` lalu `lock B` di satu thread; thread lain `lock B` lalu `lock A` (lock ordering inversion). Fix: urutan lock konsisten secara global, atau `try_lock` dengan backoff, atau satu lock.
13. Self-deadlock: re-entrant lock yang tidak re-entrant (mutex biasa di-lock dua kali dalam satu thread). Fix: `std::recursive_mutex`, `threading.RLock`, atau refactor.
14. Wait dengan timeout di semua titik menunggu — app hang lebih buruk daripada error timeout.

### Langkah 5: Fix & verifikasi

15. Terapkan fix paling sederhana yang benar: mutex kecil di sekitar shared state, atomic untuk counter/flag, channel/queue untuk handoff data antar thread.
16. Verifikasi: jalankan ulang race detector pada skenario yang tadinya gagal — bersih. Stress test 100x.
17. Jalankan detector di CI sebagai gate: `go test -race` wajib, TSan di pipeline — race yang ketahuan CI lebih murah daripada yang ketahuan user.

## Checklist Penyelesaian

- [ ] Non-determinisme dikonfirmasi
- [ ] Race detector dijalankan (Go -race / TSan / dst.)
- [ ] Kedua sisi race (writer & reader) diidentifikasi
- [ ] Pola diklasifikasikan (unsync, check-then-act, lock inversion, dst.)
- [ ] Deadlock diperiksa via stack dump semua thread
- [ ] Lock ordering / timeout ditetapkan
- [ ] Fix diverifikasi dengan detector + stress test
- [ ] Detector masuk CI sebagai gate

## Contoh

**Skenario:** Counter pesanan kadang kelewat 1-2 angka di produksi. Log tidak membantu.

1. Ciri: `./app` lokal selalu benar, produksi (banyak request) kadang salah — kandidat race.
2. `go run -race main.go` + load test → laporan:
```
WARNING: DATA RACE
Read at 0x... by goroutine 7:  main.incr() ... main.go:12
Previous write at 0x... by goroutine 3: main.incr() ... main.go:12
```
3. Baca `main.go:12`: `counter++` tanpa mutex — increment bukan atomik (read-modify-write).
4. Fix: `atomic.AddInt64(&counter, 1)` — satu baris, atau mutex bila ada operasi lain.
5. Verifikasi: `go run -race` stress 1000 request → bersih. Tambah `go test -race` ke CI.
6. Catatan: race yang "hanya kelewat 1 angka" bisa jadi korupsi data besar di struktur lain — selalu cari semua race, jangan cuma yang kelihatan.

**Output:**
> Race di `counter++` — read-modify-write tanpa sinkronisasi. Fix: atomic counter. Detector sekarang di CI.

## Anti-pattern

- ❌ Fix dengan `sleep`/delay "biar kebetulan jalan" — itu mengubah timing, bukan menghilangkan race. Race-nya tetap hidup dan makin parah di hardware lain.
- ❌ Lock semua fungsi tanpa berpikir — deadlock berikutnya sudah menunggu. Lock kecil di shared state, bukan di seluruh app.
- ❌ Menghapus print debug yang "menyembunyikan" race — print itu penutup, bukan obat.
- ❌ Verifikasi sekali jalan terus "beres" — race butuh stress. Minimal 100x run dengan detector.
- ❌ Mengabaikan race yang "tidak berdampak" — race hari ini jadi corruption besok.
