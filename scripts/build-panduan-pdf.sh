#!/usr/bin/env bash
#
# Ekspor docs/PANDUAN-LENGKAP.md menjadi docs/PANDUAN-LENGKAP.pdf.
#
# Alasan memakai Chrome headless, bukan pustaka PDF Python: Chrome sudah
# terpasang (dipakai E2E) dan CSS cetak @page/-webkit-print-color-adjust
# didukung penuh, jadi tabel lebar dan blok kode tetap rapi tanpa memasang
# weasyprint/wkhtmltopdf.
#
# `marked` diambil lewat npx (tanpa menambah dependency proyek). Hasilnya:
#   docs/PANDUAN-LENGKAP.md  -> sumber kebenaran (dibaca di GitHub)
#   docs/PANDUAN-LENGKAP.pdf -> artefak untuk presentasi ke client
#
# Pemakaian: bash scripts/build-panduan-pdf.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$ROOT/docs/PANDUAN-LENGKAP.md"
OUTPUT="$ROOT/docs/PANDUAN-LENGKAP.pdf"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

if [ ! -f "$SOURCE" ]; then
  echo "Sumber tidak ditemukan: $SOURCE" >&2
  exit 1
fi

CHROME_BIN="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [ -z "$CHROME_BIN" ]; then
  echo "Chrome/Chromium tidak ditemukan di PATH." >&2
  exit 1
fi

echo "→ Merender markdown…"
npx --yes marked@15 --input "$SOURCE" --output "$WORK/body.html"

cat > "$WORK/panduan.html" <<'HTML'
<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Panduan Lengkap JASAKITE</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #1c1917;
    margin: 0;
  }
  h1 {
    font-size: 24pt;
    letter-spacing: -0.02em;
    color: #0c0a09;
    border-bottom: 3px solid #fb7a23;
    padding-bottom: 8px;
    margin: 0 0 18px;
  }
  h2 {
    font-size: 15pt;
    margin: 26px 0 10px;
    padding-top: 10px;
    border-top: 1px solid #e7e5e4;
    color: #0c0a09;
    break-after: avoid;
  }
  h3 { font-size: 12pt; margin: 18px 0 8px; color: #7c2d12; break-after: avoid; }
  p, li { orphans: 2; widows: 2; }
  ul, ol { padding-left: 20px; }
  li { margin: 3px 0; }
  strong { color: #0c0a09; }
  code {
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 9pt;
    background: #f5f5f4;
    padding: 1px 4px;
    border-radius: 4px;
  }
  pre {
    background: #1c1917;
    color: #fafaf9;
    padding: 12px 14px;
    border-radius: 10px;
    overflow-x: auto;
    break-inside: avoid;
  }
  pre code { background: none; color: inherit; padding: 0; font-size: 9pt; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
    font-size: 9.5pt;
    break-inside: avoid;
  }
  th, td { border: 1px solid #e7e5e4; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #fff7ed; color: #7c2d12; font-weight: 700; }
  tbody tr:nth-child(even) { background: #fafaf9; }
  blockquote {
    margin: 12px 0;
    padding: 8px 14px;
    border-left: 3px solid #fb7a23;
    background: #fff7ed;
    color: #44403c;
  }
  hr { border: 0; border-top: 1px solid #e7e5e4; margin: 22px 0; }
  a { color: #c2410c; text-decoration: none; }
  h2 + p, h3 + p { margin-top: 0; }
</style>
</head>
<body>
HTML
cat "$WORK/body.html" >> "$WORK/panduan.html"
echo "</body></html>" >> "$WORK/panduan.html"

echo "→ Mencetak PDF…"
"$CHROME_BIN" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --no-pdf-header-footer \
  --print-to-pdf="$OUTPUT" \
  "file://$WORK/panduan.html" >/dev/null 2>&1

if [ ! -s "$OUTPUT" ]; then
  echo "PDF tidak terbentuk." >&2
  exit 1
fi

if command -v pdfinfo >/dev/null 2>&1; then
  echo "→ Verifikasi:"
  pdfinfo "$OUTPUT" | grep -E "^(Pages|Page size|File size)"
fi

echo "Selesai: $OUTPUT"
