---
name: "debugger-tools"
description: "Uses interactive debuggers (gdb, pdb, node --inspect, browser devtools) to step through code and inspect state. Invoke when breakpoint/step-through debugging is needed."
---

# Debugger Tools

Print statement itu alat yang sah, tapi ada kalanya dia mentok: state berubah di dalam library, bug di loop ke-10.000, atau nilai salah di tengah fungsi panjang. Di situlah debugger masuk: bisa pause di titik manapun, lihat semua variabel hidup, dan jalan per-baris. Sepuh jaman dulu nggak punya gdb, cuma print dan doa — jadi jangan sia-siakan alat yang ada. Kuasai satu debugger per ekosistem, dan perintah dasarnya hafal di luar kepala.

## Tujuan

Menggunakan interactive debugger (gdb, pdb, node inspect, browser devtools) untuk memeriksa state saat runtime: breakpoint, step, inspect variabel, dan menemukan di titik mana nilai mulai salah.

## Kapan Memakai

- Log/print sudah tidak cukup: perlu lihat nilai di tengah eksekusi, atau state yang berubah pelan-pelan.
- Bug di dalam loop/panggilan dalam — step per baris lebih efisien daripada print 50 baris.
- Nilai salah tapi lokasinya belum jelas — set breakpoint di perbatasan fungsi, telusuri masuk.
- Crash native tanpa core dump — gdb untuk menangkap sinyal langsung.
- Stack trace sudah tunjuk lokasi, tapi butuh lihat isi variabel di frame itu.

## Workflow

### Langkah 0: Pilih debugger

1. C/Go/Rust/native: `gdb` (atau `lldb` di macOS). Build dengan `-g` (debug symbols) — tanpa itu, gdb buta.
2. Python: `pdb` (bawaan) atau `python -m pdb script.py`. Integrasi: `import pdb; pdb.set_trace()` di lokasi yang dicurigai.
3. Node.js: `node --inspect-brk script.js` + buka `chrome://inspect`, atau `node inspect script.js` (CLI). Nodemon: `nodemon --inspect`.
4. Browser: DevTools → Sources tab → set breakpoint di file source (dengan source map untuk bundler).
5. Go: `dlv` (Delve). Rust: `gdb`/`lldb` atau `rust-gdb`.

### Langkah 1: Set breakpoint yang strategis

6. Jangan set breakpoint di baris yang dicurigai — set di **perbatasan**: awal fungsi, sebelum operasi yang mencurigakan, dan di branch kondisi. Telusuri dari sana.
7. Perintah gdb dasar: `break file.c:42`, `break function_name`, `run <args>`, `continue`, `next` (step-over), `step` (step-into), `finish` (keluar dari fungsi).
8. Perintah pdb: `b file.py:42`, `c`, `n`, `s`, `r` (return dari fungsi), `l` (list kode sekitar).
9. Node CLI inspect: `sb('file.js', 42)` set breakpoint, `c`, `n`, `s`, `o` (step-out), `list(n)`.
10. Conditional breakpoint untuk loop: gdb `break file.c:42 if i == 10000`; pdb `b file.py:42` lalu `condition <n> i == 10000`; DevTools klik kanan breakpoint → Add conditional. Ini wajib untuk bug yang muncul di iterasi ke-N.

### Langkah 2: Inspect state di breakpoint

11. Lihat variabel: gdb `print var`, `info locals`, `info args`, `bt` (backtrace), `frame N` (pindah frame), `print *(struct Foo*)ptr` (deref pointer).
12. pdb: `p var`, `pp var`, `w` (where/backtrace), `u`/`d` (pindah frame up/down), `display var` (auto-print tiap stop).
13. Node: `exec('var')` untuk ekspresi, `bt` backtrace, `frame` pindah frame.
14. Browser DevTools: hover variabel, Scope panel (Local/Closure/Global), Watch panel untuk ekspresi yang selalu diikuti, Call Stack panel.
15. Pola kunci: bandingkan nilai variabel saat masuk fungsi vs saat error — **temukan baris pertama di mana nilai menyimpang**. Itu lokasi bug, bukan baris error-nya.

