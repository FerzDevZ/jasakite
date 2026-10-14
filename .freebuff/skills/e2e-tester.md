---
name: "e2e-tester"
description: "Creates end-to-end tests simulating real user flows through the app. Invoke when testing complete user journeys."
---

# E2E Tester

## Tujuan

Membuat end-to-end test yang mensimulasikan journey user nyata dari awal sampai akhir — lewat UI, API publik, atau kombinasi — dengan environment yang mendekati produksi. E2E adalah lapisan paling mahal dan paling rapuh, jadi tulis yang sedikit tapi benar: journey kritis saja, independen satu sama lain, dan stabil di CI.

## Kapan Memakai

- Journey lintas fitur yang menyentuh banyak layer: login → belanja → bayar → konfirmasi.
- Alur yang melibatkan komunikasi antar sistem: web + email, web + payment gateway (sandbox), webhook.
- Regression check sebelum release: "jalan dulu dulu" untuk alur paling penting.
- Jangan dipakai untuk: validasi satu fungsi (itu unit), atau kontrak satu endpoint dengan db (itu integration).

## Prinsip Dasar

1. **E2E mengetes sistem, bukan mengetes UI-nya.** Assert hasil yang bisa dilihat user (halaman konfirmasi muncul, email masuk, saldo berkurang), bukan selector CSS yang rapuh.
2. **Sedikit tapi kritis.** 10 journey yang stabil lebih berharga daripada 80 journey yang flaky dan di-skip semua orang.
3. **Independen total.** Tiap test bisa jalan sendiri, urutan apa pun, berulang kali. Data dibuat per test, dibersihkan per test.
4. **Deterministik.** Clock, email, dan pembayaran dikontrol — kalau butuh menunggu, tunggu kondisi (assertion with retry), bukan `sleep(5)`.

## Workflow

1. **Tulis daftar journey user dari perspektif user**, bukan dari menu aplikasi. Contoh: "user baru mendaftar, verifikasi email, lalu login pertama". Tandai yang paling kritis (uang, keamanan, data hilang) — itu prioritas.
2. **Siapkan environment E2E:**
   - Database terpisah dari dev/prod, di-reset per run.
   - Data seed minimal: user test, data master yang dibutuhkan journey.
   - Stub boundary eksternal yang tidak bisa dikontrol: email (intercept SMTP/mailpit), SMS, payment sandbox dengan kartu uji yang sudah ditentukan.
3. **Tulis test per journey, step-by-step layaknya user:**
   - Buka halaman / lakukan action → tunggu kondisi nyata (elemen terlihat, URL berubah, request selesai) → assert hasil.
   - Pakai testing library/Playwright/Cypress sesuai stack — gunakan locator berbasis peran/teks yang user lihat (`getByRole`, `getByLabel`), hindari selector CSS deep (`#root div > form > button.btn-2`).
   - Jangan gabung beberapa journey dalam satu test panjang; satu test = satu journey. Setup yang sama bisa dipakai ulang via helper/page object.
4. **Assert hasil journey, bukan langkah perantara.** Kalau user sudah melihat "Pembayaran berhasil", assert itu — tidak perlu assert tiap request API di tengah jalan kecuali itu bagian yang mau dilindungi.
5. **Tangani flaky dengan benar:** tunggu kondisi dengan timeout & retry bawaan framework (`expect(...).toBeVisible()`), bukan `sleep` fixed. Kalau masih flaky, cari root cause: state bocor antar test? data tidak unik? race condition asli (itu bug, bukan masalah test)? Flaky yang dibiarkan = alarm palsu yang akhirnya diabaikan semua orang.
6. **Jalankan lokal dulu, lalu di CI.** CI harus punya cukup resource dan retry policy yang wajar (1 retry untuk infra flake, tapi tracking tiap retry yang terjadi).
7. **Jaga jumlahnya:** tiap journey baru harus menggantikan atau membuktikan tidak bisa ditangkap di layer bawah. Suite E2E yang bisa jalan < 10 menit itu ideal.

## Checklist Penyelesaian

- [ ] Journey ditulis dari perspektif user, bukan struktur menu
- [ ] Environment terpisah: db khusus, seed minimal, email/payment di-stub
- [ ] Satu test = satu journey; test independen (data dibuat per test)
- [ ] Locator berbasis peran/teks, bukan selector CSS deep
- [ ] Assert hasil user-visible, bukan detail perantara
- [ ] Tunggu kondisi dengan retry, tidak ada `sleep` fixed
- [ ] Jalan hijau lokal dan di CI; flaky sudah di-root-cause
- [ ] Jumlah journey proporsional: sedikit, kritis, stabil

## Contoh

Journey: "User login, tambah item ke keranjang, checkout, selesai" (Playwright).

```js
test("checkout dari keranjang sampai konfirmasi", async ({ page }) => {
  // arrange: user test + item unik dibuat di setup
  await page.goto("/login");
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Password").fill("test-pass-123");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Beli" }).first().click();
  await page.getByRole("button", { name: "Checkout" }).click();
  await page.getByRole("button", { name: "Bayar Sekarang" }).click();

  // assert hasil journey user-visible
  await expect(page.getByText("Pembayaran berhasil")).toBeVisible();
  await expect(page.getByText(`Order #${ORDER_ID}`)).toBeVisible();

  // efek samping lintas sistem: email konfirmasi masuk (via mailpit API)
  const email = await mailpit.latestTo("buyer@example.com");
  expect(email.subject).toContain(`Order #${ORDER_ID}`);
});
```

Alur setup (`beforeEach`): reset db, seed user dengan password uji, buat order id unik (`ORDER_ID = Date.now()`), kosongkan mailbox mailpit. Tidak ada `sleep` — semua tunggu berbasis kondisi.

## Anti-pattern

- ❌ E2E untuk semua fitur sampai suite 1 jam — akhirnya semua orang skip.
- ❌ Selector `#main .btn` deep-CSS — UI berubah dikit, 30 test merah.
- ❌ `waitForTimeout(5000)` sebagai obat flaky — memperlambat, tidak menyembuhkan.
- ❌ Test yang bergantung pada test lain (test A buat data, test B pakai) — urutan jalan = lotere.
- ❌ Assert seluruh snapshot halaman — segaris kosmetik, semuanya merah.
- ❌ Menguji ulang logika unit di E2E (mengisi form dengan 100 kombinasi) — layer salah, biaya mahal.
- ❌ Check-in test yang belakangan baru sadar tidak pernah jalan di CI (lupa env var, path beda).