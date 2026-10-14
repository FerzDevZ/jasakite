---
name: "file-finder"
description: "Locates files by name fragment, content, or pattern with efficient search strategies. Invoke when user asks where a file is or what file contains X."
---

# File Finder

Pencari file yang efisien. User bertanya "mana file config database-nya?" atau "file mana yang isinya teks 'license key expired'?" — skill ini menemukannya dengan strategi bertingkat: nama, konten, pola — dari yang termurah ke yang termahal. Dulu saya zaman `find / -name` sampai lima menit, sekarang strategi yang benar selesai dalam beberapa detik. Kunci utamanya: jangan pernah full-scan sebelum mencoba yang murah.

## Tujuan

Menemukan file yang diminta user (nama persis, fragmen nama, atau isi konten) dengan usaha paling sedikit dan hasil paling akurat: path lengkap + alasan kenapa itu file yang dimaksud. Juga menjawab "file apa yang mengandung X" — pencarian isi.

## Kapan Memakai

- User bertanya "di mana file ...?" / "mana file ...-nya?" — termasuk fragmen nama yang tidak persis.
- User bertanya "file mana yang berisi teks/string X?".
- Mau memeriksa keberadaan file atau pola file (`*.env*`, `*test*.py`).
- Sebelum mengedit: cari file yang namanya mirip-mirip agar tidak salah edit.

Jangan pakai kalau: yang dicari simbol/definisi (symbol-finder) atau perilaku (intent-code-finder) — fokus skill ini memang file.

## Strategi Bertingkat (murah → mahal)

Jangan langsung full-text search seluruh repo. Urutan ini menghemat waktu:

1. **Cari nama persis.** Kalau user menyebut nama lengkap (`database.py`), cek dulu langsung ke path yang paling masuk akal (`src/db/database.py`), baru glob seluruh proyek.
2. **Glob nama/fragmen.** `**/*<fragmen>*` (mis. `**/*migration*`, `**/*.env*`) — cepat, hasil langsung. Perhatikan ekstensi umum di proyek.
3. **Cari isi dengan grep.** Untuk "file mana yang berisi X": grep string/pola, dengan glob ekstensi yang masuk akal. Mulai case-sensitive; baru `-i` kalau kosong.
4. **Semantic search (terakhir).** Kalau nama dan isi persis tidak ketemu (mis. user hanya ingat "file yang ngatur notifikasi"), baru cari semantic — dan lanjutkan konfirmasi nama dari hasilnya.

Kapan berhenti: tiap level yang sudah memberi jawaban terverifikasi = selesai. Jangan lanjut ke level lebih mahal untuk "meyakinkan" — verifikasi isi sudah cukup.

Saat buntu: perluas ke directory yang tidak terduga (config, scripts, CI), hilangkan ekstensi dari tebakan, atau cek `git log --all --name-only` untuk file yang sudah dihapus/rename — kadang file yang dicari user sudah tidak ada. Kalau semua gagal, pertimbangkan: file-nya mungkin di repo lain, di branch lain, atau memang belum pernah dibuat.

## Workflow

1. **Tentukan target pencarian.** Nama persis? Fragmen? Isi? Pola? Bedakan, karena caranya berbeda. Tanya balik hanya kalau benar-benar ambigu (beberapa file sama namanya di folder berbeda) — jangan tanya untuk hal yang bisa dicari. Kalau user menyebut deskripsi ("file yang ngatur notif"), itu pencarian isi/istilah, bukan nama — ubah ke istilah kunci yang mungkin ada di dalamnya ("notify", "notification").
   - Output: tipe pencarian + istilah kunci.
2. **Mulai dari yang termurah.** Path masuk akal dulu (jika ada tebakan kuat), lalu glob fragmen nama. Untuk pencarian isi: grep dengan glob ekstensi. Jangan skip langkah ini ke full scan. Contoh glob efisien: `**/*db*`, `**/*.test.*`, `**/config/*` — sesuaikan dengan kebiasaan struktur proyek; kalau proyek memakai folder `src/`, arahkan glob ke sana dulu.
   - Output yang diharapkan: 1-5 kandidat path.
