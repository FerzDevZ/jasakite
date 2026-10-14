---
name: "api-design"
description: "Designs REST/GraphQL/RPC APIs: endpoints, contracts, error semantics, versioning. Invoke when designing new APIs or reviewing API changes."
---

# API Design

Skill untuk merancang API — REST, GraphQL, atau RPC — dengan kontrak yang jelas, error semantics yang konsisten, dan jalur versioning yang tidak bikin client mati mendadak. API itu kontrak jangka panjang: sekali dipublish, client orang lain (atau client-mu sendiri yang sudah lupa) akan bergantung padanya. Mengubah kontrak yang sudah dipakai jauh lebih mahal daripada mendesainnya dengan benar dari awal — jadi di sinilah kesabaran paling terbayar.

## Tujuan

Menghasilkan desain API yang lengkap dan konsisten: resources + endpoint, request/response contract, status code dan error semantics, autentikasi/otorisasi, versioning strategy, serta trade-off yang eksplisit (REST vs GraphQL vs RPC kapan dipakai).

## Kapan Memakai

- User minta mendesain API baru (endpoint, resource, skema GraphQL, method RPC).
- User minta review desain API yang sudah ada / perubahan API.
- Menambahkan endpoint baru ke service yang sudah punya konvensi API tertentu.

Jangan dipakai untuk: mengimplementasikan kode (setelah desain disetujui, lanjut ke implement-feature), atau menjawab pertanyaan konseptual umum tanpa konteks konkret.

## Workflow

1. **Pahami kebutuhan, bukan langsung nulis endpoint.**
   - Tanya/pahami: siapa client-nya (web app, mobile, pihak ketiga)? Berapa banyak client? Seberapa sering API berubah?
   - Petakan use case-nya: operasi apa saja yang client butuhkan? (Biasanya: create, read, update, delete, list, search — tapi jangan asumsi, tanyakan.)
   - Catat non-functional requirement: rate limit, idempotency, pagination besar, dsb.

2. **Pilih gaya API dengan alasan, bukan kebiasaan:**
   - **REST** — resource-centric, cacheable, tooling matang. Paling cocok untuk CRUD + akses publik. Trade-off: aksi kompleks (transaksi multi-langkah) jadi canggung, over/under-fetching.
   - **GraphQL** — client menentukan bentuk response, satu endpoint, bagus untuk client dengan kebutuhan response yang beragam (mobile, dashboard). Trade-off: caching susah, query kompleks bisa membebani server, tooling lebih berat.
   - **RPC (gRPC/JSON-RPC)** — action-centric, efisien, kuat untuk komunikasi service-to-service internal. Trade-off: kurang human-friendly, schema evolution butuh disiplin.
   - Umumnya: REST untuk public CRUD, GraphQL untuk client beragam, RPC untuk internal service. Tulis keputusan ini + alasannya.

3. **Desain resources & endpoint (untuk REST):**
   - Resource pakai kata benda jamak: `/users`, `/orders`. Aksi pakai verb di resource khusus: `POST /orders/:id/cancel`.
   - Hierarki resource hanya kalau ada relasi kepemilikan nyata: `/users/:id/orders`.
   - Method semantics: GET (read, aman), POST (create), PUT (replace penuh, idempotent), PATCH (partial update), DELETE.
   - Query param untuk filter/sort/pagination: `?status=paid&sort=-created_at&page=2&limit=50` — dan tentukan batas `limit` (jangan unbounded).

4. **Definisikan kontrak lengkap (semua gaya):**
   - Request & response schema: field, tipe, required/optional, contoh nilai. Pakai format yang bisa dieksekusi (OpenAPI, JSON Schema, GraphQL SDL, protobuf) — bukan cuma deskripsi prosa.
   - Field naming konsisten: `camelCase` untuk JSON (konvensi umum), `snake_case` untuk protobuf, dst. Satu gaya, tidak campur.
   - Timestamps: UTC ISO 8601 (`2026-08-12T07:00:00Z`), jangan epoch tanpa kesepakatan.
   - Pagination response: `{ "data": [...], "meta": { "page": 2, "limit": 50, "total": 342 } }` — client butuh tahu total & posisi.

5. **Definisikan error semantics — ini yang paling sering dilupakan:**
   - Status code yang benar: 400 invalid input, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict (duplikat), 422 validation (biasanya lebih detail dari 400), 429 rate limited, 5xx untuk server error.
   - Error body konsisten: `{ "error": { "code": "ORDER_EMPTY", "message": "Order harus punya minimal satu item", "fields": { "items": "tidak boleh kosong" } } }` — `code` yang stabil untuk client logic, `message` untuk manusia, `fields` untuk form error.
   - Jangan bocorkan detail internal di error (stack trace, SQL query, path file).
   - Idempotency: `POST` yang bisa di-retry (pembayaran, order) perlu `Idempotency-Key` header — sebutkan kalau use case-nya ada.

