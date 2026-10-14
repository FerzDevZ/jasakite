---
name: "codebase-design"
description: "Designs or improves codebase architecture: folder structure, module boundaries, dependency rules, consistent conventions. Invoke when planning new projects or restructuring."
---

# Codebase Design

Desain dulu, bangun belakangan. Skill ini untuk merancang struktur codebase — folder, batas modul, aturan dependency, konvensi — sebelum menulis baris pertama, atau saat merombak struktur yang sudah berantakan. Desain yang baik bukan yang terlihat bagus di diagram, tapi yang membuat kode baru selalu mendarat di tempat yang jelas.

## Tujuan

Menghasilkan desain arsitektur yang konkret dan bisa dieksekusi: struktur folder final, batas antar-modul, aturan dependency yang bisa dicek, plus konvensi penamaan, testing, dan error handling. Output berupa dokumen desain singkat + langkah implementasi yang jelas urutannya.

## Kapan Memakai

- Mau mulai proyek baru dan bingung mulai dari folder mana dulu.
- Restrukturisasi monolith jadi modular — struktur saja; ekstraksi unit penuh itu urusan module-extractor.
- Konvensi di repo tidak konsisten dan mau ditetapkan eksplisit di atas kertas.
- Sebelum menambah modul/fitur besar, mau memastikan tempatnya pas dengan struktur yang ada.

Jangan pakai kalau: proyek cuma 5 file (desain berlebihan, YAGNI), atau yang dibutuhkan cuma rename folder kecil.

## Workflow

1. **Kumpulkan konteks.** Baca manifest, tech stack, dan 3-5 file representatif. Cari tahu: framework (banyak yang mengikat struktur — Next.js `app/`, Rails convention over configuration), pola yang sudah ada kalau restrukturisasi, dan siapa yang akan maintain (tim kecil vs besar mengubah keputusan).
   - Output: catatan stack + constraint framework.
2. **Tentukan gaya arsitektur.** Pilih: feature-based (`features/auth/`, `features/billing/`), layer-based (`controllers/`, `services/`, `repositories/`), atau hybrid. Acuan kasar: layer-based untuk app kecil atau saat framework memaksa; feature-based untuk app menengah-besar yang tumbuh cepat dan timnya berkembang.
   - Output: keputusan gaya + alasan satu paragraf.
3. **Definisikan module boundaries.** Untuk tiap modul tulis: tanggung jawab dalam satu kalimat, apa yang di-expose (public API), apa yang private. Uji batas: kalau tanggung jawab tidak bisa dijelaskan tanpa menyebut file internal, boundary-nya belum jelas.
   - Output: tabel modul → tanggung jawab → public API.
4. **Tulis dependency rules.** Aturan arah dependency eksplisit, misal "presentation → application → domain → infrastructure" atau "features boleh import shared, dilarang import sesama features". Setiap aturan WAJIB punya cara cek (grep manual atau rule lint).
   - Output: daftar aturan + cara verifikasinya.
5. **Tetapkan konvensi (≤10 item).** Penamaan file/folder, gaya import, lokasi test (berdekatan vs `tests/` terpisah), pola error handling, tool formatting/linting. Konvensi yang tidak dianut bersama lebih buruk daripada tidak ada konvensi — jangan menulis 30 item.
   - Output: daftar konvensi singkat.
6. **Rancang struktur folder final.** Tulis tree lengkap dengan anotasi per folder. Tiap folder harus punya alasan eksis — folder kosong "buat jaga-jaga" adalah biaya, bukan aset.
   - Output: tree final beranotasi.
7. **Validasi desain dengan skenario.** Simulasikan 2-3 kejadian nyata terhadap struktur: tambah fitur baru, pindahkan fungsi, hapus modul. Catat titik yang macet, lalu perbaiki strukturnya. Desain yang tidak tahan skenario adalah desain teoretis.
   - Output: hasil simulasi + revisi struktur jika perlu.
8. **Tulis dokumen + langkah implementasi.** Satu file desain (mis. `docs/architecture.md`) berisi semua keputusan di atas, plus daftar langkah terurut kalau ini restrukturisasi codebase yang sudah ada (untuk migrasi besar, koordinasikan dengan migration-planner).

## Checklist Penyelesaian

- [ ] Stack & constraint framework tercatat
- [ ] Gaya arsitektur dipilih, disertai alasan
- [ ] Tiap modul punya tanggung jawab satu kalimat + public API
- [ ] Dependency rules tertulis eksplisit, lengkap dengan cara cek
- [ ] Konvensi ditetapkan, maksimal 10 item
- [ ] Struktur folder final dengan anotasi tiap folder
- [ ] Desain tahan simulasi 2-3 skenario nyata
- [ ] Dokumen desain + langkah implementasi tersedia

## Contoh

**Konteks:** app CRUD sederhana (Express) mau tumbuh: auth, billing, dashboard admin.

**Keputusan:** feature-based + layer tipis dalam tiap feature:
- `src/features/auth/{routes,service,model}.js`
- `src/features/billing/{routes,service,model}.js`
- `src/shared/{middleware,utils,db}.js`

**Dependency rules:** features boleh import `shared`; features DILARANG import sesama feature — kalau butuh, naikkan ke shared dulu. Cara cek: `grep -rnE "from '\.\./features" src/features` harus kosong.

**Konvensi:** export default per file, test berdekatan (`*.test.js`), error dibungkus `AppError` di service layer.

## Trade-off Gaya Arsitektur

- **Feature-based** — pro: kode fitur berkumpul, mudah dinavigasi, cocok untuk tim besar; kontra: butuh disiplin shared code, tanpa itu berakhir jadi duplikasi antar-feature.
- **Layer-based** — pro: sederhana, konsisten, cocok untuk app kecil atau saat framework memaksa; kontra: fitur tersebar di banyak folder, file besar mulai bermunculan saat app tumbuh.
- **Hybrid (layer di dalam feature)** — pro: dapat dua-duanya; kontra: butuh konvensi lebih eksplisit, dan god object bisa lahir di dalam tiap feature kalau tidak dijaga.

Pilih yang paling sedikit melawan arah kebiasaan tim dan framework. Struktur yang "benar" secara teori tapi ditolak tim akan mati dalam dua bulan — desain yang dijalani lebih baik daripada desain yang diagungkan. Gaya juga bisa bergeser: layer-based yang mulai sakit di satu area boleh beralih feature-based di area itu, selama alasannya ditulis.

## Anti-pattern

- ❌ Desain multilayer teoretis untuk app 3 file — folder kosong sedalam sumur, YAGNI.
- ❌ Batas modul yang hanya bisa dijelaskan dengan menyebut file internal.
- ❌ Aturan tanpa cara cek — aturan yang tidak bisa ditegakkan cuma saran.
- ❌ Langsung rewrite besar tanpa desain tertulis dulu (baca juga migration-planner).
- ❌ Mengikuti tren tanpa alasan ("harus monorepo", "harus clean architecture") — boring over clever itu prinsipnya.

Satu kalimat flavor: jangan sampai desainmu seperti struktur folder jaman saya — bagus dilihat, tapi nyari file aja muter-muter setengah jam.