---
name: "tdd"
description: "Test-driven development workflow: red-green-refactor, writes tests before implementation. Invoke when user asks for TDD or when writing features with test requirements."
---

# TDD

Skill untuk kerja gaya test-driven development: tulis test dulu, lihat dia gagal (red), buat implementasi paling sederhana biar lulus (green), baru rapikan (refactor). Urutan ini bukan ritual — urutan ini yang bikin design-nya muncul dari kebutuhan pengguna, bukan dari nebak struktur. Kalau test ditulis setelah kode, yang terjadi biasanya cuma "test yang membenarkan kode", bukan test yang mendefinisikan perilaku.

## Tujuan

Membangun fitur dengan disiplin red-green-refactor: test yang ditulis lebih dulu mendefinisikan kontrak perilaku, implementasi dibuat seminimal mungkin, dan refactor aman karena jaring pengaman test sudah ada sejak langkah pertama.

## Kapan Memakai

- User minta kerja dengan TDD, atau minta fitur "dengan test".
- Fitur punya perilaku yang bisa diuji secara deterministik (fungsi murni, endpoint, komponen).
- Bug fix: tulis test yang mereproduksi bug (red), lalu perbaiki (green) — ini TDD yang paling bernilai.
- Menambahkan perilaku pada sistem yang sudah ada.

Jangan dipakai untuk: prototyping/eksplorasi di mana perilaku belum jelas (test-nya akan dibuang percuma), atau untuk kode glue sekali pakai.

## Workflow

1. **Pahami requirement, pilih satu perilaku kecil.**
   - Dari requirement, pecah jadi perilaku-perilaku kecil yang bisa diuji sendiri-sendiri (mis. "validasi email", lalu "hitung total", lalu "simpan order").
   - Mulai dari perilaku yang paling inti dan mudah diuji dulu.
   - Kalau ada yang ambigu, tanyakan — test yang ditulis dari asumsi yang salah akan membuang waktu.

2. **RED — tulis test untuk perilaku itu, jalankan, pastikan gagal.**
   - Tulis test yang memanggil fungsi/API yang belum ada. Gaya penamaan: `test_<perilaku>_<kondisi>_<hasil>` (mis. `test_discount_applied_when_cart_above_500k`).
   - Jalankan hanya test ini (`npx jest -t "nama"`, `go test -run Nama`, `pytest -k nama`).
   - Wajib lihat dia GAGAL, dan gagalnya karena perilaku belum ada — bukan karena test-nya typo atau error setup. Gagal karena alasan salah = test-nya belum jujur, perbaiki test-nya.
   - Catat pesan error-nya, itu panduan implementasi.

3. **GREEN — implementasi paling sederhana biar test lulus.**
   - Tulis kode seminimal mungkin yang membuat test hijau. Boleh hardcode dulu kalau itu memang test pertama yang paling sederhana — nanti test kedua yang memaksa generalisasi.
   - Jalankan test lagi. Hijau? Lanjut. Merah? Perbaiki implementasi, jangan "perbaiki" test.
   - Jangan tambah fitur yang tidak diminta test di langkah ini.

4. **REFACTOR — rapikan sambil test tetap hijau.**
   - Bersihkan duplikasi, perbaiki nama, ekstrak helper — selama test tetap hijau.
   - Jalankan seluruh test suite untuk memastikan tidak ada yang pecah.

5. **Ulangi untuk perilaku berikutnya.** Siklus RED→GREEN→REFACTOR per perilaku kecil, bukan per file besar. Satu fitur = beberapa siklus singkat.

6. **Verifikasi final.**
   - Jalankan seluruh suite + build/type-check + linter.
   - Laporkan: perilaku yang dijamin test (jangan klaim lebih), dan kalau ada bagian yang tidak di-test (mis. integrasi DB) — sebutkan jujur.

## Checklist Penyelesaian

- [ ] Test ditulis SEBELUM implementasi
- [ ] Test terlihat gagal (RED) karena alasan yang benar
- [ ] Implementasi minimal sampai test hijau (GREEN)
- [ ] Refactor dilakukan dengan test tetap hijau
- [ ] Satu siklus per perilaku kecil; tidak menggabung banyak perilaku dalam satu test
- [ ] Nama test menjelaskan perilaku, bukan implementasi
- [ ] Seluruh suite hijau di akhir
- [ ] Build/type-check hijau
- [ ] Tidak ada test yang di-disable atau di-skip untuk "membuat hijau"
- [ ] Batasan (yang tidak di-test) dilaporkan

## Prinsip

- **Test dulu = design dulu.** Menulis test memaksa kamu memutuskan API-nya: apa inputnya, apa outputnya, error-nya gimana. Keputusan itu seharusnya datang dari kebutuhan, bukan dari kenyamanan implementasi.
- **Merah itu informasi, bukan kegagalan.** Test merah pertama membuktikan test-nya benar-benar menguji perilaku baru — kalau langsung hijau tanpa menulis implementasi, berarti test-nya tidak menguji apa-apa.
- **Paling sederhana yang lulus.** Bukan paling sederhana yang kamu bayangkan bisa jalan — tapi yang bikin test ini lulus. Generalisasi datang dari test berikutnya yang memaksa.

## Contoh

**Requirement:** "Pesan dengan total di atas 500.000 dapat diskon 10%."

Siklus 1 (RED): tulis test `test_discount_applied_when_total_above_500k` yang memanggil `calculateDiscount(600000)` dan assert hasilnya `60000`. Jalankan → error `NameError: calculateDiscount tidak terdefinisi`. Itu merah yang benar.

GREEN: definisikan fungsi paling sederhana:

```python
def calculateDiscount(total: int) -> int:
    return 60000  # hardcode dulu, test pertama
```

Test hijau. Ini legal — test kedua yang memaksa generalisasi.

Siklus 2 (RED): `test_no_discount_when_total_below_500k` → `calculateDiscount(400000)` harus `0`. Merah (kembali `60000`).

GREEN:

```python
def calculateDiscount(total: int) -> int:
    return int(total * 0.1) if total > 500000 else 0
```

Test hijau. REFACTOR: cek nama dan konstanta — mis. `DISCOUNT_RATE = 0.1`, `DISCOUNT_THRESHOLD = 500000`; test tetap hijau.

Siklus berikutnya bila perlu: boundary `total == 500000` → pastikan keputusan "di atas" vs "sama dengan" dieksplisitkan (tanya user kalau spec tidak jelas).

## Anti-pattern

- ❌ Menulis implementasi dulu, baru test "biar cepat" — itu test yang membenarkan, bukan mendefinisikan.
- ❌ Melihat test merah lalu mengubah test-nya supaya hijau (mengubah ekspektasi, bukan kode).
- ❌ Menulis test raksasa yang menguji 5 perilaku sekaligus — gagalnya tidak menunjukkan apa yang rusak.
- ❌ Test yang bergantung pada implementasi (mock berlebihan, assert urutan internal) — nanti refactor jadi susah.
- ❌ Men-skip test yang sulit "nanti aja" — skip test = fitur tanpa jaring pengaman.
- ❌ Hardcode selamanya: hardcode cuma boleh bertahan satu siklus, test berikutnya harus memaksa generalisasi.
- ❌ Menggabung TDD dengan refactor besar area lain — satu perubahan konsep per siklus.