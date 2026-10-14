---
name: "dead-code-hunter"
description: "Finds and safely removes unused code, imports, exports, and unreachable branches. Invoke when user wants cleanup or codebase reduced."
---

# Dead Code Hunter

Kode mati itu beban diam-diam: dibaca orang asing, bikin bingung, dan kadang menyimpan bug yang "tidak aktif" sampai suatu hari aktif. Skill ini untuk memburu kode yang tidak dipakai — imports, fungsi, export, branch yang tidak terjangkau — dan menghapusnya dengan aman. Kuncinya: bukti dulu, hapus kemudian, verifikasi terakhir.

## Tujuan

Menemukan kode mati dengan bukti (bukan feeling), menghapus yang pasti mati, dan menunda yang diragukan. Hasil akhir: codebase lebih kecil, pencarian lebih cepat, dan tidak ada fitur yang hilang karena salah hapus.

## Kapan Memakai

- User minta "bersihin kode", "kecilin codebase", "buang yang nggak kepakai".
- Imports menumpuk, file besar tapi mayoritas isinya tidak pernah dipanggil.
- Sebelum migrasi besar — kode mati bikin migrasi lebih mahal dari seharusnya.
- Onboarding codebase lama / inherited project.

Jangan pakai kalau: cuma mau merapikan formatting, atau codebase aktif dengan coverage tipis dan tanpa git (risiko hapus salah terlalu tinggi — kerjakan yang lain dulu).

## Workflow

1. **Amankan dulu.** Pastikan ada git (atau backup) dan `git status` bersih. Kalau ada test suite, catat baseline hijau. Dead code tanpa test = risiko; tanpa git = jangan mulai.
   - Output: baseline hijau + git state bersih.
2. **Deteksi otomatis.** Jalankan tool per bahasa: unused imports (`eslint` no-unused-vars, `ruff`/`pyflakes` F401, `go vet`, `rustc` warnings, `tsc --noUnusedLocals`), unused exports (`knip` JS/TS, `vulture` Python, `cargo machete` Rust), unreachable branch (laporan coverage: baris yang tidak pernah tereksekusi).
   - Output: daftar temuan; pisahkan (a) pasti mati, (b) mungkin mati.
3. **Verifikasi manual yang ragu.** Yang "mungkin" butuh bukti: grep seluruh repo untuk nama simbol — termasuk kemungkinan dynamic access (`eval`, `require(namaVariabel)`, `import()` dinamis, reflection, `__import__`). Cek juga pemakaian dari: config/scripts CLI, route string framework, dan — kalau ini library — konsumen luar.
   - Output: konfirmasi per item: MATI / DIPAKAI / TIDAK PASTI.
4. **Hapus yang pasti mati.** Imports dan fungsi yang jelas mati: hapus, jalankan test (atau minimal build + lint). Pisahkan per kelompok hapusan dalam commit terpisah supaya riwayat git bersih dan mudah dibalik.
   - Output: commit terpisah per kelompok; suite hijau.
5. **Tunda yang TIDAK PASTI.** Jangan hapus paksa. Catat di daftar "zombie" (misal komentar `TODO(dead-code): verifikasi` atau catatan di issue). Kalau ternyata dipakai via dynamic, solusi yang benar: buat pemanggilan eksplisit dulu (refactor kecil), baru boleh hapus.
   - Output: daftar item tertunda + alasan per item.
6. **Tangani unreachable branch.** Untuk branch mati (mis. `if (false)`, kondisi yang selalu false karena invariant): hapus jika logikanya jelas. Kalau ragu — mungkin itu penanganan edge yang belum teruji — tulis test perilakunya DULU, baru hapus branch-nya.
   - Output: branch mati dihapus; yang ragu diuji dulu.
7. **Verifikasi akhir.** Grep ulang semua simbol yang dihapus: tidak boleh ada referensi tersisa di luar riwayat git. Jalankan suite penuh + build. Catat pengurangan baris (buat commit summary yang jujur).

## Checklist Penyelesaian

