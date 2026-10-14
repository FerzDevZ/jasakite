---
name: design-neobrutalism
description: Design bold, high-contrast Neobrutalism web interfaces. Hard unblurred shadows, heavy black borders, vibrant pop palettes, asymmetric geometric grids, and unapologetic personality.
---

# 🗿 Neobrutalism Design System Specification

Neobrutalism rejects soft, generic corporate gradients in favor of high-contrast, tactile, raw digital aesthetic.

---

## 🎨 VISUAL RULES & DESIGN TOKENS

### 1. Border & Hard Shadow Physics
- **Border**: Hard, solid black stroke: `border-2 border-black` or `border-[3px] border-black`.
- **Shadow**: Solid, crisp offset shadow with **zero blur**:
  ```css
  box-shadow: 4px 4px 0px #000000;
  /* Active / Pressed state */
  &:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0px #000000;
  }
  ```
- **Radius**: Minimalist corners (`rounded-none` or subtle `rounded-md` / `rounded-lg`). Never use `rounded-3xl` bubble shapes.

### 2. High-Impact Color Palette
Pair stark black-and-white layouts with hyper-saturated accent pops:
- **Paper Background**: Cream/canvas `#FDFBF7` or pastel tinted base.
- **Ink**: Pure black `#000000`.
- **Accent Pops**:
  - Electric Yellow: `#FFE600`
  - Hyper Coral / Pink: `#FF5E8E`
  - Acid Lime / Green: `#23E879`
  - Cyan Blast: `#00D2FF`
  - Ultra Violet: `#7C3AED`

### 3. Typography & Badges
- **Headings**: Heavy, unapologetic sans-serif or industrial grotesque (`Clash Display`, `Syne`, `Public Sans`, `Space Grotesk`, weight: 800/900).
- **Stickers & Badges**: Rotating pill tags (`rotate-[-2deg]`, `rotate-[3deg]`), marquee ribbons, dotted/dashed dividers.

```tsx
export function NeobrutalistCard({ title, tag, desc }: { title: string, tag: string, desc: string }) {
  return (
    <div className="relative border-3 border-black bg-white p-6 shadow-[5px_5px_0px_0px_#000] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0px_0px_#000]">
      <div className="inline-block border-2 border-black bg-[#FFE600] px-3 py-1 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_#000]">
        {tag}
      </div>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-black">{title}</h3>
      <p className="mt-2 text-sm font-medium text-black/80">{desc}</p>
      <button className="mt-4 border-2 border-black bg-[#23E879] px-4 py-2 font-bold text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#000]">
        Explore Now →
      </button>
    </div>
  )
}
```
