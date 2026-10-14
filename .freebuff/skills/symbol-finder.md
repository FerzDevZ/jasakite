---
name: "symbol-finder"
description: "Locates definitions, usages, references of symbols (functions, classes, variables) across the codebase. Invoke when tracing where something is defined or used."
---

# Symbol Finder

Pelacak simbol. Skill ini menemukan definisi, pemakaian, dan referensi sebuah simbol — fungsi, class, variabel, konstanta, method — di seluruh codebase. Menjawab pertanyaan: "di mana `validateToken` didefinisikan?", "siapa saja yang memakai `MAX_RETRY`?", "kenapa perubahan di `UserRepo.find` berdampak ke mana-mana?". Ini detektif-nya: simbolnya satu, jejaknya banyak.

## Tujuan

Menghasilkan peta lengkap sebuah simbol: lokasi definisi, semua titik pemakaian (usage), dan (jika diminta) rantai panggilan — dengan path file + nomor baris yang akurat. Output berguna untuk memahami dampak perubahan, menemukan bug (definisi ganda, pemakaian tak terduga), atau menelusuri alur eksekusi.

## Kapan Memakai

- User bertanya "di mana X didefinisikan/dipakai?" atau "siapa yang memanggil X?".
- Mau mengubah perilaku simbol — cek semua pemakaian dulu agar tidak meledakkan yang lain.
- Menelusuri alur: "dari UI ke mana `submitOrder` berujung?".
- Menemukan duplikasi atau konflik: simbol sama didefinisikan di beberapa tempat.
- Refactor rename besar — daftar semua pemakaian jadi bahan konfirmasi sebelum rename.

Jangan pakai kalau: yang dicari perilaku/inti tanpa nama simbol (itu intent-code-finder), atau yang dicari file berdasarkan nama/konten (itu file-finder).

## Strategi Pencarian Berlapis

Jangan langsung percaya satu cara — bahasa dan tooling beda-beda, jadi gunakan berlapis:

1. **Tools bahasa (kalau ada).** Language Server (Go to Definition / Find References) paling akurat untuk bahasa statis dengan resolver baik (TS, Go, Rust, Java, Python). Pakai dulu kalau tersedia.
2. **Grep definisi:** `^(export )?(async )?(function|class|const|let|var|def|func|fn|public|private|static)\s*<nama>` — cari dengan anchor garis untuk definisi.
3. **Grep referensi:** `<nama>` polos — tapi hati-hati false positive (kata sama di komentar, string, variabel lokal). Saring dengan: `\b<nama>\b` (word boundary), case-sensitive, dan cek hasilnya satu per satu untuk konteks.
4. **Cross-check tipe simbol:** method (`obj.nama`, `this.nama`, `self.nama`), import (`import { nama }`, `use crate::nama`, `require('x').nama`), enum/member (`NamaEnum.NAMA`, `NAMA_CONST`). Tiap tipe punya pola grep sendiri — jangan campur.

Catatan penting: kalau hasil grep definisi tidak ketemu, kemungkinan simbol itu (a) imported/re-exported dari modul lain — telusuri export-nya, atau (b) dibangkitkan (generated code) — cari di folder build/generated sebelum menyerah. Satu lagi: jangan lupa cek wildcard import (`import * as x`, `from mod import *`) — simbol bisa masuk tanpa disebut namanya.

## Workflow

1. **Kenali bentuk simbol.** Nama persis? Tipe (fungsi/class/konstanta/method)? Bahasa dan struktur folder? Ini menentukan pola pencarian. Kalau user menyebut nama tidak persis, cari dulu kandidat nama (`grep -i` sebagian kata), lalu konfirmasi mana yang dimaksud.
   - Output: nama persis + tipe simbol.
2. **Temukan definisi.** Mulai dari tools bahasa (kalau ada), lalu fallback grep definisi dengan pola tipe. Perhatikan: definisi bisa lebih dari satu (overload, atau modul berbeda — mencurigakan, laporkan). Catat: file, baris, dan signature. Untuk simbol yang namanya generik (`parse`, `init`, `build`), gunakan pola yang lebih spesifik (mis. tambahkan konteks pemanggil) supaya tidak ketarik ke definisi yang salah.
   - Output yang diharapkan: 1+ lokasi definisi dengan baris.
3. **Temukan semua pemakaian.** Grep referensi dengan `\b<nama>\b` case-sensitive, saring false positive dengan baca konteks 1-2 baris di sekitar tiap match. Kelompokkan hasil: pemakaian sebagai pemanggil, sebagai argumen, sebagai import/export, di string/komentar (bukan pemakaian nyata — tandai bedanya). Hitung juga totalnya: kalau pemakaian cuma 1-2, jawabannya pendek; kalau puluhan, kelompokkan per file dan per pola pemakaian supaya laporan terbaca.
   - Output: daftar pemakaian nyata per file+baris, dipisah dari false positive.
