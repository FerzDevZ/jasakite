---
name: "code-generator"
description: "Generates production-quality code with types, error handling, and tests. Invoke when user asks to write new code, features, functions, or modules."
---

# Code Generator

Skill untuk menulis kode baru yang layak produksi: bertipe jelas, error handling yang jujur, dan test yang melindungi perilaku penting. Bukan sekadar "bikin kodenya jalan" — tapi bikin kode yang bisa ditinggal 6 bulan dan tetap masuk akal dibaca.

## Tujuan

Menghasilkan kode baru dengan kualitas produksi, bukan prototipe: tipe/type safety, validasi di trust boundary, error yang tidak ditelan diam-diam, test untuk perilaku penting, dan mengikuti konvensi codebase yang sudah ada.

## Kapan Memakai

- User minta menulis fungsi, modul, class, komponen, atau file baru.
- User minta "bikin fitur X" tanpa spesifikasi formal (beda dengan implement-feature yang dari spec/TODO).
- User minta contoh implementasi atau snippet yang dipakai serius, bukan sekadar ilustrasi.
- User minta kode untuk di-commit/di-deploy, bukan untuk demo.

Jangan dipakai untuk: menjawab pertanyaan konseptual, debug kode lama (pakai skill debugging), atau menulis kode sekali pakai (script throwaway).

## Workflow

1. **Baca konteks dulu, jangan menebak.** Sebelum menulis satu baris pun:
   - Baca file yang relevan: package.json / go.mod / Cargo.toml / requirements.txt untuk tahu dependency yang tersedia.
   - Baca 2-3 file yang mirip dengan yang mau ditulis (konvensi penamaan, style, pola error handling).
   - Cari tahu apakah ada linter/format config (eslint, prettier, gofmt, black, rustfmt).
   - Verifikasi: apakah dependency yang mau dipakai benar-benar ada? Jangan asumsi.

2. **Tulis kode dengan komponen wajib berikut:**
   - **Types**: parameter dan return value bertipe jelas (TS types, Go structs, Python type hints, dll). Jangan `any`/`interface{}` tanpa alasan.
   - **Error handling**: validasi input di trust boundary (public function, API, CLI). Jangan `except: pass`, jangan `catch` lalu abaikan. Error message harus punya konteks: apa yang gagal, kenapa.
   - **Nama jujur**: fungsi diberi nama sesuai perilaku, bukan sesuai implementasi.
   - **Tidak ada code yang tidak terpakai**: tidak ada parameter mati, import tidak terpakai, atau branch yang tidak mungkin tercapai.

3. **Tulis test untuk perilaku penting** (bukan untuk coverage):
   - Happy path — input normal, output benar.
   - Edge case — empty input, nilai batas (boundary), format aneh.
   - Error path — input invalid menghasilkan error yang jelas, bukan crash diam-diam.
   - Kalau codebase sudah punya framework test (Jest, pytest, go test), ikuti polanya. Kalau tidak ada, minimal sertakan self-check assert sederhana.

4. **Verifikasi build berjalan:**
   - Jalankan perintah build/type-check codebase: `npm run build`, `tsc --noEmit`, `go build ./...`, `cargo check`, `python -m py_compile <file>`.
   - Jalankan test: `npm test`, `go test ./...`, `pytest`.
   - Jalankan linter kalau ada config-nya.
   - Kalau ada error, baca pesannya, perbaiki, ulangi sampai bersih. Jangan bilang "seharusnya jalan" — buktikan.

5. **Tampilkan hasil singkat**: file yang dibuat/diubah, cara menjalankan, dan trade-off yang relevan (mis. "pakai library X karena sudah ada di project, walau Y lebih cepat").

## Checklist Penyelesaian

- [ ] Konteks codebase dibaca sebelum menulis (dependency, konvensi, style)
- [ ] Tipe jelas untuk semua parameter dan return
- [ ] Input divalidasi di trust boundary
- [ ] Tidak ada error yang ditelan atau exception diam-diam
- [ ] Nama fungsi/variabel mencerminkan perilaku
- [ ] Test ada untuk happy path, edge case, dan error path
- [ ] Build / type-check berjalan tanpa error
- [ ] Test berjalan hijau
- [ ] Tidak ada kode mati (unused import, parameter, branch)
- [ ] Diff seminimal mungkin — tidak menyentuh file yang tidak relevan

## Prinsip

- **Boring over clever.** Kode yang membosankan tapi jelas lebih baik dari one-liner pinter yang butuh 10 menit buat dibongkar.
- **Ikuti konvensi lokal.** Kalau codebase pakai `snake_case`, jangan paksa `camelCase`. Kalau error handling di project pakai result pattern, ikuti — jangan bikin pola baru.
- **Error handling itu fitur.** User butuh tahu kenapa sesuatu gagal. Log error tanpa konteks = tidak ada error handling.

## Contoh

**User:** "Bikin fungsi read_config yang baca file JSON config, kalau file tidak ada kasih default."

```python
# config.py
import json
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {"host": "localhost", "port": 8080}

def read_config(path: str) -> dict[str, Any]:
    """Baca config JSON; fallback ke default kalau file tidak ada."""
    p = Path(path)
    if not p.exists():
        return dict(DEFAULT_CONFIG)  # salin biar tidak termutasi global
    try:
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"config file {path} bukan JSON valid: {e}") from e
    merged = dict(DEFAULT_CONFIG)
    merged.update(data or {})
    return merged
```

Test-nya:

```python
# test_config.py
import json
import tempfile

def test_read_config_returns_default_when_file_missing():
    assert read_config("/tmp/tidak-ada.json")["host"] == "localhost"

def test_read_config_merges_user_values():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump({"port": 9000}, f)
        result = read_config(f.name)
    assert result["port"] == 9000 and result["host"] == "localhost"

def test_read_config_raises_on_invalid_json():
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        f.write("{bukan json")
        name = f.name
    try:
        read_config(name)
    except ValueError:
        pass
    else:
        raise AssertionError("harusnya ValueError")
```

**User:** "Bikin REST endpoint POST /users."

Jawab dengan mengikuti pola codebase: kalau project pakai Express + zod, buat route + schema zod + handler + test supertest. Jangan paksa Fastify kalau project pakai Express.

## Anti-pattern

- ❌ Langsung menulis kode tanpa baca file sekitarnya — hasilnya pasti tidak nyambung sama konvensi.
- ❌ Menghasilkan kode tanpa test, lalu bilang "test-nya bisa ditambah belakangan".
- ❌ Memakai dependency yang tidak ada di package.json; selalu cek dulu.
- ❌ `try { ... } catch (e) {}` kosong — error yang ditelan = bug yang baru ketahuan di produksi.
- ❌ Menulis `any`/`Object`/`interface{}` seenaknya; tipe itu dokumentasi yang dieksekusi.
- ❌ Mengubah file lain di luar scope hanya karena "sekalian".
- ❌ Menjanjikan kode jalan tanpa menjalankan build/test (verifikasi, jangan percaya).