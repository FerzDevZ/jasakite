# Font Subsetting Best Practices

- Subset WOFF2 fonts to Latin glyphs (~20KB instead of 200KB).
- Add `<link rel='preload' href='/fonts/inter.woff2' as='font' type='font/woff2' crossorigin>`.
