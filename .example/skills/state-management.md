---
name: "state-management"
description: "Chooses the right state management pattern: local, lifted, context, stores, server state. Invoke when designing data flow, refactoring state handling, or fixing state bugs."
---

# State Management

Masalah state itu seperti barang di rumah: kalau disimpan di tempat yang salah, semua orang bingung mencarinya. Sepuh sudah melihat aplikasi yang state-nya berserakan di 15 file karena takut "pakai Redux dulu biar aman" — padahal masalahnya cuma satu state yang perlu dinaikkan satu level. Pilih pola berdasarkan skala, bukan gengsi.

## Tujuan

Memilih dan menerapkan pola state management yang tepat untuk kebutuhan nyata: dari state lokal sampai external store — dengan alasan yang jelas, bukan karena tren. Memperbaiki state yang jadi sumber bug.

## Kapan Memakai

- Mendesain data flow aplikasi baru.
- Aplikasi mulai penuh bug state (state ganda, prop drilling, stale data).
- User bertanya "perlu redux/zustand/jotai tidak?"
- Refactor state berserakan jadi konsisten.

## Prinsip Dasar

1. **Mulai dari yang paling sederhana.** Local state dulu; naikkan level hanya saat benar-benar butuh. 90% state tidak perlu store.
2. **Satu sumber kebenaran.** State yang sama jangan hidup di dua tempat — itu resep desinkronisasi. Copy state = bug laten.
3. **Bedakan server state & client state.** Data dari API (yang bisa stale, loading, error) butuh perlakuan berbeda dari UI state (modal terbuka, form terisi).
4. **Data turun, event naik.** Parent memberi data via props, child melapor via callback. Prop drilling bukan dosa — prop drilling 5 level yang menyakitkan baru sinyal naikkan level.

## Workflow

1. **Petakan state yang ada** — daftar: state apa saja, siapa pemiliknya, siapa pembacanya. Tandai yang duplikat/desinkron.
2. **Klasifikasikan per state** — UI transient (modal, hover, form): lokal. Dipakai 2-3 komponen: lifted ke parent terdekat. Dipakai banyak tempat/level dalam: context atau store. Dari server: server state layer (react-query/swr) + cache strategy.
3. **Pilih pola minimal yang cukup** — urutan: local → lifted props → context → store eksternal. Naik satu level hanya kalau level sebelumnya terbukti sakit.
4. **Terapkan satu sumber kebenaran** — pindahkan state ke pemilik tunggal, child baca via props/context, update via callback/store action.
5. **Tangani server state dengan benar** — loading/error/empty states eksplisit; stale-while-revalidate bila perlu; jangan simpan data server di local state tanpa alasan.
6. **Verifikasi** — hapus state duplikat, pastikan update UI konsisten (render sekali, bukan dua kali), tes interaksi: ubah di satu tempat, semua pembaca ikut.
7. **Dokumentasikan keputusan** — catat pola yang dipilih + alasan (ADR singkat), supaya orang berikutnya tidak "upgrade" ke Redux tanpa alasan.

## Checklist Penyelesaian

- [ ] Setiap state punya satu pemilik tunggal
- [ ] Tidak ada state duplikat/desinkron
- [ ] UI transient tetap lokal (tidak dinaikkan tanpa perlu)
- [ ] Server state dipisah dari client state
- [ ] Loading/error/empty state ditangani
- [ ] Prop drilling yang menyakitkan sudah dinormalisasi (lifted/context)
- [ ] Alasan pemilihan pola tercatat

## Contoh

**Kasus:** app 3 halaman, user membuka modal di halaman A, ingin modal juga muncul di halaman B.

- 1 halaman saja → local state `useState` cukup.
- 2 halaman, navigasi → lifted ke layout/app + context.
- 20 komponen dalam, banyak interaksi → store eksternal.
- Belum butuh → jangan pasang store dulu. Ojo grusa-grusu.

## Anti-pattern

- ❌ Pasang Redux di hari pertama "biar aman" — complexity tanpa kebutuhan.
- ❌ State server disalin ke store lalu di-update manual → stale & bug.
- ❌ Satu state di 3 tempat dengan sinkronisasi manual via useEffect.
- ❌ Context untuk semua state — re-render seluruh tree untuk satu angka.
- ❌ Menambah library state management untuk masalah yang sebenarnya cuma butuh `useState` di tempat yang tepat.