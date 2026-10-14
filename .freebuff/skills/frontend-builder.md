---
name: "frontend-builder"
description: "Builds frontend UI following design principles: responsive, accessible, modern component patterns. Invoke when building HTML/CSS/JS or component UI."
---

# Frontend Builder

Bangun UI yang benar-benar dipakai orang — bukan cuma keliatan bagus di screenshot. Responsive, accessible, dan pakai pola komponen yang bisa dirawat setahun lagi.

## Tujuan

Menghasilkan frontend (HTML/CSS/JS atau komponen) yang:
- Responsive di semua ukuran layar, mobile-first.
- Aksesibel sesuai WCAG 2.2 (minimal AA).
- Menggunakan semantic HTML dan pola komponen modern yang konsisten.
- Cepat dimuat dan tidak boros resource.
- Mudah dirawat: state jelas, styling terstruktur, nama jujur.

## Kapan Memakai

- User minta bikin halaman, komponen, atau UI baru (button, form, modal, tabel, dsb).
- Ada task "buat tampilan", "buat UI", "implementasikan design", "bikin komponen".
- Merombak/refactor UI lama yang berantakan.
- Membuat mockup HTML yang nanti disambung ke backend.

Jangan pakai skill ini untuk: desain konsep (itu domain web-design-guidelines), backend, atau pure data handling.

## Workflow

1. **Baca konteks dulu.** Cek file HTML/CSS/JS yang ada, framework yang dipakai, konvensi penamaan, dan design token (warna, spacing, font) yang sudah ada. Jangan menebak gaya.
2. **Tentukan struktur semantic sebelum styling.** Pilih elemen yang benar untuk job-nya:
   - `header`/`nav`/`main`/`footer` untuk skeleton halaman.
   - `button` untuk aksi, `a` untuk navigasi (jangan `div` yang dikasih onclick).
   - `form` + `label` + `input` berpasangan, `fieldset`/`legend` untuk grup.
   - `table` untuk data tabular, `ul`/`ol` untuk daftar.
   - Heading berurutan tanpa lompat (h1 → h2 → h3).
3. **Tulis HTML dulu, lalu CSS, lalu JS.** Urutan ini memaksa kamu memikirkan konten & struktur sebelum dekorasi.
4. **Responsive: mobile-first.** Tulis CSS untuk layar kecil dulu, lalu tambah `@media (min-width: ...)` untuk breakpoint lebih besar. Ukuran font pakai `rem`, spacing pakai skala tetap (4px/8px/16px) atau variabel CSS. Hindari `px` untuk font, hindari `width` keras — pakai `max-width` + `min()`, `clamp()`, `grid`/`flex` yang bisa mengecil.
5. **Aksesibilitas (WCAG 2.2 AA):**
   - Semua elemen interaktif bisa dicapai & dioperasikan via keyboard (tab order logis, `focus-visible` jelas, jangan `outline: none` tanpa pengganti).
   - Warna teks vs background minimal kontras 4.5:1 (teks besar 3:1). Cek dengan tool kontras atau hitung sendiri.
   - Jangan andalkan warna saja untuk menyampaikan status (error = merah + ikon + teks).
   - Gambar: `alt` deskriptif; gambar dekoratif pakai `alt=""` (jangan hapus atributnya).
   - Form: `label` eksplisit (pakai `for` + `id`), error message terhubung via `aria-describedby`, `aria-invalid="true"` saat error.
   - Modal/dialog: `role="dialog"` + `aria-modal`, focus masuk ke dalam, focus kembali saat tutup, `Escape` menutup, backdrop bisa diklik tutup.
   - Interactive element non-native (accordion, tabs, carousel) ikuti pola ARIA yang benar (mis. `aria-expanded`, tablist/tab/tabpanel).
6. **State & interaksi:** pisahkan presentational vs stateful. Kalau pakai framework, naikkan state ke komponen yang paling masuk akal — jangan taruh di komponen anak yang tak terpakai. Kalau vanilla JS, satu sumber kebenaran (mis. `data-*` atau object state), jangan tulis ulang DOM dari beberapa tempat.
7. **Modern component patterns:**
   - Komponen kecil & composable — satu komponen satu tanggung jawab.
   - Props/input konsisten; jangan buat API komponen yang beda-beda untuk hal yang mirip.
   - Styling: konsisten dengan sistem yang ada (CSS modules / Tailwind / styled-components — ikuti codebase, jangan perkenalkan yang baru).
   - `loading`/`empty`/`error` state dipikirkan sejak awal, bukan disisipkan belakangan.
8. **Validasi output:** cek di browser atau minimal dengan inspeksi: apakah responsive di 375px, 768px, 1280px? Apakah keyboard bisa menjangkau semuanya? Apakah ada warning aksesibilitas? Jalankan `npm run lint`/`build` kalau ada.

## Checklist Penyelesaian

- [ ] Struktur HTML semantic (header/main/footer/nav/form/label) benar
- [ ] Heading berurutan, tidak ada lompatan level
- [ ] Semua elemen interaktif bisa dipakai keyboard, `focus-visible` terlihat
- [ ] Kontras warna minimal AA (4.5:1), status tidak hanya lewat warna
- [ ] Semua gambar punya `alt` (deskriptif atau `alt=""` untuk dekoratif)
- [ ] Form: label terhubung, error accessible (aria-describedby + aria-invalid)
- [ ] Responsive mobile-first, tidak ada scroll horizontal di 375px
- [ ] Font pakai rem, layout pakai flex/grid, bukan width keras
- [ ] Loading/empty/error state ada untuk data async
- [ ] Tidak ada elemen interaktif palsu (`div` onclick tanpa role/keyboard handler)
- [ ] Build/lint lewat tanpa error baru

## Contoh

**Task:** buat card daftar produk dengan tombol "Tambah ke Keranjang".

```html
<article class="product-card">
  <img src="/img/tomat.jpg" alt="Tomat segar merah, satu keranjang kecil" />
  <h3 class="product-card__name">Tomat Segar</h3>
  <p class="product-card__price">Rp 15.000 / kg</p>
  <button class="btn" data-add-to-cart="tomat" aria-describedby="tomat-feedback">Tambah ke Keranjang</button>
  <p id="tomat-feedback" class="visually-hidden" role="status"></p>
</article>
```

```css
.product-card { display: flex; flex-direction: column; gap: 0.5rem; }
.btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
@media (min-width: 768px) {
  .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
}
```

Catatan sepuh: pake `role="status"` di feedback biar screen reader ngasih tahu tanpa mindah fokus. Kecil, tapi ini yang bikin produkmu dipakai orang buta tanpa bantuan orang lain.

## Anti-pattern

- ❌ Langsung styling sebelum mikirin struktur semantic — hasilnya div soup yang tidak accessible.
- ❌ `outline: none` tanpa pengganti focus style — keyboard user buta arah.
- ❌ Ikon/status merah-hijau doang tanpa teks — 1 dari 12 pria buta warna.
- ❌ Width keras (mis. `width: 500px`) di container — pecah di layar kecil.
- ❌ Font pakai px — user yang zoom browser ke 200% tidak bisa memperbesar teks.
- ❌ Modal tanpa manajemen focus — user keyboard terperangkap di belakang backdrop.
- ❌ Inline event handler (`onclick="..."`) campur di HTML — susah dirawat, susah di-test.
- ❌ Memperkenalkan framework/styling system baru hanya karena "lebih keren" — ikuti yang sudah ada.
