---
name: "git-wizard"
description: "Advanced git mastery: complex histories, bisect, subtree, reflog recovery, clean commit structure. Invoke for non-trivial git operations or git problems."
---

# Git Wizard

## Tujuan

Menangani operasi git yang tidak sepele: sejarah yang berantakan, mencari commit penyebab bug, recovery dari commit terhapus, membagikan subproyek via subtree, dan menjaga struktur commit tetap bersih. Git punya fitur yang menyeramkan tapi menyelamatkan hidup — yang penting jangan panik, dan jangan pernah force-push ke main tanpa berhenti dulu.

## Kapan Memakai

- Sejarah commit kacau: commit asal-asalan, pesan salah, file tidak sengaja ikut.
- Bug muncul di produksi dan harus ditemukan commit mana yang memperkenalkannya (bisect).
- Commit terhapus/ter-reset, branch hilang, work hilang — harus diambil lagi (reflog).
- Subproyek (library internal) mau dibagikan ke repo lain tanpa memutus sejarah (subtree).
- Ingin merapikan PR sebelum merge: squash, rebase, reorder.

## Workflow

1. **Diagnosis dulu, jangan panik.** `git status` → `git log --oneline --graph --all -20` untuk lihat peta. Tulis dulu apa yang mau dicapai, baru pilih perintah. Kalau belum yakin, **jangan** jalankan perintah destruktif (`reset --hard`, `clean -f`, `push --force`).
2. **Recovery commit yang hilang — pakai reflog:**
   - `git reflog` → lihat riwayat gerakan HEAD, cari hash sebelum kejadian (ditandai "reset", "checkout", "rebase").
   - `git checkout <hash> -- <file>` untuk mengambil satu file, atau `git cherry-pick <hash>` untuk mengambil satu commit, atau `git reset --hard <hash>` kalau memang yakin mau kembali ke titik itu.
   - Reflog hanya menyimpan ±90 hari dan hanya lokal — kalau kerja di clone lain, yang hilang di sana tidak ketemu di sini.
3. **Menemukan commit penyebab bug — pakai bisect:**
   - `git bisect start` → `git bisect bad` (di HEAD yang rusak) → `git bisect good <hash>` (di commit yang terakhir bagus).
   - Git checkout commit tengah otomatis → jalankan test/repro → `git bisect good` / `git bisect bad` → ulangi sampai ketemu. Catat: `git bisect run <script>` untuk otomasi — script harus exit 0 (bagus) / nonzero (rusak).
   - Selesai: `git bisect reset`. Jangan lupa, ini setengah kerja — bisect hanya menemukan commit, penjelasan kenapa masih kerja kamu.
4. **Merapikan sejarah sebelum merge:**
   - `git rebase -i HEAD~N` → pilih aksi per commit: `pick`, `reword`, `squash` (gabung dengan commit di atasnya), `fixup` (gabung + buang pesan), `reorder` cukup dengan pindah baris.
   - Setelah rebase, kontrak tim: **jangan rebase commit yang sudah di-push ke branch bersama** — history rewrite di branch shared = konflik massal untuk semua orang.
   - Kalau konflik muncul saat rebase: selesaikan seperti resolusi konflik biasa, `git add` lalu `git rebase --continue`. Kalau tersesat: `git rebase --abort` untuk kembali ke posisi awal (aman, tidak ada yang hilang).
5. **Membagikan subproyek — pakai subtree (alternatif submodule yang lebih bersahabat):**
   - Tarik: `git subtree add --prefix=libs/my-lib <repo-url> <branch> --squash` — sejarah subproyek masuk terkompresi jadi satu commit.
   - Kirim perubahan: `git subtree push --prefix=libs/my-lib <repo-url> <branch>`.
   - Tarik perubahan baru: `git subtree pull --prefix=libs/my-lib <repo-url> <branch> --squash`.
   - Trade-off jujur: subtree meng-copy file ke repo kamu (lebih mudah, lebih sedikit masalah daripada submodule), tapi update manual dan sejarah proyek sumber tidak terlihat. Submodule sebaliknya: referensi saja, tapi workflow-nya menyebalkan untuk orang yang tidak hafal.
6. **Commit yang tidak sengaja ikut — bersihkan tanpa kehilangan kerja:**
   - Sudah commit tapi belum push: `git reset --soft HEAD~1` (file tetap ada, tinggal re-add/re-commit) atau `git commit --amend` untuk ganti pesan/tambah file.
   - File besar/tidak sengaja masuk: `git rm --cached <file>` + tambahkan ke `.gitignore`. Kalau file besar sudah pernah masuk ke riwayat dan repo jadi gendut: `git filter-repo` (atau `filter-branch` tua) — tapi ini menulis ulang seluruh sejarah, hanya untuk kasus serius dan harus dikoordinasikan dengan semua yang clone.
7. **Verifikasi sebelum menyerahkan:** `git log --oneline -10` bersih? `git status` tidak ada yang mencurigakan? Kalau ada force push ke branch shared, wajib konfirmasi ke tim — ini bukan keputusan solo.

## Checklist Penyelesaian

- [ ] Diagnosis via `git status` + `git log --graph --all` sebelum aksi apa pun
- [ ] Tidak ada perintah destruktif tanpa backup mental (reflog/hash dicatat)
- [ ] Recovery memakai `git reflog` / `cherry-pick` — work tidak hilang
- [ ] Bisect selesai dan `git bisect reset` dijalankan
- [ ] Rebase/squash tidak menyentuh commit yang sudah di-push ke branch shared
- [ ] Subtree dipakai dengan `--squash` dan prefix yang jelas
- [ ] Sejarah akhir bersih: `git log --oneline` terbaca manusia
- [ ] Force push tidak pernah ke main tanpa konfirmasi tim

## Contoh

Bug produksi: "harga diskon kadang minus". Kamu tahu commit 10 hari lalu masih bagus.

```bash
git bisect start
git bisect bad                 # HEAD rusak
git bisect good 8f3a21c        # terakhir diketahui bagus
git bisect run npm test        # otomasi: test exit 0 = good, selain itu bad
# ... ketemu: 4d2e9aa adalah commit pertama yang membuat test gagal
git bisect reset
git log -p 4d2e9aa | head -80  # baca apa yang berubah di commit itu
```

Recovery file terhapus (sudah terlanjur reset):

```bash
git reflog                     # cari hash sebelum reset, misal a1b2c3d
git checkout a1b2c3d -- src/price.ts
git commit -m "fix: restore price.ts yang terhapus saat reset"
```

## Anti-pattern

- ❌ `git reset --hard` tanpa catat hash sebelumnya — kalau salah, reflog masih bisa, tapi jangan andalkan ingatan.
- ❌ Force push ke branch bersama tanpa bilang siapa-siapa — kerja orang lain raib.
- ❌ Rebase branch yang sudah di-push dan dipakai orang — konflik berantai di mana-mana.
- ❌ `filter-branch`/`filter-repo` untuk masalah sepele (ganti author name) — itu operasi besar dengan efek ke semua clone.
- ❌ Menghafal "selalu pakai submodule" atau "selalu pakai subtree" — pilih sesuai kasus, trade-off beda.
- ❌ Bisect manual 50 kali padahal `bisect run` bisa otomatis.
- ❌ Panik lalu `rm -rf .git` / clone ulang — reflog hampir selalu bisa menyelamatkan, yang perlu cuma napas dulu.