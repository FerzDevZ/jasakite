---
name: "duplicate-finder"
description: "Detects duplicated code blocks and suggests deduplication opportunities. Invoke when user suspects copy-paste code or wants to reduce duplication."
---

# Duplicate Finder

Pemburu kode copy-paste. Skill ini mendeteksi blok kode duplikat — persis, hampir sama, atau sama polanya — lalu menyarankan peluang deduplikasi dengan mempertimbangkan trade-off. Copy-paste itu bukan dosa, tapi kode duplikat yang dibiarkan itu utang: bug yang diperbaiki di satu tempat, lupa di tempat lain. Jaman saya dulu pernah debug 3 jam, ternyata fix-nya harus diterapkan di 5 salinan file yang sama.

## Tujuan

Menghasilkan daftar duplikasi yang terdeteksi: lokasi tiap salinan (path + baris), tingkat kemiripan, perkiraan ukuran, dan rekomendasi deduplikasi (ekstrak, samakan, atau biarkan) lengkap dengan alasannya. Output akhir berupa laporan yang bisa dipakai untuk memutuskan refactor — bukan refactor otomatis tanpa persetujuan.

## Kapan Memakai

- User mencurigai kode hasil copy-paste ("kok banyak yang mirip?") atau minta "cari duplikasi".
- Ada pola bug berulang di tempat berbeda — sering akar-nya kode duplikat.
- Sebelum refactor besar — tahu dulu mana yang duplikat, supaya ekstrak sekali, bukan dua kali.
- Code review: cek PR baru tidak menambah duplikasi.

Jangan pakai kalau: hanya ingin satu potongan kode dirapikan (itu refactor), atau project-nya sedang stabil dan tidak ada rencana refactor — deteksi tanpa aksi cuma bikin daftar yang bikin cemas.

## Strategi Deteksi Bertingkat

Mulai dari yang murah, naik ke yang lebih teliti:

1. **Duplikasi persis (jaman mudah).** Blok yang benar-benar identik (minus whitespace). Tools: grep untuk baris yang sama berulang, atau hash isi per file — hash yang sama di file berbeda = kandidat kuat. Bisa juga grep pola yang mencurigakan: blok komentar identik, sequence baris yang sama.
2. **Duplikasi hampir persis (jaman sedang).** Sama tapi beda nama variabel/string. Normalisasi dulu: ganti identifier dan string literal dengan placeholder (mis. `VAR`, `STR`), hash, bandingkan. Blok yang hash-nya sama setelah normalisasi = duplikasi struktural.
3. **Duplikasi struktural / pola (jaman susah).** Struktur sama, implementasi beda tipis (beda branching, beda satu langkah). Ini tidak bisa di-deteksi hash — pakai semantic search: cari query seperti "similar code block that validates input and returns errors" di beberapa file, bandingkan secara manual. Tandai sebagai "pola mirip" — butuh mata manusia untuk memutuskan.

## Workflow

1. **Tentukan cakupan.** Proyek penuh atau satu modul/folder? Batasi ke kode sumber (bukan `node_modules`, `vendor`, `dist`, file generated — copy-paste di sana bukan utang kita). Kalau user menyebut area spesifik, mulai dari sana. Untuk proyek besar, kerjakan per modul dulu — hasilnya lebih cepat dan laporannya lebih terbaca.
   - Output: daftar folder/ekstensi yang akan discan.
2. **Deteksi duplikasi persis.** Jalankan langkah hash/normalisasi untuk blok (mis. 5+ baris identik) dalam file yang berbeda. Catat: pasangan file, rentang baris, ukuran blok.
   - Output yang diharapkan: daftar pasangan duplikat persis.
3. **Deteksi duplikasi hampir persis.** Ulangi dengan normalisasi identifier/string. Ini menangkap mayoritas kasus copy-paste sungguhan (orang biasanya rename variabel saat paste).
   - Output: daftar pasangan duplikat struktural + tingkat kemiripan.
4. **Cek duplikasi struktural (manual).** Dari hasil semantic search atau insting (dua file dengan tanggung jawab mirip), bandingkan blok secara manual. Beri label "pola mirip" — belum tentu duplikat. Fokus ke file yang masuk akal berbagi logika (helper, validators, service layer) — jangan membandingkan semua file satu-satu, itu O(n²) yang tidak perlu.
5. **Verifikasi tiap kandidat.** Baca kedua sisi tiap pasangan — pastikan benar-benar duplikat, dan periksa: apakah sudah pernah beda (drift)? Mana yang lebih baru/benar? Ada test yang mengunci perilaku salah satu? Ini menentukan rekomendasi. Catat juga jumlah salinan: 2 salinan kadang wajar, 3+ hampir selalu tanda perlu ekstraksi.
   - Output: tiap kandidat diberi status (duplikat / pola mirip / false positive).