3. **Persempit kandidat.** Kalau banyak hasil (mis. `*config*` 40 file), filter: ekstensi yang relevan, folder yang relevan, tanggal modifikasi. Baca 2-3 baris pembuka kandidat teratas untuk memastikan. Kalau dua file bersaudara (mis. `prod.config.ts` dan `prod.config.example.ts`), tampilkan keduanya dengan perannya — jangan pilih diam-diam.
4. **Konfirmasi dengan isi.** Untuk nama-file, cek sebentar isinya sesuai tidak dengan deskripsi user ("file config database" → harus ada connection string / ORM setup). Untuk pencarian isi, tampilkan path + baris yang cocok.
   - Output: jawaban final dengan path lengkap + bukti singkat.
5. **Laporkan bila tidak ketemu.** Jangan mengarang. Laporkan: sudah dicoba apa (glob nama, grep isi, case-insensitive), dan kemungkinan file sudah dihapus/rename (cek git history) atau nama berbeda. Tawarkan langkah lanjut. Konteks membantu: tanya balik satu hal yang bisa mempersempit (folder, ekstensi, perkiraan usia file) — tapi hanya sekali, lalu lanjut mencari dengan asumsi terbaik.

## Checklist Penyelesaian

- [ ] Tipe pencarian ditentukan (nama/fragmen/isi/pola) — cara sesuai tipe
- [ ] Strategi bertingkat dijalankan: path tebakan → glob → grep → semantic
- [ ] Hasil disaring dengan ekstensi/folder relevan, bukan ditumpuk semua
- [ ] Kandidat final dikonfirmasi dengan membaca isi/baris bukti
- [ ] Jawaban memuat path lengkap + alasan kenapa itu yang dimaksud
- [ ] Jika tidak ketemu: dilaporkan apa yang sudah dicoba + kemungkinan penyebab
- [ ] Tidak ada jawaban karangan — semua path diverifikasi ada
- [ ] File yang mirip namanya dibedakan perannya, tidak dicampur
- [ ] Git history dicek saat file tidak ditemukan (dihapus/rename?)

## Contoh

**User:** "Mana file yang mengatur koneksi database?"

1. Tebakan murah: `src/db/` — glob `**/*db*` dan `**/*database*`.
2. Hasil: `src/db/database.py`, `src/db/database.test.py`, `config/db.example.env`.
3. Saring: test file bukan target; `config/db.example.env` cuma template env.
4. Konfirmasi: baca `database.py` 5 baris pembuka — ada `create_engine(settings.DATABASE_URL)`. Cocok.
5. Jawaban: "`src/db/database.py` — bikin engine dari `DATABASE_URL` (setting di `src/config/settings.py`). Template env-nya ada di `config/db.example.env`."

**User:** "File yang isinya pesan 'session expired' di mana?" → grep `"session expired"` di `src/**/*.{ts,tsx}` → `src/utils/auth.ts:77` (throw), `src/i18n/en.json` (teks tampil). Keduanya dilaporkan dengan perannya.

**Contoh kedua — buntu dan jujur:** User: "mana file `settings.bak`?" Glob `**/*settings*` hanya menemukan `settings.json` — tidak ada `.bak`. Cek git history: `git log --all --name-only` → `settings.bak` pernah ada, dihapus commit `a1b2c3` (bulan lalu). Jawaban: file sudah dihapus di commit X, isi terakhir bisa diambil dari `git show a1b2c3^:settings.bak` — tawarkan itu, jangan mengarang file baru.

## Anti-pattern

- ❌ Langsung full-text search seluruh repo padahal tinggal glob nama — boros waktu di proyek besar.
- ❌ Menebak path tanpa verifikasi — "mungkin di `src/helpers.js`" tanpa baca isinya; kalau salah, user menyesat.
- ❌ Menyerahkan 40 hasil mentah "mana yang kamu mau?" — saring dulu, baca bukti, baru jawab 1-3 kandidat terbaik.
- ❌ Mengarang jawaban saat tidak ketemu — laporkan yang sudah dicoba, jangan bikin file fiktif.
- ❌ Lupa cek git history untuk file yang sudah dihapus/rename — sering jawaban sesungguhnya.
- ❌ Tanya balik hal yang bisa dicari sendiri — tanya hanya saat ambigu beneran.
- ❌ Mengabaikan case sensitivity — `Config.ts` dan `config.ts` bisa dua file berbeda di Linux/macOS; kalau tebakan gagal, coba varian case.