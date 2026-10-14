---
name: design-skeuomorphism-neu-tactile
description: Master modern Neo-Skeuomorphism. Physical materials, brushed aluminum, knurled knobs, mechanical toggle switches, leather stitch borders, and realistic optical physics.
---

# 🎛️ Neo-Skeuomorphism & Tactile Physical UI

Neo-Skeuomorphism re-introduces physical intuition, craftsmanship, and tangible delight into software interfaces without the gaudy clutter of early 2010s design.

---

## 🛠️ MATERIAL PHYSICS & SPECIFICATIONS

### 1. Brushed Aluminum & Metallic Surfaces
Use fine conical or linear gradients to simulate an anisotropic brushed metal sheen:
```css
.metallic-dial {
  background: conic-gradient(
    from 180deg at 50% 50%,
    #4a4a4a 0deg,
    #8e8e8e 55deg,
    #4a4a4a 120deg,
    #8e8e8e 160deg,
    #4a4a4a 240deg,
    #8e8e8e 290deg,
    #4a4a4a 360deg
  );
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 
    0 10px 20px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(255, 255, 255, 0.6),
    inset 0 -1px 2px rgba(0, 0, 0, 0.8);
}
```

### 2. Tactile Mechanical Toggle Switches
Model physical spring switches with tactile audio feedback and real light reflection:
```tsx
export function PhysicalToggle({ isOn, onToggle }: { isOn: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-8 w-16 rounded-full border border-black/30 p-1 transition-colors duration-150 ${
        isOn ? 'bg-emerald-600 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]' : 'bg-neutral-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]'
      }`}
    >
      <div
        className={`h-6 w-6 rounded-full bg-gradient-to-b from-neutral-200 to-neutral-400 shadow-[0_2px_5px_rgba(0,0,0,0.7),inset_0_1px_1px_#fff] transition-transform duration-150 ${
          isOn ? 'translate-x-8' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
```

### 3. Audiophile & Pro-Audio Dials
- Rotary knobs with SVG tick marks.
- LED VU meters with segmented green-yellow-red bar graphs.
- Sub-pixel edge highlights using `border-t border-white/20`.
