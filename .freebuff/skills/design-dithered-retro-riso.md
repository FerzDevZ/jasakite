---
name: design-dithered-retro-riso
description: Design 1-bit dithered, risograph print texture, and halftone aesthetic web layouts. Retro computer graphic textures, grain overlays, and nostalgic tactile contrast.
---

# 🖨️ Dithered Retro & Risograph Aesthetic Design System

Embrace the imperfect, tactile beauty of vintage risograph printing, 1-bit Floyd-Steinberg dithering, and retro-computing raster art.

---

## 🎨 AESTHETIC SIGNATURES

### 1. 1-Bit & Halftone Dithering
- Replace smooth photo gradients with procedural 1-bit dither patterns or SVG halftone filters.
- Use CSS blend modes (`mix-blend-mode: multiply`, `screen`, `overlay`) on top of raw photographic assets.

### 2. Risograph Print Imperfection
- **Color Overprint**: Emulate misregistered spot color plates (e.g. Fluorescent Pink `#FF48B0` slightly offset 2px from Teal `#00828A`).
- **Paper Grain Noise**: Overlay subtle noise textures using SVG data URLs:
  ```css
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  ```

### 3. Retro Computer Monospace Hierarchy
- Pair pixel or monospace display fonts (`Silkscreen`, `VT323`, `Departure Mono`, `Space Mono`) with clean editorial captions.
- Solid 1px black or high-contrast borders with square corners (`rounded-none`).
