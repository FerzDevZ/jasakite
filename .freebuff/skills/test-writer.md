---
name: "test-writer"
description: "Writes focused unit tests: what to test, mocking boundaries, assertion quality, coverage of edge cases. Invoke when writing or improving tests."
---

# Test Writer

## Tujuan

Menulis unit test yang fokus dan bermakna: mengetes perilaku yang benar-benar penting, bukan menaikkan angka coverage demi laporan. Test yang bagus adalah test yang bisa memberi tahu kamu **apa yang rusak** saat dia gagal — bukan hanya "ada yang salah".

## Kapan Memakai

- Menulis test untuk fungsi, class, atau modul baru.
- Menambah test untuk bug yang baru diperbaiki (regression test) — ini wajib, bukan opsional.
- Test yang ada terasa rapuh: sering gagal padahal kode tidak berubah (flaky), atau harus diubah setiap kali implementasi berganti.
- Coverage tinggi tapi rasanya test tidak melindungi apa pun.

## Prinsip Dasar

1. **Test perilaku, bukan implementasi.** Assert hasil dan efek samping yang bisa diamati dari luar, bukan detail internal seperti "fungsi X dipanggil 3 kali" (kecuali pemanggilan itu sendiri adalah kontraknya).
2. **Satu test, satu cerita.** Nama test harus bisa dibaca sebagai kalimat: `returns_404_when_token_expired`. Kalau nama butuh "dan", pecah jadi dua test.
3. **Arrange-Act-Assert yang jelas.** Tiga fase terpisah, dipisah baris kosong. Jangan campur setup ke dalam act.
4. **Jangan test framework, test kode kamu.** `expect(await http.get(url)).toThrow()` mengetes axios, bukan kode kamu.

## Workflow

1. **Baca kode yang mau ditest dulu — jangan menebak.** Pahami input, output, error path, dan efek samping (database, network, file system, clock). Catat kontraknya: apa yang dijamin fungsi ini lakukan?
2. **Tulis daftar perilaku (behavior list) sebelum menulis test.** Tiap baris daftar ini nanti jadi satu test:
   - Happy path: input normal → output benar.
   - Boundary: nilai minimum/maksimum, string kosong, angka 0.
   - Error path: input invalid → error yang tepat, bukan error aneh.
   - Edge case penting: null, undefined, nilai negatif, duplikat, urutan ekstrem.
   - Efek samping: hanya terjadi sekali, hanya saat sukses, rollback saat gagal (kalau ada).
3. **Tentukan mock boundary (lihat skill mocking-helper).** Mock hanya di batas sistem: network, database, clock, random. Internal helper jangan di-mock — test harus menembus sampai ke sana.
4. **Tulis test dalam urutan: happy path dulu, lalu edge, lalu error.** Happy path dulu memaksa kamu memikirkan API yang wajar sebelum kasus aneh.
5. **Tulis assertion yang spesifik dan kuat:**
   - Assert nilai eksak, bukan `not.toBeNull()` doang. `toBeNull()` hampir tidak pernah cukup — assert isinya.
   - Untuk objek, assert field yang relevan saja — jangan snapshot seluruh objek kalau banyak field tidak penting (snapshot raksasa = test yang bisu).
   - Untuk error, assert pesan atau tipe errornya, bukan cuma "melempar sesuatu".
   - Hindari assertion yang menyalin logika implementasi (misal: test menghitung ulang rumus yang sama dengan cara yang sama — kalau rumus salah, test ikut salah).
6. **Jalankan test, pastikan hijau — lalu uji test kamu sendiri:** ubah sementara kode implementasi (misal hapus satu validasi), test harus merah. Kalau tetap hijau, test kamu tidak mengetes apa-apa. Ini langkah yang paling sering dilewatkan dan paling berharga.
7. **Perbaiki test yang butuh trik berlebihan** (mock yang rumit, setup panjang). Itu sinyal kode produksinya perlu di-refactor jadi lebih testable — tuliskan sebagai catatan, jangan diamkan.

## Checklist Penyelesaian

- [ ] Behavior list ditulis dari kontrak, bukan dari implementasi
- [ ] Satu test satu cerita; nama test deskriptif
- [ ] Arrange-Act-Assert terpisah jelas
- [ ] Mock hanya di boundary (network/db/clock), helper internal tidak di-mock
- [ ] Edge cases: boundary, empty, error path, null/undefined tercakup
- [ ] Assertion spesifik (nilai eksak, pesan error) — bukan `not.toBeNull()` doang
- [ ] Test dijalankan dan hijau
- [ ] Uji mutasi manual: hapus validasi → test harus merah
- [ ] Regression test ada untuk setiap bug yang diperbaiki

## Contoh

Fungsi produksi:

```js
export function priceWithVat(price, vatRate = 0.11) {
  if (price < 0) throw new Error("price cannot be negative");
  if (vatRate < 0 || vatRate > 1) throw new Error("vatRate must be between 0 and 1");
  return Math.round(price * (1 + vatRate) * 100) / 100;
}
```

Behavior list: happy path; vatRate default; batas vatRate 0 dan 1; price 0; price negatif error; vatRate di luar rentang error; pembulatan 2 desimal.

```js
describe("priceWithVat", () => {
  it("menghitung harga + vat dengan rate default", () => {
    expect(priceWithVat(100)).toBe(111);
  });

  it("menerima vatRate di batas bawah dan atas", () => {
    expect(priceWithVat(100, 0)).toBe(100);
    expect(priceWithVat(100, 1)).toBe(200);
  });

  it("membulatkan ke 2 desimal", () => {
    expect(priceWithVat(99.99, 0.11)).toBe(110.99);
  });

  it("melempar error saat price negatif", () => {
    expect(() => priceWithVat(-1)).toThrow("price cannot be negative");
  });

  it("melempar error saat vatRate di atas 1", () => {
    expect(() => priceWithVat(100, 1.5)).toThrow("vatRate must be between 0 and 1");
  });
});
```

Perhatikan: tidak ada test yang mengulang rumus `price * (1 + vatRate)` dengan cara yang sama — nilai eksak dipakai, jadi kalau logika berubah, test berbohong tidak akan terjadi.

## Anti-pattern

- ❌ Menulis test demi coverage: `if` branch tanpa assert berarti, atau `expect(true).toBe(true)`.
- ❌ Snapshot raksasa yang menangkap 50 field demi 1 field yang penting — tiap refactor kosmetik bikin test merah.
- ❌ Assert implementasi internal: "helper X dipanggil dengan argumen Y" padahal output akhir sudah membuktikan itu.
- ❌ Test yang menggantung di detail setup yang rapuh (timestamp konkret, urutan array object) padahal tidak relevan dengan cerita test.
- ❌ Meng-copy logika produksi ke dalam assertion — test dan kode bisa salah bersama-sama.
- ❌ Menghapus test yang "mengganggu" tanpa menggantinya dengan yang lebih baik.
- ❌ Test yang gagal di CI tapi hijau di lokal (env-dependent) tanpa root cause — itu bom waktu, bukan test.