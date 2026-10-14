---
name: "mocking-helper"
description: "Creates effective mocks, fakes, and stubs without over-mocking: isolates units under test. Invoke when tests need mocking or mocking is brittle."
---

# Mocking Helper

## Tujuan

Membuat mock, fake, dan stub yang efektif untuk mengisolasi unit yang ditest — dan yang lebih penting, **tidak over-mocking**. Mock yang berlebihan adalah penyakit: test jadi mengetes kode kamu melawan dirimu sendiri, sementara integrasi asli tidak pernah diperiksa. Sepuh bilang: mock itu kayak gula — dikit bikin enak, kebanyakan bikin sakit.

## Kapan Memakai

- Unit test butuh mengisolasi boundary: network, database, file system, clock, random, third-party SDK.
- Test yang ada terasa rapuh: merubah implementasi bikin mock harus diubah juga.
- Menulis test untuk kode yang sulit dites karena dependensi global (misal `Date.now()`, `fetch`).
- Saat mock yang ada ternyata "over-specified" — assert pemanggilan yang tidak relevan.

## Istilah yang Tepat Dulu

| Nama | Apa itu | Kapan pakai |
|---|---|---|
| **Stub** | Mengembalikan jawaban tetap, tanpa verifikasi pemanggilan | Butuh dependensi mengembalikan nilai tertentu |
| **Fake** | Implementasi ringan yang nyata (in-memory db, spy mailer) | Butuh perilaku nyata tanpa infrastruktur |
| **Mock** | Mengatur ekspektasi + memverifikasi pemanggilan | Pemanggilan itu sendiri adalah kontrak (misal: kirim email harus dipanggil sekali) |
| **Spy** | Merekam pemanggilan, tidak mengatur ekspektasi | Ingin tahu apa yang terjadi, tidak mengharuskan |

## Workflow

1. **Tentukan boundary yang benar.** Yang boleh di-mock: hal di luar kendali unit test — network, db, file system, clock, random, env vars. Yang TIDAK boleh: fungsi internal modul yang sedang ditest, helper sendiri, library standar tanpa I/O. Kalau kamu harus mock helper internal, biasanya unitnya terlalu besar — refactor dulu.
2. **Pilih jenis yang paling sederhana yang cukup:** kalau cukup "mengembalikan nilai", pakai stub — jangan mock. Kalau butuh verifikasi "dipanggil sekali", baru mock. Kalau butuh perilaku nyata, pertimbangkan fake (in-memory repository misalnya) — fake sering lebih kuat dan lebih sedikit maintenance daripada mock yang meniru kontrak penuh.
3. **Buat dengan API konkret, bukan auto-mock ajaib.** Pasang stub di dependency injection / parameter fungsi — lebih baik daripada `vi.mock("modul")` monyet yang menggantikan semuanya. DI membuat kontrak eksplisit dan test tidak perlu tahu mekanisme magic.
4. **Atur return value yang realistis.** Kalau repository mengembalikan user, kasih objek user berbentuk nyata (pakai factory dari test-planner). Stub yang mengembalikan bentuk berbeda dari produksi akan menghasilkan test yang "hijau palsu".
5. **Verifikasi hanya yang menjadi kontrak:** pemanggilan yang kalau dihilangkan by code akan merusak perilaku (misal `save()` harus dipanggil, `sendEmail()` sekali, `rollback()` saat error). Jangan verifikasi argumen yang kebetulan lewat, atau urutan pemanggilan yang tidak penting.
6. **Jalankan test dan uji perlindungannya:** ubah kode produksi (hapus pemanggilan `save()`, ubah argumen yang seharusnya gagal) → test harus merah. Kalau tidak, verifikasi mock-nya kurang.
7. **Bersihkan state antar test:** reset mock, fake time, dan spy di `beforeEach`/`afterEach` — mock yang bocor antar test adalah sumber flaky test terbesar.

## Checklist Penyelesaian

- [ ] Boundary benar: hanya network/db/fs/clock/random yang di-mock
- [ ] Helper internal dan library non-I/O tidak di-mock
- [ ] Jenis dipilih paling sederhana: stub > fake > mock
- [ ] Return value realistis (bentuk data sesuai produksi)
- [ ] Verifikasi pemanggilan hanya untuk kontrak yang penting
- [ ] State mock dibersihkan antar test (reset di beforeEach/afterEach)
- [ ] Uji proteksi: hapus pemanggilan di kode produksi → test merah
- [ ] Kalau mock terasa rumit → refactor unit, bukan menambah mock lagi

## Contoh

Kode yang mau ditest (dependency injection):

```js
export class OrderService {
  constructor({ orderRepo, paymentGateway, notifier }) {
    this.orderRepo = orderRepo;
    this.paymentGateway = paymentGateway;
    this.notifier = notifier;
  }

  async placeOrder(cart, userId) {
    await this.paymentGateway.charge(cart.total, userId); // boundary: network
    const order = await this.orderRepo.create({ userId, ...cart }); // boundary: db
    await this.notifier.sendOrderConfirmation(order.id); // boundary: eksternal
    return order;
  }
}
```

Test:

```js
test("placeOrder melakukan charge, simpan order, dan kirim notifikasi", async () => {
  // Stub: hanya mengembalikan nilai — tidak perlu verifikasi
  const paymentGateway = { charge: vi.fn().mockResolvedValue({ ok: true }) };
  const orderRepo = { create: vi.fn().mockResolvedValue({ id: 42, userId: 7 }) };

  // Mock: pemanggilan notifier adalah kontrak yang harus diverifikasi
  const notifier = { sendOrderConfirmation: vi.fn() };

  const svc = new OrderService({ orderRepo, paymentGateway, notifier });

  const order = await svc.placeOrder({ total: 100 }, 7);

  expect(order.id).toBe(42);
  expect(paymentGateway.charge).toHaveBeenCalledWith(100, 7);
  expect(notifier.sendOrderConfirmation).toHaveBeenCalledTimes(1);
});
```

Keterangan: `charger` dan `orderRepo` cukup di-stub (return value saja), karena kontraknya adalah output. `notifier` di-mock karena "notifikasi terkirim" adalah efek samping yang wajib.

## Anti-pattern

- ❌ `vi.mock("semua-modul")` otomatis — tanpa sadar semua fungsi jadi no-op, test jadi "hijau kosong".
- ❌ Mock network tapi assertion detail protokol (header, urutan argumen) yang tidak relevan — test ganti-rupiah, refactor dikit langsung merah.
- ❌ Mock repository di integration test — yang ditest jadi diri sendiri, kontrak SQL/db asli tidak pernah dicek.
- ❌ Fake time dipasang tapi tidak di-reset — suite lain ikut kena jam yang salah.
- ❌ Verifikasi `toHaveBeenCalledTimes(1)` untuk pemanggilan yang bisa saja terjadi 2 kali tanpa masalah — over-specified.
- ❌ Mock yang return value-nya tidak realistis (misal `{}` kosong) — assertions jadi asal-asalan.
- ❌ Menambal mock untuk menutupi kode yang sulit ditest — sinyalnya refactor, bukan mock tambahan.