---
name: "unused-resource-finder"
description: "Finds unused files, assets, configs, and dead endpoints. Invoke during cleanup or when reducing project size."
---

# Unused Resource Finder

Pembersih barang mati. Skill ini mencari resource yang tidak terpakai: file sumber yang tidak di-import, asset gambar yang tidak dirujuk, config yang tidak dibaca, dependency yang tidak dipakai, dan endpoint API yang tidak dipanggil siapa pun. Output: laporan "barang mati" yang jelas statusnya — aman dihapus, perlu dicek dulu, atau ternyata masih dipakai (jangan-jangan malah bug). Menghapus barang mati itu menyenangkan, tapi menghapus yang masih dipakai itu bencana; jaman saya dulu pernah hapus "unused" file, ternyata dipanggil lewat dynamic import.

## Tujuan

Menghasilkan daftar resource yang tidak terpakai dengan bukti: path, jenis resource, alasan dianggap tidak terpakai, tingkat keyakinan (yakin / perlu cek), dan rekomendasi (hapus / arsip / biarkan). Tujuan akhirnya bukan menghapus sebanyak-banyaknya, tapi menghapus dengan aman — dan tidak menghapus yang masih hidup.

## Kapan Memakai

- User minta "bersihkan proyek", "cari file yang tidak kepakai", atau mau mengecilkan ukuran repo/bundle.
- Migrasi besar (framework lama → baru) — banyak sisa file lama.
- Mau menilai kesehatan proyek sebelum audit/refactor besar.
- Repo sudah lama, takut ada file penting yang tertinggal tidak terpakai.

Jangan pakai kalau: yang dicari kode mati dalam satu file (dead code dalam fungsi — itu dead-code-hunter), atau yang dicari dependency rentan (itu dependency-auditor).

## Jenis Resource & Cara Deteksi

| Jenis | Deteksi | Bukti |
|---|---|---|
| File sumber tidak di-import | Grep nama file/modul di semua import; tools bahasa | 0 referensi |
| Asset (gambar, font, dll) | Grep nama asset di semua kode (`<img src>`, `url()`, string) | 0 referensi |
| Config tidak dibaca | Grep nama config key / path di kode | 0 referensi |
| Dependency (package.json dkk) | `npm ls` / tools, lalu grep import | tidak di-import |
| Endpoint tidak dipanggil | Grep path di semua caller (client, test, script) | 0 pemanggil |
| File sample/template/docs usang | Perbandingan isi + git history | tidak dirujuk, basi |

## Workflow

1. **Tentukan cakupan dan jenis.** Proyek penuh atau folder? Semua jenis resource atau yang diminta? Mulai dari yang paling berdampak: file sumber tidak terpakai dan dependency — itu yang paling sering jadi sampah nyata.
   - Output: daftar area yang akan discan.
2. **Bangun indeks referensi.** Untuk tiap jenis, kumpulkan semua referensi yang valid: semua import di codebase, semua string yang menunjuk path asset (`images/logo.png`, `url(/fonts/x.woff2)`), semua pemanggil endpoint. Referensi yang valid = yang ada di kode yang dijalankan — jangan hitung komentar.
   - Output: daftar resource potensial vs daftar referensi.
3. **Hitung selisih.** Resource yang tidak ada di daftar referensi = kandidat tidak terpakai. Untuk tiap kandidat, catat cara deteksinya dan keyakinan: deteksi statis (grep) memberi "yakin", deteksi yang butuh runtime (dynamic import, endpoint yang dipanggil script eksternal) memberi "perlu cek".
4. **Cek kasus licik** — ini bagian yang membedakan yang teliti dari yang asal-asalan:
   - **Dynamic import/require** — `require('./' + name)`, `import(name)`, `__import__('mod_' + x)`. Grep pola `import(` dan `require(` dengan variabel.
   - **Referensi non-kode** — file dipakai dari config, Dockerfile, script CI, `index.html`, template engine, `grep` di shell. Grep nama file di SEMUA file proyek, bukan cuma kode.
   - **Export publik** — file di-export dari `index.js`/`__init__.py` walaupun tidak di-import langsung — itu masih API publik library; menandai "hapus" butuh konfirmasi.
   - **Endpoint dipanggil eksternal** — mobile app, script cron, webhook luar. Grep tidak akan menemukan; tandai "perlu konfirmasi user".
   - **Run-time gating** — config key yang dibaca dari env dengan default, atau feature flag. Grep nama key di kode, bukan cuma di file config.
