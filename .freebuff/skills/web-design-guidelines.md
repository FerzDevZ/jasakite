---
name: "web-design-guidelines"
description: "Applies web design best practices: typography, spacing, color, layout, UX patterns. Invoke when reviewing or creating web page designs."
---

# Web Design Guidelines

Desain web yang enak dipandang dan enteng dipakai — bukan cuma soal "keren", tapi soal orang bisa nyelesaiin urusannya tanpa mikir. Typography, spacing, color, layout, dan UX yang punya alasan.

## Tujuan

Menerapkan prinsip desain web yang sudah teruji:
- Typography yang terbaca dan hierarki yang jelas.
- Spacing yang konsisten (bukan asal nempel atau asal jauh).
- Warna yang kontras, bermakna, dan tidak menyakiti mata.
- Layout yang mengikuti kebiasaan baca user, bukan keinginan desainer.
- UX pattern yang mengurangi gesekan, bukan menambah.

## Kapan Memakai

- User minta review desain: "desain ini gimana?", "apa yang kurang dari layout ini?", "kenapa halaman ini jelek/enak dilihat?".
- Membuat desain halaman baru (wireframe, mockup, atau langsung CSS).
- Menyusun design system / design token (warna, spacing, font scale) untuk project baru.
- Mengevaluasi halaman yang konversinya rendah (bounce rate tinggi, user bingung).

## Workflow

1. **Tentukan tujuan halaman dulu.** Satu halaman satu job utama (jual, daftar, baca, cari). Kalau tidak jelas tujuannya, desain tidak akan pernah "benar" — pertanyakan dulu.
2. **Typography:**
   - Maksimal 2-3 typeface per halaman (satu serif/sans untuk body, satu untuk heading, satu untuk mono/kode kalau perlu). Pilih dari keluarga yang sudah ada di sistem — jangan unduh 5 font.
   - Body text 16px (1rem) ke atas, line-height 1.5–1.7, panjang baris 45–75 karakter (pakai `max-width: 65ch`).
   - Hierarki: bedakan heading vs body lewat ukuran + weight + spacing. Jangan 3 level heading yang ukurannya nyaris sama.
   - Hindari ALL CAPS panjang, italic yang dipaksa, dan text shadow dekoratif.
3. **Spacing:**
   - Pakai skala konsisten: 4/8/12/16/24/32/48/64px (atau basis lain yang konsisten). Jarak antar elemen harus bisa dijelaskan dari skala ini.
   - Aturan praktis: spacing yang dekat = hubungan erat (label dengan input-nya, judul dengan isinya). Grouping visual harus mengikuti hubungan logis.
   - Ruang kosong (whitespace) itu fitur, bukan pemborosan — jangan takut.
4. **Color:**
   - Maksimal 1-2 warna aksen; sisanya netral (grayscale + putih). Warna aksen untuk aksi penting (primary button, link aktif, error), bukan untuk dekorasi.
   - Kotak kontras teks minimal 4.5:1 (AA). Jangan pernah desain dengan warna yang hanya kebaca di monitor desainer.
   - Jangan cuma andalkan warna untuk menyampaikan makna (error, sukses, warning) — tambahkan ikon/teks.
   - Perhatikan protanopia/deuteranopia: merah-hijau itu pasangan yang bermasalah untuk dibedakan.
   - Dark mode: jangan pakai hitam pekat (`#000`) untuk background — pakai gray gelap; hindari teks putih murni di atasnya (silau).
5. **Layout:**
   - Ikuti pola baca alami (F/Z pattern untuk konten, Gutenberg untuk halaman teks) — tempatkan elemen penting di area yang pertama dilihat.
   - Alignment: grid 12 kolom (atau aturan grid yang konsisten), jaga alignment vertikal antar seksi. Elemen yang "hampir sejajar" lebih jelek daripada sejajar penuh — jadi sejajarkan atau beri jarak tegas.
   - Proximity: elemen yang berhubungan dekat, yang tidak berhubungan diberi jarak.
   - Konsistensi: tombol yang sama bentuk & warnanya di seluruh halaman. Jangan ubah gaya per seksi.
