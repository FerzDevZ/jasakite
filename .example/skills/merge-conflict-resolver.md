---
name: "merge-conflict-resolver"
description: "Resolves merge conflicts correctly: understand both sides, minimal correct merge, verify build. Invoke when merge conflicts occur."
---

# Merge Conflict Resolver

## Tujuan

Menyelesaikan merge conflict dengan benar: pahami dulu apa yang diubah dua sisi, putuskan hasil yang benar (bukan yang cepat), buat merge minimal, dan verifikasi dengan build + test sebelum commit. Conflict bukan hukuman — itu sinyal dua orang mengubah hal yang sama, dan tugasmu jadi wasit yang adil.

## Kapan Memakai

- `git merge` / `git rebase` / `git cherry-pick` / `git pull` berhenti dengan conflict.
- Conflict muncul saat rebase interaktif atau squash.
- PR "tidak bisa merge" karena bentrok dengan main.

## Prinsip Dasar

1. **Pahami dua sisi dulu.** Conflict yang asal-asalan (ambil punyaku terus) menghasilkan merge yang salah secara halus — kode jalan, tapi logika hilang. Ini kategori bug paling berbahaya: tidak error, hanya salah.
2. **Merge minimal.** Jangan perbaiki kode lain yang kebetulan kelihatan, jangan refactor, jangan ubah gaya. Conflict resolution yang baik adalah diff sekecil mungkin terhadap kedua sisi.
3. **Verifikasi, jangan percaya.** Build + test wajib jalan setelah resolve — konflik kadang lolos compile tapi melanggar kontrak (variabel dihapus di satu sisi tapi dipakai di sisi lain).
4. **Kalau ragu, tanya.** Dua orang mengubah hal yang sama karena ada niat berbeda. Kalau tidak jelas maksudnya, tanya author-nya — malu bertanya sesat di merge.

## Workflow

1. **Identifikasi skala masalah:** `git status` → lihat file mana yang conflict. `git diff --name-only --diff-filter=U` untuk daftar cepat. Pisahkan: conflict isi vs conflict dari rename/hapus (modify/delete, rename/rename) — yang kedua butuh keputusan struktural, bukan edit teks.
2. **Baca dua sisi sebelum menyentuh apa pun.** Di dalam file yang conflict, setiap hunk punya tiga bagian:
   - `<<<<<<< HEAD` — versi kamu (atau branch tujuan saat rebase).
   - `=======` — pemisah.
   - `>>>>>>> <branch>` — versi mereka.
   Buka juga `git log` kedua branch untuk lihat niat: `git log --oneline -5 HEAD` dan `git log --oneline -5 <branch>`.
3. **Putuskan hasil per hunk, dengan alasan:**
   - Hunk yang sama persis tujuannya → ambil salah satu, biasanya yang lebih baru/lengkap.
   - Hunk yang mengubah hal berbeda di tempat sama → gabungkan keduanya.
   - Hunk yang saling menghapus/mengubah kontrak (misal dua-duanya ganti nama fungsi) → cari pemakaian di kedua sisi, sesuaikan semua call site — jangan asal ambil.
   - Conflict modify/delete (satu sisi hapus file, sisi lain ubah) → putuskan apakah file memang harus mati; kalau hapusnya sengaja dan perubahan sisi lain sudah dipindah, ambil delete.
   - Tool bantu (VS Code merge editor, `git mergetool` dengan meld/kdiff3) bagus untuk melihat, tapi keputusan tetap di tanganmu.
4. **Bersihkan marker secara menyeluruh:** setelah edit, cari sisa marker yang terlewat: `grep -rn "<<<<<<<\|=======\|>>>>>>>" src/` — jangan pernah commit dengan marker tersisa, itu error aneh yang susah dilacak.
5. **Stage lalu verifikasi:**
   - `git add <file>` untuk semua file yang sudah diresolve.
   - Jalankan build: `npm run build` / `go build` / sesuai stack.
   - Jalankan test, minimal yang menyentuh area conflict — idealnya full suite.
   - `git status` → pastikan tidak ada file conflict tersisa.
6. **Selesaikan operasinya:**
   - Merge: `git merge --continue` (atau `git commit` langsung).
   - Rebase: `git rebase --continue` — mungkin muncul conflict beruntun di commit berikutnya; selesaikan satu per satu.
   - Kalau tersesat/terlanjur berantakan: `git merge --abort` / `git rebase --abort` — aman, kembali ke posisi awal tanpa kehilangan kerja.
7. **Ulas ulang diff akhir:** `git diff --cached` — baca seperti reviewer: apakah hasil merge masuk akal untuk kedua niat? Kalau ada perubahan di luar konflik (refactor, perbaikan kosmetik), batalkan — merge minimal.

## Checklist Penyelesaian

- [ ] Kedua sisi dipahami: `git log` kedua branch + baca tiap hunk
- [ ] Setiap hunk diputuskan dengan alasan (ambil/gabung/sesuaikan), bukan asal pilih
- [ ] Conflict struktural (modify/delete, rename) diputuskan eksplisit
- [ ] Tidak ada marker `<<<<<<<` tersisa (grep cek)
- [ ] Build jalan; test (minimal area terdampak) hijau
- [ ] Diff akhir minimal — tidak ada perubahan di luar konflik
- [ ] Operasi diselesaikan (`merge --continue` / `rebase --continue` / commit)
- [ ] Kalau ragu niat, sudah ditanya ke author sisi lain

## Contoh

Conflict di `price.ts` — branch A menambah PPN, branch B mengganti nama fungsi:

```
<<<<<<< HEAD
export function finalPrice(base) { return base * 1.11; }
=======
export function priceWithMargin(base) { return base * 1.3; }
>>>>>>> feature/margin
```

Analisis: dua-duanya fungsi harga dengan maksud berbeda — bukan menggantikan, tapi keduanya mau dipakai. Hasil gabungan yang benar:

```ts
export function finalPrice(base) { return base * 1.11; }
export function priceWithMargin(base) { return base * 1.3; }
```

Lalu cek call site di kedua sisi (`grep -rn "finalPrice\|priceWithMargin" src/`) — kalau branch A memakai `finalPrice` dan branch B memakai `priceWithMargin`, keduanya tetap valid; kalau ada yang memakai nama lama yang sudah diganti, sesuaikan. Build + test, baru `git add` dan `git merge --continue`.

## Anti-pattern

- ❌ `git checkout --ours/--theirs` untuk semua file tanpa baca isinya — "menang" tapi kodenya jadi salah.
- ❌ Ambil versi yang paling panjang "biar aman" — panjang bukan berarti benar.
- ❌ Menyelesaikan conflict sambil refactor file itu — merge salah dan review jadi sulit.
- ❌ Commit tanpa build/test — konflik yang lolos compile tapi merusak runtime itu nyata.
- ❌ Menghapus marker conflict secara manual via find-replace (`=======` di-hapus semua) — isinya belum diputuskan.
- ❌ Menyalahkan orang lain di PR ("branch lo yang bikin conflict") — conflict itu netral, yang penting resolve-nya benar.
- ❌ Diam saja saat ragu niat orang lain — tanya penulisnya, itu lebih murah daripada bug produksi.