6. **Tentukan versioning sebelum rilis pertama:**
   - Pilihan umum: URI versioning (`/v1/users`) — sederhana, eksplisit, gampang di-cache/di-route; header/accept versioning — lebih bersih tapi kurang terlihat; breaking vs additive change.
   - Aturan: perubahan additive (tambah field optional, tambah endpoint) tidak perlu major version. Breaking change (ubah tipe field, hapus field, ubah status code) = major version.
   - Kebijakan deprecation: umur minimum version (mis. 6-12 bulan), header `Deprecation`, log warning, lalu hapus.

7. **Sajikan desain + trade-off.**
   - Ringkasan satu halaman: gaya API, daftar endpoint, contoh request/response, error codes, versioning.
   - Sebutkan trade-off dengan jujur (mis. "pilih GraphQL karena client mobile butuh response ramping, tapi konsekuensinya caching lebih susah — kalau nanti traffic besar, siapkan layer cache di resolver").
   - Minta konfirmasi sebelum implementasi — desain yang diputuskan sepihak jarang dipakai.

## Checklist Penyelesaian

- [ ] Client & use case dipahami (siapa, berapa banyak, seberapa sering berubah)
- [ ] Gaya API dipilih dengan alasan eksplisit
- [ ] Resources & endpoint memakai konvensi konsisten (kata benda jamak, method yang benar)
- [ ] Request/response schema lengkap: tipe, required, contoh
- [ ] Naming & format konsisten (camelCase, UTC ISO 8601, pagination shape)
- [ ] Error semantics lengkap: status code benar, error body konsisten, tidak bocor detail internal
- [ ] Versioning strategy diputuskan + aturan breaking vs additive
- [ ] Pagination & rate limit disebutkan (jika relevan)
- [ ] Trade-off ditulis jujur
- [ ] Desain disajikan untuk konfirmasi sebelum implementasi

## Contoh

**User:** "Bikin API untuk aplikasi toko: lihat produk, buat order, cek status order."

Keputusan: REST (public API, CRUD, client web+mobile dengan kebutuhan sederhana — GraphQL overkill di sini).

Desain:

```
GET    /v1/products?category=:id&page=1&limit=20   → list produk (public, cacheable)
GET    /v1/products/:id                             → detail produk
POST   /v1/orders                                   → buat order (auth + Idempotency-Key)
GET    /v1/orders/:id                               → status order (hanya pemilik / admin)
POST   /v1/orders/:id/cancel                        → batal order (hanya kalau status=created)
```

Error semantics: 401 tanpa token, 403 order orang lain, 404 produk tidak ada, 409 kalau order sudah diproses tidak bisa dibatalkan, 422 kalau items kosong.

Versioning: `/v1/` di URI. Additive change boleh tanpa major; ubah tipe field = major. Deprecation: 6 bulan, header `Deprecation: true`.

Contoh error body:

```json
{
  "error": {
    "code": "ORDER_ITEMS_EMPTY",
    "message": "Order harus punya minimal satu item.",
    "fields": { "items": "tidak boleh kosong" }
  }
}
```

Trade-off dicatat: `POST /v1/orders/:id/cancel` sebagai action endpoint lebih eksplisit daripada `PATCH` dengan status field — mengorbankan keseragaman REST demi kejelasan transisi status.

## Anti-pattern

- ❌ Langsung nulis endpoint tanpa tanya use case — desain API tanpa memahami client itu arsitektur tanpa fondasi.
- ❌ Status code asal (semua error 400, atau semua 500) — client tidak bisa bedakan salah mereka vs salah server.
- ❌ Error body berubah-ubah tiap endpoint — client harus parse error per-endpoint, itu neraka.
- ❌ Field naming campur (`user_id` di satu tempat, `userId` di tempat lain).
- ❌ Timestamp dalam beberapa format (epoch di satu field, ISO di field lain).
- ❌ Pagination unbounded tanpa `limit` — satu query `SELECT *` yang membunuh DB.
- ❌ Tidak memikirkan versioning, lalu breaking change diam-diam di produksi — client pihak ketiga marah, dan mereka benar.
- ❌ Memakai GraphQL/REST/RPC karena "katanya bagus" tanpa menimbang kebutuhan.
- ❌ Membocorkan detail internal di pesan error (stack trace, nama file server).