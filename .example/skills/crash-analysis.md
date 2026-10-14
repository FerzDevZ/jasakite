---
name: "crash-analysis"
description: "Analyzes crashes, segfaults, panics, and core dumps to find root cause. Invoke when app crashes or user shares crash reports."
---

# Crash Analysis

Crash itu kejadian brutal: proses mati mendadak, kadang tanpa pesan sama sekali. Tapi jangan panik — crash hampir selalu meninggalkan jejak: exit code, signal, core dump, atau log terakhir sebelum mati. Tugas kita baca jejaknya. Kunci pertamanya: **signal number**. `SIGSEGV` (11) beda dunia dengan `SIGABRT` (6) atau `SIGKILL` (9). Signal itu sudah memberi tahu setengah cerita.

## Tujuan

Mengubah crash report / core dump / proses mati mendadak menjadi root cause yang jelas: signal/exception apa, di fungsi mana, kenapa terjadi, dan bagaimana mencegahnya.

## Kapan Memakai

- Proses crash/mati mendadak, dengan atau tanpa pesan.
- User membagikan crash report: log kernel, error report OS, `dmesg`, crash dump, atau screenshot error dialog.
- App jalan lama lalu mati sendiri (candidate: OOM, segfault, panic).
- CI runner atau server mati tanpa log exception — cek signal & exit code.

## Workflow

### Langkah 1: Tangkap signal & exit code

1. Cari exit code proses: `echo $?` setelah crash, atau dari log systemd `systemctl status <svc>` (kolom "Main PID" + "Status").
2. Terjemahkan exit code/signal:
   - `SIGSEGV` (11): invalid memory access — use-after-free, null pointer deref, stack overflow, buffer overflow.
   - `SIGABRT` (6): abort() dipanggil — assertion gagal, panic terdeteksi runtime (Go), std::terminate (C++).
   - `SIGKILL` (9)/`SIGBUS` (7)/exit 137: kemungkinan besar OOM killer — cek `dmesg | grep -i oom`.
   - `SIGFPE` (8): integer division by zero.
   - `SIGILL` (4): instruksi illegal — sering arsitektur/CPU mismatch.
3. Cek kernel log untuk OOM: `dmesg | tail -50`, `journalctl -k -n 50`. Kalau ada "Out of memory: Killed process", lihat memory-leak-debugging.

### Langkah 2: Dapatkan stack trace

4. Kalau crash dengan core dump: `gdb <binary> core -ex 'bt' -ex 'quit'` — output backtrace penuh.
   - Lokasi core: `cat /proc/sys/kernel/core_pattern` (bisa `/var/lib/systemd/coredump/` atau `core` di cwd).
   - File belum ada core-nya: ulangi crash dengan `ulimit -c unlimited` lalu jalankan lagi.
5. Kalau tidak ada core: jalankan ulang di bawah debugger: `gdb --args ./app <args>`, lalu `run` — gdb menangkap sinyal dan kasih backtrace. Ini reproduksi termurah.
6. Panic runtime (Go, Rust, Python): stack trace biasanya sudah tercetak sendiri di stderr — ambil frame teratas yang merujuk kode project.
7. Native crash dari managed language (Java JVM, .NET, Node addon): cari file `hs_err_pid*.log`, `core.*`, atau `minidump` — JVM mencetak native stack trace di sana.

### Langkah 3: Symbolicate & baca

8. Kalau backtrace penuh alamat hex tanpa nama fungsi: symbolicate —
   - Binary debug build: gdb sudah otomatis resolve.
   - Release: `addr2line -e <binary> <address>` per address, atau `gdb <binary>` + `info symbol <addr>`.
   - PIE binary: butuh base address dari `/proc/<pid>/maps` saat crash (kalau masih ada) atau offset dari `info proc mappings`.
9. Baca frame yang merujuk kode project (bukan libc/library). Itu lokasi crash. Frame pemanggil di atasnya = urutan panggilan.
10. Perhatikan thread: crash di thread lain sering akar masalahnya di thread lain lagi (shared state). `gdb core` → `thread apply all bt` untuk melihat semua thread.

### Langkah 4: Cari akar

11. Klasifikasi pola umum:
   - **Null deref / use-after-free**: variabel di-free/di-null sebelum dipakai. Cek lifecycle object, callback yang jalan setelah destroy.
   - **Stack overflow**: recursion tak berujung atau stack besar. Cek `bt` — kalau frame berulang (rekursif), itu penyebabnya.
   - **Buffer overflow**: tulis melebihi kapasitas — cek indexing, string copy, ukuran buffer.
   - **Assertion/panic**: kondisi yang dilanggar — baca pesan assertion, itu spec yang dilanggar.
   - **OOM**: growth memory — lihat memory-leak-debugging.
12. Cek perubahan terakhir: `git log -p -5` pada file yang crash — crash regression biasanya muncul dari commit terbaru.

### Langkah 5: Fix & verifikasi

13. Tulis fix minimal di root cause. Untuk native: pastikan ownership object jelas (siapa yang free), validasi pointer, atau gunakan RAII/smart pointer.
14. Verifikasi: jalankan ulang skenario crash — tidak boleh crash lagi. Kalau crash langka, stress loop minimal 100x.
15. Kalau crash tidak bisa di-reproduce: aktifkan crash dump di environment (core dumps, `GOTRACEBACK=all`, `RUST_BACKTRACE=full`, `JAVA_OPTS=-XX:+HeapDumpOnOutOfMemoryError`) agar kejadian berikutnya terekam penuh.

## Checklist Penyelesaian

- [ ] Signal/exit code diidentifikasi
- [ ] OOM killer dicurigai/disingkirkan via dmesg
- [ ] Stack trace didapat (core dump / debugger / panic output)
- [ ] Frame kode project ditemukan & di-symbolicate
- [ ] Semua thread diperiksa (untuk crash di thread)
- [ ] Pola akar diklasifikasikan (null deref, stack overflow, dst.)
- [ ] Fix diverifikasi dengan skenario crash asli
- [ ] Crash dump diaktifkan untuk kejadian berikutnya

## Contoh

**Skenario:** Service Rust crash di produksi, log stderr:
```
thread 'main' panicked at src/pool.rs:45:21:
index out of bounds: the len is 3 but the index is 7
```

**Analisis:**
1. Exit: SIGABRT (panic Rust) — bukan memory corruption, tapi logic error.
2. Frame: `pool.rs:45` — akses array dengan index 7, len 3.
3. Baca `pool.rs:45` — ternyata index dihitung dari `connection_id % pool.len()`, tapi `pool.len()` berubah (drain) antara kalkulasi dan akses.
4. Root cause: race antara drain dan pemakaian pool (lihat race-condition-debugging).
5. Fix: hitung ulang index setelah lock, atau cek `get()` dan handle None.
6. Verifikasi: unit test dengan pool yang di-drain di tengah, jalankan ulang.

**Output:**
> Crash bukan karena memory — panic index out of bounds. Akar: index dihitung sebelum pool dimodifikasi. Fix + regression test selesai.

## Anti-pattern

- ❌ Restart app tanpa baca jejak — crash yang sama akan balik.
- ❌ Menambah `try/catch` / `recover()` di sekitar crash native — segfault tidak bisa ditangkap, cuma menutupi gejala.
- ❌ Menganalisis core dump dari binary yang beda build/commit — backtrace tidak valid. Simpan binary + core bersama.
- ❌ Mengabaikan thread lain saat crash di satu thread — shared state sering jadi biang kerok.
- ❌ Langsung bilang "memory leak" tanpa cek dmesg — banyak crash punya penyebab lain.
