---
name: "fullstack-implementer"
description: "Implements full-stack features: frontend, backend, database, API wiring, with end-to-end verification. Invoke when a feature spans frontend and backend."
---

# Fullstack Implementer

Implementasi fitur yang tembus dari database sampai layar — dengan verifikasi end-to-end, bukan asumsi. Frontend, backend, database, dan wiring API dikerjakan sebagai satu sistem yang utuh.

## Tujuan

Mengimplementasikan fitur full-stack yang:
- Berjalan end-to-end: DB → backend → API → frontend → user.
- Konsisten dengan konvensi codebase yang ada (framework, struktur folder, pola).
- Punya validasi di semua trust boundary (frontend, backend, DB).
- Terverifikasi nyata — dijalankan dan dites, bukan "seharusnya jalan".
- Tidak merusak fitur yang sudah ada (regression-aware).

## Kapan Memakai

- Task yang melibatkan lebih dari satu lapisan: "bikin fitur X" (mis. daftar akun, upload foto, keranjang, pencarian).
- Ada perubahan yang menyentuh schema database + API + UI sekaligus.
- Menambahkan endpoint baru yang harus dipakai frontend.
- Men-debug fitur yang "di frontend katanya backend salah, di backend katanya frontend salah".

## Workflow

1. **Petakan alur dulu sebelum nulis kode.** Tulis alur datanya: `form input → POST /api/v1/users → service → validation → insert DB → response → UI render`. Identifikasi tiap trust boundary dan error path (validasi gagal, duplikat, DB down, timeout). Ini 10 menit yang menghemat 2 jam.
2. **Baca codebase dulu.** Cek: framework backend & frontend, struktur folder, pola routing, pola error handling, ORM/query builder, migrasi DB, konvensi penamaan, apakah sudah ada pattern yang mirip. Tiru pola yang ada — jangan bikin gaya baru.
3. **Backend + DB dulu, lalu API, lalu frontend.** Urutan ini bikin API bisa dites sendiri (via curl) sebelum frontend menyentuhnya.
   - **DB:** tulis migrasi (bukan langsung edit schema produksi). Ikuti konvensi migrasi project. Tambah index untuk kolom yang dipakai filter/join. Jangan lupa constraint (unique, not null, FK) — jangan andalkan app code doang.
   - **Backend:** route → validation (pakai library/pattern yang ada, mis. zod/express-validator/validator) → service/business logic → repository/query → response. Error dikembalikan dengan status code & format error yang konsisten (mis. `{ "error": { "code": "...", "message": "..." } }`).
   - **API contract:** tentukan request/response shape sejak awal. Sertakan pagination untuk list, status code yang tepat (200/201/400/401/403/404/409/422/500).
4. **Test API dulu dengan curl** (lihat skill rest-api-tester): happy path, validasi gagal, not-found, unauthorized. Jangan lanjut ke frontend sebelum ini hijau.
5. **Frontend wiring:**
   - Konsumsi API via client/fetch yang sudah ada (jangan bikin layer HTTP baru tanpa alasan).
   - Loading/error/empty state untuk semua request.
   - Jangan render data mentah tanpa escape — biar XSS tidak masuk lewat pintu belakang (lihat web-security-checker).
   - Form: validasi client-side untuk UX, tapi INGAT: validasi server adalah yang berkuasa. Client-side cuma kosmetik.
6. **Handling error path yang benar:** 401 → redirect/refresh token; 409 duplikat → tampilkan pesan "sudah terdaftar" di field terkait; 422/400 → petakan error ke field form; network error → pesan "cek koneksi" + retry. Jangan tampilkan stack trace atau JSON mentah ke user.
7. **Verifikasi end-to-end:**
   - Jalankan server (dev) + frontend, lakukan skenario nyata di browser: isi form, submit, cek data masuk DB (query langsung), cek tampil di UI, cek bisa di-edit/dihapus kalau fiturnya begitu.
   - Jalankan test yang ada: `npm test`/`pytest`/dll — pastikan tidak ada yang merah karena perubahanmu.
   - Cek kasus tepi: input kosong, karakter spesial/emoji/unicode, payload besar, double submit (klik submit 2x cepat — pastikan idempoten atau tombol di-disable saat loading).
   - Kalau ada lint/build step, jalankan.

## Checklist Penyelesaian

- [ ] Migrasi DB ada, constraint & index tepat, bisa rollback
- [ ] Backend: route + validasi + service + query lengkap, error format konsisten
- [ ] Status code benar untuk semua path (sukses, validasi gagal, not found, unauthorized)
- [ ] API terverifikasi dengan curl sebelum frontend
- [ ] Frontend: loading/error/empty state ada, error terpetakan ke UI
- [ ] Data dari API di-render dengan escape yang benar (anti-XSS)
- [ ] Double submit tertangani (disable saat loading / idempotent)
- [ ] Skenario end-to-end nyata dijalankan: input → DB → UI
- [ ] Test suite/lint/build yang ada tetap hijau
- [ ] Tidak ada console error di browser

## Contoh

**Feature:** user bisa ubah password dari halaman profile.

Alur & titik penting:

1. **DB:** migrasi menambah kolom `password_changed_at` (nullable) di tabel `users` — untuk logika "paksa ganti password" dan audit.
2. **Backend** — `POST /api/v1/users/me/password`:
   - Validasi: `current_password` wajib, `new_password` minimal 8 karakter + cek kekuatan, `new_password != current_password`.
   - Cek `current_password` dengan `bcrypt.compare` (JANGAN pakai `==` string — hash dulu).
   - Update hash baru + `password_changed_at = now()`.
   - Respon sukses `204 No Content`; gagal: `400` (validasi), `401` (current password salah), `409` (password baru sama dengan lama).
3. **curl test:**
   ```bash
   curl -s -X POST http://localhost:3000/api/v1/users/me/password \
     -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"current_password":"lama","new_password":"baru-12345"}' -i
   # harap: HTTP/1.1 204 No Content
   ```
4. **Frontend:** form 2 field (`current_password`, `new_password`) + konfirmasi; saat submit tombol di-disable + spinner; `401` → pesan "Password lama salah" di field pertama; sukses → toast + form dikosongkan.
5. **Verifikasi:** ubah password via UI, lalu login dengan password baru dan lama (lama harus ditolak); cek `password_changed_at` terisi di DB.

Catatan sepuh: fitur "gampang" kayak ganti password ini yang biasanya bocor — orang lupa cek hash, lupa rate-limit, atau lupa bahwa session lama harus di-invalidate. Urutan kerja + verifikasi di atas bukan birokrasi, itu tameng.

## Anti-pattern

- ❌ Frontend duluan, backend belakangan — ujungnya API tidak sesuai kebutuhan dan dibolak-balik.
- ❌ Validasi cuma di frontend — API bisa dipanggil siapa saja; server tanpa validasi = pintu terbuka.
- ❌ Langsung edit schema DB tanpa migrasi — besok temanmu tidak bisa develop karena schema beda.
- ❌ Error backend ditampilkan mentah ke UI (stack trace, SQL error) — bocor info + UX jelek.
- ❌ Anggap "sudah jalan" tanpa verifikasi — belum dicoba = belum jalan.
- ❌ Hanya test happy path — error path adalah tempat bug tinggal.
- ❌ Menambah dependency/abstraksi baru padahal codebase sudah punya pola yang sama.
- ❌ Tidak menjalankan test yang ada — fitur barumu bisa merusak yang lain tanpa disadari.