6. **UX patterns:**
   - Tombol aksi utama menonjol (satu per halaman), aksi sekunder redup, aksi tersier jadi teks link.
   - Form: satu kolom untuk input pendek, label di atas input (paling cepat dibaca), error dekat dengan field yang salah.
   - Feedback: setiap aksi user ada respons (loading, sukses, error) — jangan biarkan layar diam.
   - Empty state, loading state, error state didesain — bukan cuma state "ideal".
   - Navigation: maksimal 5-7 item utama; breadcrumb untuk hierarki dalam; jangan menaruh link penting di footer doang.
7. **Review dengan mata user, bukan mata desainer:** cek sekuens tugas (mis. "daftar lalu bayar") — berapa klik, apakah label jelas, apakah user bisa salah langkah. Kalau ada kesempatan, tanya orang lain — mata segar menemukan yang mata sendiri tidak.

## Checklist Penyelesaian

- [ ] Satu tujuan utama per halaman, semua elemen mendukung itu
- [ ] Maksimal 2-3 typeface, body ≥16px, line-height 1.5+, baris ≤75 karakter
- [ ] Hierarki heading jelas dan konsisten
- [ ] Spacing mengikuti skala konsisten, grouping sesuai hubungan logis
- [ ] Kontras minimal AA (4.5:1), makna tidak hanya lewat warna
- [ ] Layout grid konsisten, alignment rapi, proximity benar
- [ ] Satu primary action yang menonjol per halaman
- [ ] Loading/empty/error state ada
- [ ] Navigasi ≤7 item utama, tidak ada link penting yang tersembunyi
- [ ] Tidak ada gaya yang berubah-ubah antar seksi

## Contoh

**Review singkat halaman checkout yang "kok sepi order-nya":**

Temuan & perbaikan:

| Masalah | Perbaikan |
|---|---|
| Tombol "Bayar" warna abu-abu pudar, link "Lanjut Belanja" warna hitam tebal | Tukar: primary action harus paling mencolok |
| Form isian 2 kolom rapat tanpa label atas | Satu kolom, label di atas, jarak antar field 16px |
| Teks harga Rp kecil 12px abu-abu muda di atas background putih | Naikkan ke 16px semibold, kontras ≥4.5:1 |
| Tidak ada feedback setelah klik Bayar | Tambah spinner di tombol + pesan sukses/gagal yang jelas |
| 6 jenis tombol berbeda di 1 halaman | Seragamkan jadi 3 level: primary, secondary, text |

Catatan sepuh: desain yang bagus itu seperti pelayan resto yang baik — kamu sadar dia ada cuma pas kamu butuh. Kalau user sadar sama desainnya, berarti desainnya menghalangi.

## Anti-pattern

- ❌ Font 5 macam + ukuran beda-beda tiap elemen — terlihat seperti halaman tahun 2003.
- ❌ Warna aksen dipakai di mana-mana — tidak ada yang menonjol karena semua menonjol.
- ❌ Spacing asal: gap 2px di sini, 30px di sana — terasa acak walau tiap elemennya bagus.
- ❌ Kontras rendah "biar aesthetic" — teks abu-abu muda di atas putih itu sakit mata, bukan estetik.
- ❌ Merah-hijau doang untuk status — jangan bikin buta warna tersingkir dari produkmu.
- ❌ Desain cuma untuk state ideal; loading/error/empty berantakan.
- ❌ Konsistensi dikorbankan demi "variasi biar tidak bosan" — bosan itu bagus di UI, berarti bisa diprediksi.
- ❌ Follow tren tanpa konteks (glassmorphism di form input, misalnya) — tren bukan alasan desain.