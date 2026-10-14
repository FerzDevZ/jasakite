---
name: "rest-api-tester"
description: "Tests REST APIs: curl/httpie patterns, expectations, edge cases, error paths. Invoke when testing or debugging API endpoints."
---

# REST API Tester

Test API dengan curl/httpie — pola yang cepat, ekspektasi yang jelas, dan path error yang tidak dilupakan. API yang tidak dites sama saja dengan janji tanpa bukti.

## Tujuan

Menguji endpoint REST secara sistematis:
- Verifikasi status code, header, dan body yang benar.
- Menutup edge case dan error path, bukan cuma happy path.
- Men-debug endpoint yang bermasalah dengan bukti (request/response nyata).
- Menghasilkan perintah yang bisa diulang (bukan klik-klik di Postman lalu hilang).

## Kapan Memakai

- Ada endpoint baru yang mau diverifikasi sebelum/ketika diintegrasikan.
- Endpoint error/aneh: "katanya 500 terus", "body kosong", "404 padahal ada".
- Ingin membuktikan perilaku API (status code, format, validasi) secara cepat.
- Menyusun dokumentasi/ekspektasi API atau reproduksi bug untuk dilaporkan.

## Workflow

1. **Pahami contract-nya dulu.** Baca route handler / docs / spec: method, path, headers (auth, content-type), request body shape, dan respon yang diharapkan per kasus. Jangan menebak — kalau ragu, baca kodenya.
2. **Cek server hidup.** `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health` — pastikan server up sebelum mulai, biar tidak membuang waktu test ke server yang mati.
3. **Test happy path dulu, lengkap:**
   ```bash
   curl -s -i http://localhost:3000/api/v1/users/42
   ```
   Periksa: status code benar (200), `Content-Type` benar (`application/json`), body shape sesuai contract (field ada, tipe benar, id/date format benar).
4. **Test auth & permission:**
   - Tanpa token: harus `401` (bukan 200, bukan 500).
   - Token invalid/expired: harus `401` atau `403` sesuai desain.
   - Token user biasa akses resource user lain: harus `403`.
   ```bash
   curl -s -i http://localhost:3000/api/v1/users/42   # tanpa header auth
   ```
5. **Test validasi (4xx):**
   - Field wajib kosong → `400`/`422` dengan pesan error yang menyebut field mana.
   - Tipe salah (`"age": "abc"` untuk integer) → `4xx`.
   - Value di luar batas (email invalid, umur negatif, string kepanjangan) → `4xx`.
   - Payload JSON malformed (`{"a":` ) → `400` — dan jangan sampai 500.
6. **Test error path lain:**
   - Resource tidak ada → `404` dengan body error yang konsisten.
   - Duplikat (mis. email sudah terdaftar) → `409` atau `422` — pastikan bukan 500.
   - Method salah (DELETE ke endpoint GET-only) → `405 Method Not Allowed`.
   - Query param invalid/pagination aneh (`?page=-1`, `?limit=10000`) → ditolak dengan sopan, bukan error aneh.
7. **Uji dengan payload realistis & tepi:**
   - Karakter unicode/emoji: `-d '{"name":"café ☕"}'` — harus tersimpan & kembali utuh, tidak rusak encoding.
   - HTML/script string: `-d '{"name":"<script>alert(1)</script>"}'` — tersimpan sebagai data (tidak dieksekusi), dan output di-escape.
   - Body besar (mis. 1MB) — batas ukuran request (`413` kalau ada limit) atau tetap berfungsi.
   - Double submit — kirim 2x, pastikan idempoten untuk POST yang seharusnya idempoten.
8. **Debug yang efisien:**
   - `-i` (include headers), `-v` (verbose, lihat SSL/handshake), `-X` untuk method, `-d` body, `-H` header.
   - Response jelek: cek dulu status code, lalu `Content-Type`, lalu body. Log server untuk lihat stack trace.
   - Simpan respon ke file: `curl -s ... -o resp.json`, lalu baca.
   - Untuk JSON panjang, pakai `| python3 -m json.tool` atau `jq` biar terbaca.
9. **Catat hasil.** Test yang sudah hijau: simpan perintahnya (skrip bash/README/koleksi httpie) supaya bisa diulang. Yang gagal: catat request + response persis (sanitasi token), laporkan dengan bukti.

## Checklist Penyelesaian

- [ ] Happy path: status, Content-Type, dan body sesuai contract
- [ ] Tanpa auth → 401; auth salah/expired → 401/403; akses lintas user → 403
- [ ] Validasi gagal → 4xx dengan pesan yang menyebut field
- [ ] Not found → 404; duplikat → 409/422; method salah → 405
- [ ] Payload malformed → 400, bukan 500
- [ ] Unicode/emoji/HTML-string tidak rusak dan tidak dieksekusi
- [ ] Pagination/boundary aneh ditangani
- [ ] Tidak ada kasus 500 yang seharusnya 4xx
- [ ] Perintah test yang bisa diulang tersimpan

## Contoh

Debug sesi nyata: `GET /api/v1/orders/999` selalu `500`.

```bash
# 1. Reproduce
curl -s -i http://localhost:3000/api/v1/orders/999
# HTTP/1.1 500 Internal Server Error
# {"error":"Cannot read properties of null (reading 'id')"}

# 2. Bandingkan dengan yang ada
curl -s -i http://localhost:3000/api/v1/orders/42
# HTTP/1.1 200 OK — body lengkap

# 3. Hipotesis: handler tidak handle null dari DB (order tidak ada)
# Cek log server → stack trace: TypeError di orderService.format()

# 4. Verifikasi fix (setelah developer perbaiki)
curl -s -i http://localhost:3000/api/v1/orders/999
# HTTP/1.1 404 Not Found
# {"error":{"code":"ORDER_NOT_FOUND","message":"Order 999 tidak ditemukan"}}
```

Kesimpulan: bug bukan di DB, tapi di handler yang lupa mengecek null — `500` untuk data yang tidak ada itu salah, harusnya `404`.

Catatan sepuh: 500 untuk input user yang wajar itu selalu bug, bukan nasib. User tidak pernah salah — kode yang tidak antisipasi itulah yang salah.

## Anti-pattern

- ❌ Hanya test happy path lalu klaim "API aman" — error path adalah 80% bug yang ditemui user.
- ❌ Test via UI doang (klik di browser) — tidak repeatable, tidak tahu status code, tidak tahu body persis.
- ❌ Token di-print ke log/chat/README tanpa sanitasi — itu kredensial, perlakukan seperti password.
- ❌ Abaikan status code dan cuma lihat "ada JSON" — 200 vs 201 vs 204 itu beda contract.
- ❌ Test ke server produksi dengan data produksi — jangan coba-coba di tempat yang salah.
- ❌ Menggunakan endpoint yang sama berulang tanpa memikirkan side effect (kirim email, bayar, delete) — sadarilah apa yang kamu picu.
- ❌ Langsung bilang "API-nya error" tanpa bukti request/response — tunjukkan, baru diskusi.
- ❌ `curl` tanpa `-i`/`-w "%{http_code}"` lalu bingung kenapa tidak tahu statusnya.