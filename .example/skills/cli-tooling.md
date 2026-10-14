---
name: "cli-tooling"
description: "Builds and maintains CLI tools: argument parsing, exit codes, stdout/stderr discipline, help text, testing. Invoke when creating or debugging command-line tools and scripts."
---

# CLI Tooling

Bikin CLI itu seperti menyapa orang di terminal: kalau sapaanmu jelek, tidak ada yang mau pakai dua kali. Sepuh sudah cukup umur untuk melihat CLI bagus (yang exit code-nya jujur) dan CLI buruk (yang diam-diam gagal tapi lapor sukses). Bedanya cuma disiplin kecil.

## Tujuan

Membangun dan memelihara CLI tools yang dapat dipercaya: parsing argumen benar, exit code jujur, output terstruktur (stdout vs stderr), help text yang membantu, dan testable.

## Kapan Memakai

- Membuat script/CLI baru (shell, Python, Node, Go, Rust).
- Memperbaiki CLI yang perilakunya tidak terduga.
- Menstandarkan pola CLI di dalam codebase/tim.

## Prinsip Dasar

1. **Exit code jujur.** 0 = sukses, non-zero = gagal, dan bedakan jenis kegagalan (1 = error umum, 2 = usage error, dsb). Script yang selalu exit 0 itu pembohong.
2. **stdout untuk hasil, stderr untuk pesan.** Data program → stdout (supaya bisa di-pipe), log/progress/error → stderr. Mencampurnya merusak pipeline.
3. **Help text yang jujur.** `--help` harus menjelaskan: kegunaan, argumen, contoh. Kalau help-nya teka-teki, CLI-nya tidak dipakai.
4. **Failure cepat & jelas.** Argumen salah → error sebelum kerja, bukan di tengah-tengah proses.

## Workflow

1. **Definisikan kontrak** — nama command, subcommand (jika perlu), flags, argumen posisional, input/output, exit codes. Tulis dulu di kepala/README, baru kode.
2. **Pilih cara parsing** — stdlib dulu (`argparse`, `commander`, `flag`). Custom parsing manual = sumber bug. Kalau butuh subcommand kompleks, baru library besar.
3. **Implementasi input** — validasi semua input di awal: argumen wajib, tipe, range. Error usage → exit code khusus + pesan + hint `--help`.
4. **Disiplin output** — hasil → stdout, log & error → stderr. Untuk mesin: flag `--json`/`--quiet` yang benar-benar bersih.
5. **Tulis help text** — usage, deskripsi tiap flag, minimal 1 contoh nyata. Periksa: orang asing bisa pakai tanpa baca kode?
6. **Tes CLI** — jalankan sebagai proses (bukan import): test exit codes, stdout/stderr terpisah, error path (file tidak ada, argumen salah, empty input).
7. **Verifikasi di pipeline** — pastikan bisa di-pipe (`cli | jq`, `cli > file`), exit code benar saat gagal di CI.

## Checklist Penyelesaian

- [ ] Exit codes: 0 sukses, non-zero gagal, usage error dibedakan
- [ ] stdout hanya hasil; stderr semua pesan/progress
- [ ] Semua argumen divalidasi sebelum kerja dimulai
- [ ] `--help` lengkap: usage + deskripsi + contoh
- [ ] Flag `--json`/`--quiet` output bersih (tanpa log campur)
- [ ] Test mencakup success, error path, dan empty input
- [ ] Bisa di-pipe dan dipakai di CI

## Contoh

```bash
# Baik
$ deploy-app --env prod
Deploying to prod...        # stderr (progress)
OK: deployed v1.2.3         # stderr
$ echo $?                   # 0

$ deploy-app --env nope
Error: unknown env "nope" (use: dev, staging, prod)   # stderr
$ echo $?                   # 2 (usage error)

# Buruk
$ deploy-app --env nope
Deploying... (gagal diam-diam)   # stdout, exit 0 — bohong
```

## Anti-pattern

- ❌ Error dicetak ke stdout — merusak `cli | jq`.
- ❌ Exit 0 walau gagal — CI tidak pernah tahu.
- ❌ Validasi menyebar di tengah proses, error muncul setelah kerja 5 menit.
- ❌ Parsing manual dengan regex — ada library, pakailah.
- ❌ Help text kosong atau template yang tidak menjelaskan apa pun.
