---
name: "codebase-mapper"
description: "Maps an unfamiliar codebase: entry points, module boundaries, data flow, dependency graph, produces navigable overview. Invoke when exploring a new or unfamiliar codebase."
---

# Codebase Mapper

Peta sebelum menebak. Skill ini untuk membangun peta mental codebase yang belum pernah kamu lihat: di mana pintu masuknya, apa batas tiap modul, bagaimana data mengalir, dan siapa bergantung ke siapa. Tanpa peta, eksplorasi cuma jalan-jalan sore tanpa tujuan.

## Tujuan

Menghasilkan overview codebase yang bisa dinavigasi: entry points, boundaries modul, alur data, dan dependency graph — cukup detail untuk langsung bekerja, cukup ringkas untuk tidak tenggelam. Output final berupa dokumen peta (MARKDOWN) yang tersimpan dan bisa dipakai sebagai referensi cepat, plus jawaban atas "file mana yang harus kubaca duluan?".

## Kapan Memakai

- User menyerahkan codebase baru/orang lain dan bilang "pahami ini dulu".
- Mau mulai berkontribusi tapi belum tahu file mana yang penting dan tidak.
- Mau menilai kesehatan struktur sebelum refactor — peta jadi bahan diskusi.
- Task onboarding: "jelaskan arsitektur proyek ini" atau "tempat terbaik untuk menambah fitur X".

Jangan pakai kalau: hanya perlu satu file tertentu (langsung baca), codebase sudah familier, atau yang diminta hanya penjelasan satu fungsi.

## Prinsip

1. **Peta untuk navigasi, bukan untuk dokumentasi lengkap.** Tujuannya supaya orang langsung tahu ke mana harus melihat, bukan menyalin seluruh isi kode.
2. **Bukti dulu, opini belakangan.** Setiap klaim ("modul ini boundary-nya jelas") harus bisa ditunjuk ke file nyata.
3. **Tandai ketidakpastian.** Kalau ragu soal peran sebuah file, tulis "tidak yakin" — jangan dipaksakan jadi pasti.
4. **Follow the data.** Alur data yang paham = struktur yang paham; kebanyakan kebingungan arsitektur adalah kebingungan data.

## Workflow

Berurutan dari luar ke dalam — jangan lompat-lompat. Tiap langkah punya output tertulis; kalau belum ada output, langkah belum selesai.

1. **Kenali wajah proyek.** Baca manifest level atas: `package.json` (JS/TS), `pyproject.toml` / `requirements.txt` (Python), `go.mod` (Go), `Cargo.toml` (Rust), `pom.xml` (Java), `Gemfile` (Ruby). Catat: nama proyek, framework utama, versi, dan scripts yang tersedia.
   - Output yang diharapkan: daftar 3-5 dependency kunci + scripts entry (`npm run dev`, `pnpm build`, `rails s`).
2. **Baca README dan docs.** Baca `README.md`, `docs/`, `CONTRIBUTING.md` — cari bagian arsitektur, setup, dan istilah domain. Ini sumber konvensi resmi, tapi perlakukan sebagai klaim yang harus diverifikasi nanti.
   - Output: daftar istilah domain + klaim arsitektur dari README (ditandai "belum diverifikasi").
3. **Petakan struktur folder.** List tree kedalaman 2-3 level, abaikan `node_modules`, `dist`, `build`, `.git`, `__pycache__`, `.venv`. Kelompokkan folder ke kandidat modul (`src/api`, `src/core`, `src/ui`, `tests/`).
   - Output: tree yang sudah diberi anotasi peran tiap folder.
4. **Temukan entry points.** Cari `main`, `createApp`, `app.run`, `listen`, `if __name__ == "__main__"`, field `main`/`bin` di manifest, `scripts.start`. Konfirmasi dari package scripts, bukan cuma menebak.
   - Output: 1-3 file yang menjadi pintu masuk runtime, plus perintah untuk menjalankannya.
5. **Petakan module boundaries.** Untuk tiap modul kandidat, baca file index/export utamanya (`index.js`, `__init__.py`, `mod.rs`, `lib.rs`). Tentukan: apa yang di-expose ke luar, apa yang di-consume dari modul lain.
   - Output: tabel "modul → expose → consume".
6. **Lacak alur data utama.** Pilih SATU alur end-to-end yang mewakili (mis. request masuk → handler → service → storage → response, atau input → model → output). Baca rantai file-nya sampai transformasi datanya paham.
   - Output: diagram alur 5-10 langkah, tiap langkah disertai nama file.
7. **Bangun dependency graph.** Grep statement import antar-modul (`import`, `require`, `from ... import`, `use crate`). Catat dependency lintas boundary — wajar, tapi tandai yang melanggar arah alami (mis. UI import DB layer) untuk diskusi.
   - Output: daftar "modul A → modul B" + daftar dependency mencurigakan.
8. **Tulis peta.** Rangkum ke satu file, mis. `CODEEXP.md` atau section di root (bukan di dalam `src/`): entry points, struktur modular, alur data, dependency graph, konvensi, dan pertanyaan terbuka. Peta harus bisa dibaca dalam 2 menit.
9. **Verifikasi peta.** Cek ulang 3 klaim terpenting ke kode nyata. Kalau README bilang A tapi kode bilang B (mis. README bilang PostgreSQL, kode pakai SQLite), tulis yang benar dan tandai mismatch-nya.

## Checklist Penyelesaian

- [ ] Manifest & README dibaca, dependency kunci dan scripts tercatat
- [ ] Struktur folder dipetakan sampai kedalaman 2-3 level
- [ ] Entry point runtime teridentifikasi dengan nama file
- [ ] Module boundaries terdokumentasi (expose vs consume)
- [ ] Minimal satu alur data end-to-end ditelusuri dengan nama file
- [ ] Dependency graph antar-modul dicatat, yang aneh ditandai
- [ ] Peta ditulis ke file dan 3 klaim terpenting diverifikasi ke kode
- [ ] Mismatch README vs kode dan pertanyaan terbuka terdokumentasi

## Contoh

Proyek: `todo-api` (Express + SQLite, 15 file).

**Output peta (ringkas):**
- Entry: `src/server.js` → `src/app.js` (routing).
- Modul: `src/routes/` (HTTP) → `src/services/` (logic) → `src/models/` (SQL).
- Alur: `GET /todos` → `routes/todos.js` → `services/todoService.js` → `models/todoModel.js` → `db.sqlite` → JSON response.
- Dependency: routes → services → models, searah — sehat.
- Mismatch: README menyebut PostgreSQL, kode memakai SQLite — perlu konfirmasi ke pemilik.

Hasil jawaban untuk "mau nambah fitur": baca `src/services/` dulu, karena logic tinggal di sana.

## Anti-pattern

- ❌ Membaca file satu per satu berurutan tanpa peta — buang waktu, cepat lupa, kesimpulan meleset.
- ❌ Percaya README mentah-mentah tanpa verifikasi ke kode.
- ❌ Memetakan SEMUA file termasuk boilerplate (config CI, `.gitignore`, test data) — fokus ke kode yang dijalankan.
- ❌ Peta setebal novel — kalau tidak kebaca 2 menit, terlalu panjang; ringkas itu fitur.
- ❌ Langsung menyarankan refactor sebelum peta selesai — diagnosis dulu, baru operasi.

Satu kalimat flavor: jaman saya masih mulai dari `grep -r "main("` tanpa peta, makanya sering nyasar setengah hari di codebase orang.