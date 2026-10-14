---
name: design-editorial-magazine
description: Design sophisticated editorial and typography-first magazine layouts. Expressive serif display headlines, asymmetrical multi-column grids, generous negative space, pull-quotes, and refined print luxury.
---

# 📰 Editorial & Magazine Typography Design System

Editorial web design brings the timeless craft, pacing, and hierarchy of fine print publishing into high-performance digital experiences.

---

## 🖋️ CORE DESIGN PRINCIPLES

### 1. Distinctive Typography Pairing
Never use standard sans-serif for editorial hero titles:
- **Display Serif**: `Instrument Serif`, `Newsreader`, `Playfair Display`, `Cormorant Garamond`, or `Ogg`.
- **Accompanying Body**: Ultra-clean sans (`Geist`, `Plus Jakarta Sans`, `Inter`) or legible text serif (`Merriweather`, `Charter`).
- **Typographic Scale**: Dramatic contrast ratio between display headers (4rem–7rem fluid) and captions (0.75rem).

### 2. Editorial Layout Archetypes
- **The Specimen Layout**: Oversized drop caps, left-margin index numbers (`01`, `02`), thin rule dividers (`border-t border-black/10`), and asymmetric two-column splits.
- **Pull Quotes**: Centered or margin-floating quotes with italicized serif, generous padding (`py-12`), and subtle attribution marks.
- **Reading Measure**: Constrain article prose strictly between 55–65 characters per line (`max-w-prose` / `max-w-2xl`).

### 3. Palette & Subdued Tones
- **Canvas / Paper**: Warm off-white (`#FBF9F5`, `oklch(0.97 0.008 85)`), warm stone, or deep dark charcoal (`oklch(0.18 0.005 260)`).
- **Ink**: Deep graphite (`oklch(0.20 0.005 260)`).
- **Accent**: Muted terracotta, olive drab, antique crimson, or warm ochre.

```tsx
export function EditorialHeader({ kicker, title, date, readTime }: { kicker: string, title: string, date: string, readTime: string }) {
  return (
    <header className="border-b border-black/10 pb-8 pt-12">
      <div className="flex items-center justify-between text-xs font-mono tracking-widest uppercase text-muted-foreground">
        <span>{kicker}</span>
        <span>{date} · {readTime}</span>
      </div>
      <h1 className="mt-6 font-serif text-5xl md:text-7xl font-normal leading-[1.08] tracking-tight text-foreground">
        {title}
      </h1>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 border-t border-black/5 text-sm text-muted-foreground">
        <div className="md:col-span-3 font-mono text-xs uppercase">Dispatch & Essay</div>
        <div className="md:col-span-9 leading-relaxed">
          An inquiry into digital craft, deliberate visual restraints, and the reclamation of architectural typography in the post-AI era.
        </div>
      </div>
    </header>
  )
}
```
