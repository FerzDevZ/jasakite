---
name: "commit-message-writer"
description: "Writes clear conventional commit messages summarizing changes and rationale. Invoke when committing changes."
---

# Commit Message Writer

## Tujuan

Menulis pesan commit yang jelas dan informatif mengikuti Conventional Commits: jenis perubahan (type), ringkasan (subject), dan alasan (body). Commit message yang bagus adalah dokumentasi mikro — 6 bulan lagi, `git log` adalah tempat orang pertama kali mencari tahu kenapa kode begini. Jangan buang kesempatan itu untuk menulis "update".

## Kapan Memakai

- Membuat commit baru — baik sekali langsung maupun beberapa commit terpisah.
- Menulis ulang pesan commit (`git commit --amend`, `git rebase -i` → reword).
- Meninjau PR: memastikan pesan commit (atau squash message) jelas sebelum merge.

## Workflow

1. **Baca diff dulu, tulis pesan kemudian.** `git diff` dan `git status` — pahami apa yang berubah dan kenapa. Pesan yang ditulis tanpa baca diff itu terkaan, dan terkaan itu bohong.
2. **Pisahkan perubahan yang beda cerita jadi commit terpisah.** Satu commit = satu unit logis: "fix bug X" dan "rapikan format kode" adalah dua cerita. `git add -p` untuk memilih hunk per hunk kalau satu file berisi dua cerita.
3. **Tentukan `type` dari daftar Conventional Commits:**
   - `feat` — fitur baru.
   - `fix` — perbaikan bug.
   - `refactor` — perubahan struktur tanpa mengubah perilaku.
   - `docs` — dokumentasi.
   - `test` — test (baru/perbaikan), tanpa perubahan perilaku produksi.
   - `chore` — tugas pendukung: dependency, build, tooling.
   - `perf` — optimasi performa. `style` — format/spasi tanpa logika. `revert` — membatalkan commit.
   - Scope opsional dalam kurung: `feat(auth): ...` untuk area. Jangan maksa scope kalau tidak jelas area-nya.
4. **Tulis subject (≤ 50–72 karakter, imperative mood, tanpa titik di akhir):** "add", "fix", "remove" — bukan "added", "fixes". Subject menjawab: **apa** yang berubah. Contoh: `fix(price): handle negative discount`, bukan `update price file`.
5. **Tulis body — hanya kalau ada yang perlu dijelaskan:** body menjawab **kenapa** (konteks, trade-off, alternatif yang ditolak) dan **efek apa** (perilaku berubah, breaking change, dependensi). Body kosong itu sah kalau subject sudah cukup; body wajib kalau ada keputusan yang tidak jelas dari diff-nya saja.
6. **Tulis footer untuk hal khusus:**
   - `BREAKING CHANGE: ...` — kalau API/perilaku berubah dan memecah konsumen. Ini penting karena banyak tool auto-release pakai ini.
   - Referensi issue/PR: `Closes #123`, `Refs #456`.
7. **Verifikasi:** `git log -1` — baca ulang seperti orang asing yang tidak tahu konteksnya. Apakah dia bisa paham apa dan kenapa? Kalau tidak, perbaiki dengan `git commit --amend` sebelum push.

## Trade-off

- **Satu commit per cerita vs commit kecil-kecil:** commit per cerita memudahkan revert dan review (pakai `git add -p`). Tapi jangan sampai absurd — commit per baris yang dicoret-coret hanya membuat history berisik. Ukurannya: satu commit harus bisa dijelaskan dalam satu subject yang jujur.
- **Body panjang vs pendek:** body panjang itu bagus kalau berisi keputusan dan konteks — buruk kalau cuma menceritakan ulang diff. Kalau body tidak menambah informasi, kosongkan. "Kenapa ada keputusan aneh di sini" jauh lebih berharga daripada "aku menambah file X".
- **Commit message vs PR description:** keduanya hidup di tempat berbeda (history vs review flow). Jangan andalkan PR description untuk mendokumentasikan keputusan — setelah merge, orang hanya membaca `git log`, bukan halaman PR yang sudah ditutup.

## Checklist Penyelesaian

- [ ] Diff dibaca sebelum menulis pesan
- [ ] Satu commit = satu cerita logis (pakai `git add -p` kalau perlu)
- [ ] Type benar: feat/fix/refactor/docs/test/chore/perf/style/revert
- [ ] Subject ≤ 72 karakter, imperative, tanpa titik akhir
- [ ] Subject menjawab "apa", body menjawab "kenapa" (kalau perlu)
- [ ] BREAKING CHANGE dan referensi issue ditulis di footer
- [ ] Pesan dibaca ulang dari perspektif pembaca asing
- [ ] Tidak ada file sekaligus (env, kredensial, binary) yang ikut ter-commit

## Contoh

Diff: perbaikan di modul auth — token yang sudah expired sekarang menolak akses dengan 401, sebelumnya masih lolos sampai middleware berikutnya.

```
fix(auth): reject expired access tokens with 401

Middleware sebelumnya hanya memeriksa kehadiran token, bukan
keberadaannya. Token yang expired masih lolos dan baru ditolak di
handler berikutnya, menyebabkan error 500 yang membingungkan klien.

Sekarang expiry diperiksa di satu tempat: verifikasi token mengembalikan
401 untuk expired/revoked, dan handler lain tidak perlu tahu soal ini.

Closes #214
```

Kenapa bagus: subject jelas (apa + di mana), body menjelaskan kenapa (perilaku lama salah, cara baru lebih bersih), dan ada referensi issue. Pembaca tidak perlu buka diff untuk mengerti niatnya.

## Anti-pattern

- ❌ `update`, `fix`, `wip`, `asdf` — tidak menjawab apa pun, membuang kesempatan dokumentasi.
- ❌ Subject panjang 200 karakter — git log jadi tidak terbaca.
- ❌ `feat: add feature` — subject mengulang kata type, tidak menambah informasi.
- ❌ Menulis pesan tanpa melihat diff — hampir pasti salah/nyasar.
- ❌ Satu commit berisi 5 cerita beda ("fix bug + refactor + ganti dependency") — susah di-review, susah di-revert sebagian.
- ❌ `git add .` lalu commit — file yang tidak sengaja (env, build artifact) ikut masuk; `git add` file spesifik.
- ❌ Body bertele-tele menceritakan ulang diff — body untuk "kenapa", bukan "apa" yang sudah terlihat.
- ❌ Pesan bahasa campur aduk tiap orang — sepakati satu bahasa (umumnya English) untuk konsistensi `git log`.