6. **Susun rekomendasi deduplikasi.** Untuk tiap duplikat yang terkonfirmasi, pilih salah satu:
   - **Ekstrak** (ke fungsi/helper/modul bersama) — untuk blok yang perilakunya sama dan berukuran cukup (>10 baris atau >2 salinan).
   - **Samakan** (copy yang benar ke tempat lain) — kalau salinannya sudah drift dan yang satu benar, ekstrak malah rumit.
   - **Biarkan** — kalau duplikasi itu disengaja (dua modul yang sengaja dipisah, mis. backend vs frontend, atau blok pendek di mana ekstraksi menambah indirection). Jujur: tidak semua duplikasi wajib dihilangkan.
   Beri alasan singkat tiap rekomendasi + perkiraan risiko (test apa yang harus lulus). Untuk kasus drift, tentukan dulu salinan mana yang "benar" (baca test dan git log) sebelum menyarankan arah penyatuan.
7. **Laporkan.** Susun laporan ringkas: tabel duplikat (lokasi, ukuran, kemiripan, rekomendasi). JANGAN langsung refactor — serahkan keputusan ke user, kecuali diminta.

## Checklist Penyelesaian

- [ ] Cakupan ditentukan, folder generated/vendor dikecualikan
- [ ] Deteksi persis dijalankan (hash/baris identik)
- [ ] Deteksi hampir persis dijalankan (normalisasi identifier/string)
- [ ] Pola mirip diperiksa manual dengan semantic search
- [ ] Setiap kandidat diverifikasi dengan membaca kedua sisi
- [ ] Status tiap kandidat jelas: duplikat / pola mirip / false positive
- [ ] Rekomendasi per kandidat: ekstrak / samakan / biarkan + alasan
- [ ] Laporan diserahkan tanpa refactor paksa (kecuali diminta user)

## Contoh

**Deteksi** di `src/` (TS):
- Duplikat persis: `helpers/format.ts:20-35` ≈ `helpers/format2.ts:18-33` (16 baris identik) — `format2.ts` hasil copy lama, tidak terpakai (cuma 1 import). Status: duplikat.
- Hampir persis: `api/users.ts:40-58` vs `api/admins.ts:55-73` — beda hanya `users`/`admins` di query dan nama variabel. Status: duplikat struktural (18 baris).
- Pola mirip: `services/email.ts` vs `services/sms.ts` — alur sama (template → validate → send → log) tapi implementasi beda (lib berbeda). Status: pola mirip.

**Rekomendasi:**
- `format2.ts` → hapus file (tidak terpakai, import-nya tinggal diganti).
- `users.ts`/`admins.ts` → ekstrak `listByRole(role, query)` ke `api/common.ts`, terima argumen `role`. Risiko rendah: 2 test ada untuk tiap endpoint.
- `email.ts`/`sms.ts` → biarkan dulu: ekstraksi butuh abstraksi notifikasi yang belum ada, dan kedua alur masih akan berubah; tunda sampai stabil. `ponytail:` kalau salinan ketiga (push notification) muncul, baru ekstrak.

**Catatan penting dari contoh:** perhatikan bahwa 3 rekomendasi beda-beda untuk 3 kasus beda — tidak ada jawaban tunggal "semua duplikat harus di-extract". Laporan yang baik justru membedakan: hapus file mati, ekstrak logika yang sama, biarkan yang sengaja terpisah.

## Anti-pattern

- ❌ Menghapus semua duplikasi — duplikasi kecil (<10 baris) atau yang disengaja justru lebih jelas daripada abstraksi yang dipaksakan.
- ❌ Refactor tanpa verifikasi drift — salinan yang sudah beda harus disamakan dulu dengan keputusan mana yang benar, bukan di-extract mentah.
- ❌ Lupa cek pemakaian file duplikat — ekstrak dulu, hapus salinan, lalu cek import; menghapus file yang masih dipakai = build patah.
- ❌ Menghitung duplikasi termasuk file generated/vendor — laporan jadi berisik dan tidak mewakili utang nyata.
- ❌ Langsung mengubah kode tanpa laporan — user yang putuskan; ini skill deteksi, bukan skill refactor paksa.
- ❌ Mendeteksi tapi tidak melaporkan ukuran dampak (berapa baris, berapa salinan) — angka ini yang dipakai user untuk memprioritaskan.