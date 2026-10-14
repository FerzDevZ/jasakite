---
name: "web-security-checker"
description: "Checks web apps for OWASP Top 10 issues: XSS, CSRF, injection, auth flaws. Invoke when securing web apps or reviewing vulnerabilities."
---

# Web Security Checker

Periksa aplikasi web untuk masalah OWASP Top 10 — XSS, CSRF, injection, dan kelemahan auth — sebelum orang jahat menemukannya duluan. Keamanan bukan fitur bonus: itu syarat keluar ke produksi.

## Tujuan

- Mengidentifikasi kerentanan OWASP Top 10 di codebase dan API.
- Merekomendasikan perbaikan yang konkret (bukan "perkuat keamanan" yang abstrak).
- Memverifikasi perbaikan setelah diterapkan.
- Mengajarkan pola bertahan: pertahanan berlapis, validasi di trust boundary, least privilege.

## Kapan Memakai

- Ada fitur baru yang menyentuh auth, input user, upload, atau data sensitif.
- Review keamanan sebelum rilis / sebelum merge ke produksi.
- Laporan/dugaan kerentanan: "kenapa bisa di-hack", "bagaimana ini dibobol".
- Audit menyeluruh aplikasi web yang sudah berjalan.

## Workflow

1. **Petakan permukaan serangan dulu.** Daftar semua entry point: endpoint publik, endpoint auth, form input, parameter query/path, header, cookies, file upload, callback/redirect. Semua tempat di mana input dari luar masuk ke sistem.
2. **A01 — Injection (SQL, NoSQL, command):**
   - Cari query yang menyambung string: `"SELECT * FROM users WHERE id = " + id`. Harus pakai prepared statement / parameterized query / ORM binding.
   - Test dengan payload: `' OR '1'='1`, `1; DROP TABLE users--`, `{"$ne": null}` untuk NoSQL.
   - Perbaikan: parameterized query WAJIB; input validation sebagai lapisan kedua; jangan pernah eval user input.
3. **A02 — Broken Authentication:**
   - Password: hash dengan bcrypt/argon2 (bukan MD5/SHA1, bukan plaintext). Cek cost factor cukup (bcrypt cost ≥ 10).
   - Session/token: expiry pendek, invalidate saat logout/ganti password, jangan taruh token di URL/localStorage kalau bisa (dulu pakai httpOnly cookie; sekarang pertimbangkan kebutuhan SPA tapi jangan asal).
   - Rate limiting untuk login (mis. 5 gagal per 15 menit per IP/akun) — cek pakai curl berkali-kali.
   - MFA untuk akses sensitif (admin, transfer).
4. **A03 — Sensitive Data Exposure:**
   - Data sensitif (password, token, PII, payment) WAJIB di-enkripsi saat transit (HTTPS saja — jangan terima plain HTTP untuk data sensitif) dan saat istirahat.
   - Jangan log password/token/header auth. Grep `console.log`/`print` di sekitar data sensitif.
   - Jangan kirim data sensitif yang tidak perlu ke frontend (mis. hash password ikut di respon API).
   - Header keamanan: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`.
5. **A04 — Injection-level XXE / A05 — Broken Access Control:**
   - Access control: cek pada setiap handler bahwa user hanya bisa akses resource miliknya (jangan percaya `id` dari client — validasi kepemilikan di server). Test: token user A akses resource user B → harus 403.
   - Jangan sembunyikan fungsi admin dari UI doang — cek authorization di backend setiap kali.
   - IDOR (Insecure Direct Object Reference) adalah kerentanan access-control paling umum: `GET /api/v1/orders/42` — ganti 42 dengan milik orang lain.
6. **A06 — Security Misconfiguration:**
   - Default credentials (`admin/admin`, `root/root`), debug mode aktif di produksi, stack trace tampil ke client, CORS terlalu longgar (`Access-Control-Allow-Origin: *` + credentials = bahaya).
   - Error handler global: pastikan 500 tidak membocorkan stack trace/versi framework.
7. **A07 — XSS (Cross-Site Scripting):**
   - Cek semua render user input: `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `document.write`, string HTML yang disambung. Harus text node / escaping otomatis framework.
   - Beri tahu atribut berbahaya: `href`, `src`, `style` yang diisi user — validasi `javascript:` dan `data:` scheme.
   - Test payload: `<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `"><svg onload=alert(1)>`. Kirim via API, lihat apakah dieksekusi di browser.
   - Pertahanan berlapis: escape output (wajib) + CSP (jaring pengaman) + sanitize input kalau perlu rich text (pakai library yang dipelihara, jangan regex sendiri).
