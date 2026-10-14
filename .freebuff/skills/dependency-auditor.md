---
name: "dependency-auditor"
description: "Audits dependencies: outdated, unused, vulnerable, duplicated, license checks, update plans. Invoke when reviewing package manifests or dependency security."
---

# Dependency Auditor

Setiap dependency adalah janji yang harus dibayar: update, CVE, lisensi, dan baris kode yang ikut masuk ke bundle. Skill ini untuk audit penuh: mana yang outdated, mana yang tidak terpakai, mana yang punya lubang keamanan, mana yang terduplikasi, dan bagaimana merencanakan update-nya dengan aman.

## Tujuan

Menghasilkan laporan dependency lengkap + rencana aksi: daftar outdated (dengan risiko update), unused, vulnerabilitas (dengan severity), duplikasi versi, dan masalah lisensi — lalu mengeksekusi update secara bertahap. Prioritas utamanya: tidak ada dependency yang membawa CVE terbuka di jalur kode yang dipakai.

## Kapan Memakai

- Review rutin manifest (`package.json`, `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`) — "cek dependencies dong".
- Setelah laporan security/audit keluar, atau menjelang release besar.
- Mau upgrade major framework/library dan butuh peta dependensinya dulu.
- User minta mengecilkan bundle atau memangkas dependency.

Jangan pakai kalau: cuma mau install satu library baru, atau mau migrasi framework (migration-planner).

## Workflow

1. **Snapshot manifest.** Baca manifest + lockfile. Catat versi aktual vs constraint yang ditulis. Jalankan baseline: build + test harus hijau sebelum audit dimulai — audit dimulai dari keadaan yang diketahui baik.
   - Output: daftar dependency (direct vs transitive) + baseline hijau.
2. **Audit otomatis.** Tool per ekosistem: `npm outdated` + `npm audit` (JS), `pip list --outdated` + `pip-audit` (Python), `cargo update --dry-run` + `cargo audit` (Rust), `go list -u -m all` + `govulncheck` (Go), `mvn versions:display-dependency-updates` (Java). Untuk unused: `knip` (JS), `vulture`/`pipreqs` (Python), `cargo machete` (Rust).
   - Output: tiga daftar terpisah — outdated, vulnerable (dengan severity), unused.
3. **Deteksi duplikasi.** Cek lockfile untuk versi ganda library yang sama (`npm ls <pkg>`, `pipdeptree -p <pkg>`, `go mod why`). Duplikasi = bundle bengkak + risiko perilaku berbeda antar-versi. Telusuri pemicunya: siapa yang memaksa versi lama.
   - Output: daftar duplikasi + pemicunya.
4. **Cek lisensi.** `license-checker` (JS), `pip-licenses` (Python), `cargo license` (Rust), `go-licenses` (Go). Tandai: copyleft kuat (GPL/AGPL) untuk code proprietary, lisensi tak dikenal, dan library yang BARU mengubah lisensi (red flag terbesar).
   - Output: tabel lisensi + peringatan untuk yang berisiko.
5. **Susun prioritas aksi.** Urutan kerja: (1) vulnerability severity tinggi yang terekspos — cek dulu apakah library itu benar-benar dipakai di jalur kode yang jalan; (2) patch/minor outdated (aman); (3) major outdated — tiap library butuh rencana sendiri (baca release notes/breaking changes); (4) unused — hapus, ini yang paling aman dari semuanya; (5) lisensi bermasalah.
   - Output: rencana berurut dengan alasan per item.
6. **Update bertahap.** Patch/minor: batch + update lockfile + test, harus hijau. Major: SATU per satu — baca `CHANGELOG`/release notes, cari breaking change, test per library. Transitive: rapikan lewat `npm dedupe` / `overrides` hanya jika dampaknya jelas.
   - Output: tiap langkah punya commit sendiri + suite hijau.
