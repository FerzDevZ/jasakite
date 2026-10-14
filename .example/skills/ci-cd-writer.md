---
name: "ci-cd-writer"
description: "Writes reliable CI/CD pipelines: stages, caching, artifacts, secrets, matrix builds, verification. Invoke when creating or fixing GitHub Actions, GitLab CI, or similar pipelines."
---

# CI/CD Writer

CI yang andal itu kayak asisten yang tidak pernah tidur: kalau ditulis benar, dia kerja sendiri; kalau ditulis ceroboh, dia bangunin kamu jam 2 pagi karena pipeline merah padahal kode tidak berubah. Sepuh sudah muak dengan "works on my machine" — pipeline itu mesin kebenaran, bukan pajangan.

## Tujuan

Menulis pipeline CI/CD yang cepat, andal, dan jujur: verifikasi nyata (lint, test, build), caching yang benar, secrets aman, dan output yang membuat kegagalan mudah dilacak.

## Kapan Memakai

- Membuat pipeline baru (GitHub Actions, GitLab CI, CircleCI, dll).
- Memperbaiki pipeline yang lama/murah/random fail.
- Menambah job baru (lint, test, build, deploy) dengan benar.

## Prinsip Dasar

1. **Pipeline = kontrak.** Setiap merge harus lulus verifikasi yang sama. Kalau pipeline bisa "lolos tanpa test", itu bukan pipeline, itu hiasan.
2. **Cepat bukan utama — andal yang utama.** Lebih baik 5 menit yang stabil daripada 2 menit yang random fail karena cache kotor.
3. **Secrets jangan pernah di log** — kecuali sudah terlanjur, itu insiden, bukan catatan kaki.
4. **Satu stage, satu tanggung jawab.** Fail cepat: lint gagal lebih baik ditemukan sebelum test 10 menit jalan.

## Workflow

1. **Pahami trigger & environment** — kapan pipeline jalan (push, PR, tag, schedule)? Runner apa (ubuntu, container custom, self-hosted)? Akses apa yang ada?
2. **Desain stages minimal** — install → lint → test → build → (opsional) deploy. Urutan: yang paling mungkin gagal dan paling murah, paling awal.
3. **Tulis install dengan benar** — gunakan lockfile (`npm ci`, `pip install -r`, `cargo --locked`) bukan install longgar. Reproducible.
4. **Pasang caching yang aman** — cache dependency (bukan node_modules mentah tanpa hash), cache key berbasis lockfile hash; cache yang salah key = corrupted cache = random fail.
5. **Amankan secrets** — simpan di secret store platform; jangan di env inline di file workflow; jangan echo secrets ke log; minimal privilege (GITHUB_TOKEN permissions dibatasi).
6. **Matrix bila perlu** — versi node/python/OS yang relevan; jangan matrix semua kombinasi tanpa alasan (biaya & waktu).
7. **Upload artifacts & laporan** — test report, coverage, build output — supaya kegagalan bisa dilihat tanpa login ke runner.
8. **Jalankan dan verifikasi** — pipeline harus HIJAU dari commit pertama. Kalau merah: fix atau hapus step, jangan merge dengan pipeline merah.
9. **Uji kegagalan** — sengaja push kode yang gagal lint/test untuk memastikan pipeline benar-benar menangkapnya (jangan sampai selalu hijau karena step kosong).

## Checklist Penyelesaian

- [ ] Trigger sesuai kebutuhan (PR untuk verify, tag untuk release)
- [ ] Lockfile dipakai, install reproducible
- [ ] Stages urut: murah & sering gagal duluan
- [ ] Cache keyed dengan benar, tidak corrupt
- [ ] Secrets di store, tidak di log, permission minimal
- [ ] Matrix hanya kombinasi yang relevan
- [ ] Artifacts/laporan di-upload
- [ ] Pipeline hijau dari awal dan terbukti menangkap kegagalan

## Contoh

GitHub Actions minimal yang benar:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci                # lockfile, reproducible
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## Anti-pattern

- ❌ `npm install` tanpa lockfile — besok bisa beda hasil.
- ❌ Cache tanpa key hash — corrupt cache, random failure.
- ❌ Deploy tanpa test di pipeline — "biar cepat", nanti menyesal.
- ❌ Secrets hardcode di workflow file — satu push ke repo public, habis.
- ❌ Pipeline selalu hijau karena step test kosong/ternyata skip.