### Langkah 3: Telusuri (step) dengan hipotesis

16. Step ke dalam fungsi yang dicurigai (`s`), ikuti alur data. Kalau fungsi library besar, step-over (`n`) dan lihat hasilnya — jarang perlu masuk ke dalam library.
17. Kalau eksekusi melompat ke tempat tak terduga: cek exception breakpoint — gdb `catch throw`, pdb `-X` / `pdb.post_mortem()`, Node: pause on exceptions di DevTools (tab Sources → kotak pause ⏸ aktifkan), Python: `python -m pdb -c continue script.py` untuk masuk ke post-mortem saat exception.
18. Debug loop: pakai conditional breakpoint, lalu step beberapa iterasi dan amati pola nilai. Jangan step 10.000 iterasi manual.

### Langkah 4: Remote & edge case

19. Proses jalan di server lain: `gdb --pid <pid>` (attach, butuh ptrace permission) atau `gdb --args` ulangi skenario. Node: `node --inspect=0.0.0.0:9229` lalu connect dari DevTools lokal.
20. Container: pastikan debug symbols ada di image, attach via `docker exec` dengan `gdb -p`.
21. Thread issue: gdb `thread apply all bt` — lihat semua thread, bukan cuma yang terhenti.
22. Kalau state tidak konsisten antar step (nilai berubah sendiri): curigai race condition / memory corruption — lihat race-condition-debugging.

### Langkah 5: Tutup investigasi

23. Catat temuan: baris pertama nilai menyimpang + nilai expected vs actual. Ini bahan fix.
24. Hapus semua breakpoint (`delete` di gdb/pdb, hapus di DevTools) dan hapus `pdb.set_trace()` / `debugger;` yang ditambahkan — jangan sampai ke-commit.

## Checklist Penyelesaian

- [ ] Debugger dipilih sesuai ekosistem & bahasa
- [ ] Debug symbols aktif (build `-g` untuk native)
- [ ] Breakpoint di perbatasan, bukan asal-asalan
- [ ] Conditional breakpoint dipakai untuk loop panjang
- [ ] Baris pertama nilai menyimpang ditemukan
- [ ] Exception breakpoint dicoba jika lompatan aneh
- [ ] Semua breakpoint & jejak debug dibersihkan
- [ ] Temuan dilaporkan: lokasi + expected vs actual

## Contoh

**Skenario:** Fungsi menghitung total harga, hasil salah hanya kalau ada diskon. Log tidak cukup, butuh lihat nilai di tengah.

**gdb session:**
```
(gdb) break apply_discount
(gdb) run < input.json
Breakpoint 1, apply_discount (price=150000, disc=0.1) at shop.c:12
(gdb) print price
$1 = 150000
(gdb) next
(gdb) print price * (1 - disc)
$2 = 135000          # expected: 135000 — benar di sini
(gdb) print final_price
$3 = 135000          # di sini juga benar...
(gdb) continue
...
(gdb) print rounded
$4 = 134999          # AHA — baris pertama nilai menyimpang
(gdb) list
10  int rounded = (int)(price * (1 - disc) * 100);   # floating point!
```
**Temuan:** `150000 * 0.9 * 100 = 13499999.999` → truncation ke `134999`. Fix: `round()` bukan truncate, atau hitung dalam integer cents. Verifikasi: jalankan ulang — output `135000`.

## Anti-pattern

- ❌ Step satu-satu tanpa tujuan — 10 menit kemudian baru sadar jalan di lingkaran. Selalu step dengan pertanyaan di kepala.
- ❌ Step ke dalam setiap fungsi termasuk library — buang waktu. Step-over dulu, masuk hanya kalau dicurigai.
- ❌ Meninggalkan `pdb.set_trace()` / `debugger;` / breakpoint di commit — kode produksi hang menunggu debugger.
- ❌ Debug build release tanpa symbols — backtrace penuh alamat hex, tidak terbaca.
- ❌ Mengubah kode untuk "memudahkan debug" lalu lupa membaliknya — diff kamu jadi berantakan.