7. **Verifikasi & lapor.** Jalankan audit ulang (target: 0 high). Jalankan suite penuh + build. Tulis ringkasan: apa yang di-update, dihapus, ditunda — dan kenapa ditunda. Laporan ini bahan diskusi tim dan jejak untuk audit berikutnya.

## Checklist Penyelesaian

- [ ] Baseline hijau sebelum audit dimulai
- [ ] Audit keamanan & outdated dijalankan dengan tool resmi ekosistem
- [ ] Unused teridentifikasi; dihapus atau ditunda dengan alasan
- [ ] Duplikasi & lisensi dicek, yang bermasalah ditandai
- [ ] Update urut risiko: patch/minor → major (satu per satu)
- [ ] Tiap langkah punya commit terpisah & suite hijau
- [ ] Laporan akhir: update / hapus / tunda + alasan

## Contoh

**Audit:** `npm audit` → 2 high: `lodash@4.17.19` (prototype pollution), dipakai di `src/legacy.js` (jalur aktif). `npm outdated` → `webpack@4` (major). `knip` → `moment` tidak dipakai.

**Aksi:** (1) upgrade lodash ke 4.17.21 → test hijau; (2) hapus `moment` (−250KB bundle) → test hijau; (3) webpack ditunda: baca CHANGELOG, buat branch upgrade terpisah, kerjakan setelah feature freeze.

**Hasil:** 0 high vulnerability, bundle turun, 1 item major dijadwalkan.

## Quick Reference Tool per Ekosistem

| Ekosistem | Outdated | Security | Unused | Lisensi |
| --- | --- | --- | --- | --- |
| Node/JS | `npm outdated` | `npm audit` | `knip` | `license-checker` |
| Python | `pip list --outdated` | `pip-audit` | `vulture` / `pipreqs` | `pip-licenses` |
| Rust | `cargo update --dry-run` | `cargo audit` | `cargo machete` | `cargo license` |
| Go | `go list -u -m all` | `govulncheck` | `go mod tidy -diff` | `go-licenses` |
| Java | `mvn versions:display-dependency-updates` | OWASP Dependency-Check | `jdeps` + review | `license-maven-plugin` |

Gunakan tool resmi ekosistemnya, bukan pengganti generik — output dan semantiknya (mis. severity, false positive rate) disesuaikan dengan aturan ekosistem itu, dan itu yang bisa dipertanggungjawabkan ke tim.

**Baseline penting:** simpan hasil audit pertama sebagai file baseline (mis. `security-audit.md` di repo). Audit berikutnya tinggal diff — kamu langsung melihat CVE baru mana yang muncul sejak terakhir, tanpa membaca ulang seluruh laporan. Saat update lockfile besar, minimal jalankan test yang menyentuh library yang berubah — jangan hanya mengandalkan `npm test` penuh yang mungkin tidak menyentuh jalur itu.

## Prinsip

1. **Perbarui alasan, bukan hanya versi.** Catat kenapa sebuah library di-update atau ditunda — audit berikutnya tidak harus mengulang riset dari nol.
2. **Semakin sedikit, semakin aman.** Setiap dependency yang dihapus adalah satu permukaan serangan, satu sumber konflik, satu kewajiban update yang hilang.

Hapus dulu yang bisa dihapus, baru bahas yang harus di-update — urutan itu yang membuat audit terasa menang sejak awal.

## Anti-pattern

- ❌ Upgrade massal "semua sekaligus" (`ncu -u` lalu `npm install`) — major upgrade massal = patah dalam semalam.
- ❌ Hanya cek keamanan, lupa unused/duplikasi — dua-duanya pembengkak bundle dan biang konflik.
- ❌ Mengabaikan transitive vulnerability ("bukan punya kita") — exploit tidak peduli siapa pemilik kodenya.
- ❌ Menghapus dependency tanpa grep pemakaian — termasuk pemakaian di scripts dan config.
- ❌ Update library dicampur dalam commit fitur besar — update dan fitur harus bisa di-rollback terpisah.