---
name: "refactor"
description: "Refactors code safely without changing behavior: identifies smells, plans steps, verifies tests pass at each step. Invoke when user asks to improve, clean up, or simplify existing code."
---

# Refactor

Skill untuk merapikan kode tanpa mengubah perilaku. Aturan emasnya satu: **behavior tetap, struktur berubah**. Kalau setelah refactor ada test yang tadinya hijau jadi merah karena *perilaku* berubah (bukan karena test-nya salah), itu bukan refactor — itu perubahan fitur yang menyamar. Sepuh yang sudah kebakar tahu: refactor tanpa test itu judi.

## Tujuan

Mengidentifikasi code smell, merencanakan langkah refactor kecil yang aman, dan memverifikasi di setiap langkah bahwa perilaku tidak berubah (test hijau). Diff final lebih bersih, tapi zero behavior change.

## Kapan Memakai

- User minta "rapikan kode ini", "simplify", "bersihkan", "improve".
- Ada duplikasi, fungsi kepanjangan, nama menyesatkan, atau struktur yang susah dipahami.
- Sebelum menambahkan fitur baru di area yang berantakan (refactor dulu biar fiturnya masuk dengan bersih) — tapi hanya area yang relevan.

Jangan dipakai untuk: menulis fitur baru, mengubah requirement/behavior, atau "refactor" yang cuma ganti-ganti formatting (itu urusan formatter).

## Workflow

1. **Ukur kondisi awal — test harus ada dan hijau.**
   - Jalankan seluruh test suite: `npm test`, `go test ./...`, `pytest`. Kalau ada test yang merah, berhenti: refactor di atas test merah tidak bisa diverifikasi. Laporkan ke user, selesaikan dulu.
   - Kalau area yang mau di-refactor tidak punya test sama sekali: tulis karakterization test dulu (test yang menangkap perilaku saat ini apa adanya), supaya ada jaring pengaman.

2. **Identifikasi smell secara spesifik.** Jangan refactor abstrak — sebutkan concrete:
   - Duplikasi (copy-paste lebih dari 2 tempat).
   - Fungsi terlalu panjang (biasanya tanda: butuh scroll untuk paham).
   - Nama menyesatkan (`getData` yang sebenarnya `fetchAndCache`).
   - Deep nesting / early return yang berantakan.
   - God object / fungsi yang melakukan banyak hal (violates single responsibility).
   - Dead code (variabel/parameter/branch tidak terpakai — pastikan benar-benar mati dengan grep dulu).

3. **Rencanakan langkah kecil.** Refactor yang aman = banyak langkah kecil, bukan satu langkah besar:
   - Pecah jadi 2-5 langkah. Setiap langkah satu perubahan konsep (mis. "extract fungsi validateEmail", lalu "extract fungsi buildResponse").
   - Tulis daftarnya di awal, kerjakan satu per satu. Kalau langkah ke-3 gagal diverifikasi, rollback langkah ke-3 saja, bukan semua.

4. **Kerjakan satu langkah, verifikasi, baru lanjut.**
   - Setiap selesai satu langkah: jalankan test lagi. Hijau? Lanjut. Merah? Perbaiki langkah ini (kemungkinan salah ekstrak) — jangan lanjut ke langkah berikutnya.
   - Gunakan tool refactor bantuan editor kalau ada (rename symbol, extract method) — lebih aman daripada manual find-replace.
   - Jangan mengubah format/style di file yang sama dengan refactor logika; campur keduanya bikin diff sulit direview.

5. **Jalankan verifikasi final.**
   - Seluruh test suite hijau.
   - Build/type-check hijau: `npm run build`, `tsc --noEmit`, `go build ./...`.
   - Linter kalau ada.
   - Diff yang dihasilkan tidak menyentuh file di luar rencana.

6. **Laporkan perubahan perilaku jika ada.** Kalau refactor ketemu bug asli (mis. branch mati ternyata menyembunyikan bug), laporkan terpisah — jangan diperbaiki diam-diam dalam refactor. Itu dua pekerjaan berbeda.

## Checklist Penyelesaian

- [ ] Test suite hijau sebelum mulai
- [ ] Area tanpa test diberi characterization test dulu
- [ ] Smell diidentifikasi secara konkret (bukan "kodenya kurang rapi")
- [ ] Rencana langkah kecil ditulis dan diikuti
- [ ] Test hijau di SETIAP langkah, bukan cuma di akhir
- [ ] Tidak ada perubahan perilaku (test lama tetap lulus tanpa diubah isinya)
- [ ] Build/type-check hijau di akhir
- [ ] Diff terbatas pada area yang direncanakan
- [ ] Bug yang ditemukan dilaporkan terpisah, tidak disembunyikan dalam refactor
- [ ] Tidak ada perubahan format/style campur dalam diff logika

## Prinsip

- **Behavior is the contract.** Refactor berhasil = test lama tetap hijau tanpa diedit. Kalau harus mengubah test, berarti yang terjadi bukan refactor murni.
- **Langkah kecil, verifikasi sering.** Satu langkah besar yang gagal = satu hari debugging. Sepuluh langkah kecil yang diverifikasi = sore yang tenang.
- **Jangan refactor sambil nambah fitur.** Dua perubahan dalam satu diff = review yang berat dan blame history yang bohong.

## Contoh

**User:** "Fungsi `processOrder` ini kepanjangan, rapiin."

Kondisi awal: `processOrder` 80 baris, mencampur validasi, hitung diskon, kirim email, simpan DB. Ada test untuk semua perilaku ini.

Rencana langkah (dipaparkan dulu ke user):

1. Extract `validateOrder(order)` — pindahkan blok validasi, kembalikan error list. Test hijau.
2. Extract `calculateDiscount(order, user)` — pindahkan logika diskon. Test hijau.
3. Extract `notifyCustomer(order)` — pindahkan blok email. Test hijau.
4. `processOrder` sekarang 10 baris yang merangkai 3 fungsi. Test hijau.

Hasil: diff hanya di file yang sama, tidak ada test yang berubah isinya, semua hijau setelah tiap langkah. Kalau di langkah 2 ada branch diskon yang tidak pernah terpanggil (dead code), hapus hanya kalau yakin dari grep tidak ada pemanggil lain, dan tulis itu di laporan.

## Anti-pattern

- ❌ Refactor tanpa test pendahulu — "ini cuma mindah-mindah, pasti aman" adalah kalimat yang paling sering disusul rollback jam 3 pagi.
- ❌ Sekali jalan refactor besar ("rewrite ulang file ini") — diff raksasa, review mustahil, bug tersembunyi.
- ❌ Mengubah perilaku sambil refactor dan tidak bilang (mis. "sekalian kubenerin bug ini").
- ❌ Mengubah format + logika dalam satu commit.
- ❌ Refactor area yang tidak diminta, "biar konsisten".
- ❌ Menghapus kode yang kelihatan mati tanpa grep dulu — kode yang kelihatan mati kadang dipanggil lewat reflection/string.
- ❌ Mengedit test supaya cocok dengan kode baru — test itu saksi perilaku, jangan disuap.