---
name: design-storytelling-scrollytelling
description: Design immersive scrollytelling web experiences. GSAP ScrollTrigger pinning, progressive reveal animations, sticky narrative viewports, SVG line drawing, and dynamic chapter pacing.
---

# 📖 Scrollytelling & Narrative Web Design

Turn complex products, case studies, or company stories into compelling, scroll-driven visual narratives.

---

## 🎭 SCROLLYTELLING CORE ARCHITECTURAL INVARIANTS

### 1. Viewport Pinning with GSAP ScrollTrigger
Anchor the visual canvas while narrative text scrolls beside or over it:
```javascript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Pin the 3D canvas / interactive diagram while chapters scroll
ScrollTrigger.create({
  trigger: ".narrative-container",
  start: "top top",
  end: "bottom bottom",
  pin: ".sticky-visual-canvas",
  scrub: 0.5,
});

// Animate milestone markers as each chapter hits the center of the viewport
gsap.utils.toArray(".chapter-step").forEach((step, i) => {
  ScrollTrigger.create({
    trigger: step,
    start: "top center",
    end: "bottom center",
    onEnter: () => activateStepVisuals(i),
    onEnterBack: () => activateStepVisuals(i),
  });
});
```

### 2. Pacing & Scrub Physics
- **Scrub Smoothing**: Always set `scrub: 0.5` to `1` so the animation glides smoothly with inertia rather than jumping abruptly with mechanical mousewheel ticks.
- **Narrative Steps**: Keep reading text in high-contrast floating cards (`bg-background/90 backdrop-blur-md border border-border/40 p-6 rounded-xl max-w-md`).

### 3. Accessibility & Motion Fallback
Always provide a flat, non-pinned alternative when `prefers-reduced-motion: reduce` is enabled:
```css
@media (prefers-reduced-motion: reduce) {
  .sticky-visual-canvas {
    position: static !important;
    transform: none !important;
  }
}
```