- [ ] Baseline hijau & git bersih sebelum mulai
- [ ] Deteksi otomatis dijalankan; temuan dipisah pasti/mungkin
- [ ] Simbol ragu diverifikasi dengan grep, termasuk dynamic access
- [ ] Hapusan pasti dikerjakan per kelompok; suite hijau tiap saat
- [ ] Item tidak pasti ditunda dengan alasan tertulis — tidak dihapus paksa
- [ ] Verifikasi akhir: tanpa referensi tersisa, suite & build hijau

## Contoh

**Temuan:** `utils/legacy-format.js` (80 baris) — grep seluruh repo: 0 pemakaian. `eslint` melaporkan 12 unused imports di `src/`.

**Aksi:** hapus file (sebutkan di commit message), bersihkan 12 imports, suite hijau. **Tunda:** `retry-with-timeout` dipanggil via `require(namaVariabel)` — tandai "TIDAK PASTI", jangan hapus; buat pemanggilan eksplisit dulu di sprint berikutnya.

**Hasil:** −80 baris, 12 import bersih, 1 item masuk backlog verifikasi.

## Tool per Ekosistem

- **JavaScript/TypeScript:** `eslint` (no-unused-vars, no-unreachable) untuk imports & branch; `knip` untuk unused exports & files; `tsc --noUnusedLocals --noUnusedParameters` untuk TS; laporan coverage (`c8` / istanbul) untuk branch yang tidak pernah tereksekusi.
- **Python:** `ruff` / `pyflakes` (F401 unused import, F841 unused variable); `vulture` untuk fungsi/kelas tak terpakai; laporan `coverage.py` untuk branch mati.
- **Go:** `go vet` untuk unused/unreachable; `staticcheck` (U1000) untuk unused; `go mod tidy -diff` untuk dependency tak terpakai.
- **Rust:** warning `unused` dari `cargo build`; `cargo machete` untuk unused dependencies; `cargo llvm-cov` untuk branch coverage.
- **Java:** `javac -Xlint:all` untuk unused; `jacoco` coverage untuk branch mati; report IDE inspection bila ada.

Tool memberi kandidat, tapi keputusan MATI / DIPAKAI / TIDAK PASTI tetap keputusan manusia yang sudah grep — tool tidak tahu pemakaian dynamic, tool tidak tahu konsumen luar.

**Catatan khusus:** kalau repo tidak punya test suite sama sekali, batasi diri pada hapusan yang paling jelas (imports, konstanta tak terpakai). Menghapus fungsi "yang pasti mati" tanpa jaring pengaman itu judi, meski grep sudah bersih — grep tidak membuktikan perilaku, ia hanya membuktikan ketiadaan referensi.

## Prinsip

1. **Ketiadaan bukti ≠ bukti ketiadaan.** Grep bersih belum tentu aman — pemakaian bisa lewat dynamic access, config, atau konsumen luar.
2. **Satu hapusan, satu cerita.** Commit per kelompok hapusan membuat riwayat git bisa dijelaskan dan bisa dibalik tanpa efek samping.
3. **Kode mati adalah bug yang menunggu.** Kalau suatu hari dipakai, orang akan memakai implementasi lama yang mungkin sudah salah terhadap state sekarang — hapus saja, git menyimpannya.

Kalau masih ragu, biarkan hidup di git history — itu tempatnya, bukan di working tree.

## Anti-pattern

- ❌ Menghapus berdasarkan tebakan tanpa grep — "kayaknya nggak kepakai" bukan bukti.
- ❌ Menghapus export library/public API tanpa cek konsumen luar — orang lain bisa patah tanpa kamu tahu.
- ❌ Mengabaikan dynamic access (eval, import variabel, reflection) — sumber kesalahan hapus paling umum.
- ❌ Meninggalkan kode mati "karena bisa berguna nanti" — git itu mesin waktu; hapus saja, kalau butuh kembali tinggal `git log`.
- ❌ Cleanup besar dalam satu commit tanpa checkpoint — 200 hapusan sekaligus = mimpi buruk saat ada yang salah.