5. **Verifikasi kandidat yang tersisa.** Baca 1-2 baris sekitar tiap referensi untuk memastikan referensi itu nyata. Untuk kandidat "yakin hapus", double-check sekali lagi dengan pencarian kedua (istilah alternatif: nama tanpa ekstensi, basename). Git history bisa membantu: file lama yang tak pernah tersentuh + tidak direferensikan = aman tinggi.
   - Output yang diharapkan: kandidat final dengan status (yakin / perlu cek / ternyata dipakai).
6. **Susun laporan + rekomendasi.** Format per item: path, jenis, bukti ketidak-pakaian, status, rekomendasi (hapus / arsip ke folder `deprecated/` / biarkan + alasan). JANGAN hapus sendiri tanpa persetujuan user, kecuali diminta — dan kalau diminta hapus, hapus satu-satu dengan verifikasi build/test setelah tiap batch.
   - Output: laporan final; setelah eksekusi (jika diminta) — build & test hijau.

## Checklist Penyelesaian

- [ ] Cakupan dan jenis resource ditentukan
- [ ] Indeks referensi valid dibangun (kode yang dijalankan, bukan komentar)
- [ ] Kandidat tidak terpakai dihitung dari selisih referensi
- [ ] Kasus licik dicek: dynamic import, referensi non-kode, export publik, caller eksternal
- [ ] Tiap kandidat diverifikasi dengan minimal dua pencarian
- [ ] Status tiap item jelas: yakin / perlu cek / ternyata dipakai
- [ ] Laporan berisi bukti + rekomendasi per item
- [ ] Penghapusan (jika dieksekusi) diverifikasi: build & test tetap hijau

## Contoh

**Proyek:** React + Express, user minta bersih-bersih.

**Kandidat & hasil:**
- `src/legacy/oldChart.js` — 0 import (grep `oldChart`), tapi ada `import(` dinamis di `Dashboard.jsx:12`: `import('./legacy/' + chartName)` → **ternyata dipakai** — bukan sampah, malah temuan: `chartName` kadang bernilai `oldChart`. Status: perlu cek; jangan hapus.
- `public/img/hero-old.png` — grep `hero-old` di semua file: 0 → **yakin**; hapus (repo -120KB).
- `config/feature-old.json` — grep `feature-old` 0 di kode, tapi `deploy.sh:9` meng-copy folder `config/` → bukan referensi isi; dan key-nya tidak dibaca kode → **yakin**; hapus.
- `GET /api/v1/deprecated/report` — grep path di `src/` dan `scripts/`: 0 pemanggil, tapi mungkin dipanggil app mobile → **perlu konfirmasi user** sebelum hapus.
- `axios` di package.json — `npm ls axios` menunjukkan tree, tapi grep import `axios` 0 → **yakin**; hapus dependency.

**Rekomendasi akhir:** hapus `hero-old.png`, `feature-old.json`, `axios`; tanya user soal endpoint; jangan sentuh `oldChart.js`.

## Anti-pattern

- ❌ Menghapus tanpa cek dynamic import / referensi non-kode — "unused" ternyata hidup; ini cara paling cepat mematahkan build.
- ❌ Cuma grep di folder src, padahal file dipakai dari script/CI/Dockerfile — selalu grep seluruh repo.
- ❌ Menghapus dependency tanpa `npm ls`/pemahaman transitive dependency — dependency yang dihapus padahal dibutuhkan transitively = produksi patah.
- ❌ Menghapus endpoint tanpa konfirmasi caller eksternal (mobile, cron, webhook) — ini di luar jangkauan grep.
- ❌ Berhenti di deteksi statis — resource yang "tidak direferensikan" belum tentu aman; status "perlu cek" itu bagian sah dari laporan.
- ❌ Menghapus besar-besaran sekaligus — hapus bertahap, verifikasi build/test tiap batch.