8. **A08 — Insecure Deserialization / A09 — using Components with Known Vulnerabilities:**
   - Cek dependency: `npm audit` / `pip-audit` / `composer audit` / `govulncheck`. Versi dengan CVE publik = deadline untuk upgrade.
   - Jangan pakai library yang sudah tidak dipelihara.
9. **A10 — CSRF (Cross-Site Request Forgery):**
   - Untuk cookie-based auth: wajib CSRF token (double-submit / synchronizer pattern) di semua mutating request (POST/PUT/DELETE), atau gunakan `SameSite=Strict/Lax` cookie + header check.
   - Test: buat request POST tanpa token dari "origin lain" (ubah `Origin`/`Referer` header) — harus ditolak.
   - Framework modern sering sudah punya proteksi built-in — pastikan aktif, bukan dinonaktifkan.
10. **Verifikasi perbaikan:** setelah developer fix, ulangi payload yang dulu menembus — harus tertolak sekarang. Test positif juga: user sah tetap bisa jalan. Ulangi test hingga dua-duanya benar.

## Checklist Penyelesaian

- [ ] Semua query DB pakai parameterized/prepared statement, tidak ada concatenation
- [ ] Password di-hash bcrypt/argon2 dengan cost layak; tidak ada plaintext/MD5 di DB
- [ ] Login ada rate limiting; logout invalidate session; token tidak di URL
- [ ] HTTPS wajib untuk data sensitif; header keamanan terpasang (CSP, HSTS, nosniff)
- [ ] Access control di backend per resource (IDOR dites: resource user A vs user B → 403)
- [ ] Tidak ada debug mode/default credentials/stack trace di produksi; CORS ketat
- [ ] Rendering user input di-escape (tidak ada innerHTML/v-html tanpa sanitasi)
- [ ] CSRF protection aktif untuk cookie-auth (token + SameSite)
- [ ] `npm audit`/dependency audit bersih (atau risiko terdokumentasi)
- [ ] Payload serangan yang dulu menembus sudah ditolak (terverifikasi ulang)

## Contoh

Laporan ringkas dari review aplikasi toko online:

**Kerentanan ditemukan:**

1. **SQL Injection (kritis)** — `GET /api/v1/products?category=` disambung string:
   ```bash
   curl -s "http://app/api/v1/products?category=' OR '1'='1"
   # mengembalikan SEMUA produk + waktu respons aneh → query dieksekusi
   ```
   → Fix: prepared statement.
2. **IDOR (tinggi)** — `GET /api/v1/orders/{id}` tidak cek kepemilikan:
   ```bash
   curl -s -H "Authorization: Bearer $(TOKEN_USER_A)" http://app/api/v1/orders/5
   # order user B kebaca oleh user A → harusnya 403
   ```
   → Fix: cek `order.user_id == req.user.id` di service.
3. **XSS (tinggi)** — review produk di-render dengan v-html tanpa sanitasi; payload `<img src=x onerror=alert(document.cookie)>` jalan saat halaman dibuka. → Fix: render sebagai text, tambah CSP.
4. **CSRF (sedang)** — tidak ada token; cookie tanpa SameSite. → Fix: aktifkan proteksi CSRF framework + `SameSite=Lax`.

**Verifikasi setelah fix:** payload di atas diulang → semua tertolak (400/403), user sah tetap 200.

Catatan sepuh: jaman saya, "jangan taruh SQL concatenation" itu pelajaran yang dibayar dengan database yang hilang. Sekarang pelajaran yang sama gratis di sini — jangan sampai kamu yang bayar.

## Anti-pattern

- ❌ Percaya input client (id, role, harga) tanpa cek ulang di server — itu undangan IDOR/dll.
- ❌ "Biarin aja, kan cuma internal" — internal breach adalah breach; insider adalah penyerang pertama.
- ❌ Validasi cuma di frontend — API publik bisa dipanggil tanpa browser.
- ❌ Membuat sanitizer crypto sendiri (regex HTML, hash sendiri) — pakai library yang diuji.
- ❌ Menonaktifkan proteksi framework yang sudah ada (CSRF off, SQL mode lemah) demi "kemudahan".
- ❌ Log password/token "buat debugging" — itu kebocoran yang menunggu waktu.
- ❌ Taruh token di localStorage tanpa alasan — XSS sekali = token dicuri.
- ❌ Lapor kerentanan tanpa bukti (payload + respons) — tidak ada yang bisa verifikasi.
- ❌ Berhenti di "sudah saya fix" tanpa tes ulang payload-nya — fix yang tidak diverifikasi = tidak fix.