4. **Lacak rantai panggilan (opsional).** Untuk pertanyaan "berdampak ke mana saja": dari tiap pemanggil, cari siapa yang memanggil pemanggil itu (ulangi langkah 3). Batasi kedalaman (2-3 level) kecuali diminta lebih — rantai tak berujung itu lubang hitam waktu. Prioritas: telusuri dulu pemakaian yang paling sering/mencurigakan, bukan semua cabang.
   - Output: peta panggilan "X ← dipanggil oleh Y ← dipanggil oleh Z".
5. **Rangkum dan jawab.** Presentasi: definisi dulu (path:baris + signature), lalu daftar pemakaian per file (dengan nomor baris). Kalau ada temuan penting (definisi ganda, pemakaian dari tempat tak terduga, import yang mematikan), sebutkan — ini biasanya yang user cari sebenarnya.
6. **Verifikasi klaim.** Untuk pemakaian yang dipakai sebagai dasar jawaban, baca potongan kodenya — pastikan benar memakai simbol ini, bukan kebetulan nama sama. Kalau ragu, katakan "kemungkinan".

## Checklist Penyelesaian

- [ ] Nama persis + tipe simbol dikonfirmasi
- [ ] Definisi ditemukan (file, baris, signature) — lebih dari satu dilaporkan
- [ ] Semua pemakaian nyata terdaftar per file+baris
- [ ] False positive (komentar, string, nama kebetulan) disaring dengan baca konteks
- [ ] Rantai panggilan dilacak jika relevan, dengan batas kedalaman wajar
- [ ] Jawaban menyebutkan temuan penting (definisi ganda, pemakaian tak terduga)
- [ ] Ketidakpastian dilaporkan, tidak dipaksakan pasti
- [ ] Daftar hasil disaring dan diringkas — bukan dump mentah

## Contoh

**Task:** cari semua pemakaian `saveToCache` di proyek TS (src/).

1. Definisi: `grep "^(export )?function saveToCache"` → `src/services/cache.ts:14` — `export function saveToCache(key: string, value: unknown, ttl?: number)`.
2. Referensi: `grep "\bsaveToCache\b"` → 6 match di 4 file. Saring: 1 di komentar (`// TODO: use saveToCache here`), 1 di string (`error('saveToCache failed')`), 4 pemakaian nyata:
   - `src/api/users.ts:33` (import + call)
   - `src/api/orders.ts:57` (call)
   - `src/jobs/cleanup.ts:88` (call dengan ttl argumen — satu-satunya yang pakai ttl)
   - `src/services/cache.ts:29` (panggilan internal dari `saveToCacheBatch`)
3. Rantai: `users.ts:33` dipanggil `POST /users` (route) → `users.ts:30` → `saveToCache`. Bounded, 2 level cukup.
4. Jawaban: definisi di `cache.ts:14`; pemakaian 4 (daftar dengan baris); temuan: `cleanup.ts` satu-satunya pemakai argumen `ttl` — kalau mau ubah signature TTL, cek file ini dulu.

**Contoh kedua — simbol tak ketemu definisi:** user tanya `retryOnce`. Grep definisi kosong, tapi ada pemakaian di `api/client.ts:22`. Telusuri: `client.ts:1` ada `import { retryOnce } from './utils/retry'` — ternyata definisi di `utils/retry.ts:10`, tapi nama file tidak mengandung kata "retry" sehingga keburu dilewatkan. Jawaban: definisi + pemakaian, plus catatan cara ketemunya (lewat import, bukan grep nama).

## Anti-pattern

- ❌ Grep nama polos tanpa word boundary — banjir false positive (nama di string, komentar, prefix kata lain).
- ❌ Menjawab "tidak dipakai siapa-siapa" sebelum cek import dan pemanggilan tidak langsung (via re-export).
- ❌ Melacak rantai panggilan tanpa batas — kedalaman 2-3 level cukup kecuali diminta.
- ❌ Mengabaikan definisi ganda — dua definisi `foo` di modul berbeda bisa jadi bug atau disengaja; laporkan, jangan pilih diam-diam.
- ❌ Lupa tipe simbol — pattern pencarian method (`this.foo`) beda dengan fungsi bebas (`foo(`); pakai pola yang sesuai.
- ❌ Menyerahkan daftar mentah 50 match tanpa pengelompokan — jawaban harus sudah disaring dan diringkas.