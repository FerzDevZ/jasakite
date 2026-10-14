---
name: design-minimal-sleek-linear
description: Design ultra-refined, minimalist, keyboard-driven dark mode interfaces in the style of Linear, Raycast, Vercel, and Stripe. Subtle borders, command palettes, sub-50ms feedback, and precision typography.
---

# ⚡ Minimal Sleek & Linear Design System (The Craft of Modern SaaS)

Master the restrained, ultra-responsive dark-mode aesthetic popularized by developer-favorite tools like Linear, Raycast, and Vercel.

---

## 🖤 AESTHETIC FOUNDATIONS

### 1. The Dark-Mode Surface Hierarchy
Avoid muddy dark grays. Layer depth with precise lightness increments:
- `Base Surface`: `oklch(0.12 0.005 260)` (#0F0F12)
- `Card / Row Surface`: `oklch(0.16 0.008 260)` (#16161B)
- `Elevated / Popover`: `oklch(0.20 0.010 260)` (#1F1F27)
- `1px Subtle Border`: `border border-white/[0.08]` or `border-white/[0.12]` on hover.
- `Faint Inner Shadow`: `inset 0 1px 0 0 rgba(255, 255, 255, 0.05)`.

### 2. Keyboard-First & Speed Obsession
- Every primary view supports a Spotlight Command Palette (`Cmd+K`).
- Navigation rows highlight seamlessly with arrow keys (`Up/Down/Enter`).
- Latency is invisible: optimistic UI state updates via `useOptimistic` (< 16ms render loop).

### 3. Precision Status Tokens & Micro-Glow
- Never use full saturated background blobs. Use tiny 6px status indicators:
  - Active / Healthy: `bg-emerald-500 shadow-[0_0_8px_#10B981]`
  - Warning: `bg-amber-400 shadow-[0_0_8px_#F59E0B]`
  - Critical / Error: `bg-rose-500 shadow-[0_0_8px_#F43F5E]`
- Keycaps & Shortcuts: Monospace keyboard badges with crisp border:
  `kbd className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"`

```tsx
export function LinearTaskItem({ id, title, priority, status }: { id: string, title: string, priority: string, status: string }) {
  return (
    <div className="group flex items-center justify-between border-b border-white/[0.06] bg-[#16161B] px-4 py-3 transition-colors hover:bg-white/[0.03]">
      <div className="flex items-center space-x-3">
        <span className="font-mono text-xs text-muted-foreground">{id}</span>
        <span className="text-sm font-medium text-white/90 group-hover:text-white">{title}</span>
      </div>
      <div className="flex items-center space-x-2 text-xs">
        <span className="rounded bg-white/5 px-2 py-0.5 text-muted-foreground border border-white/10">{priority}</span>
        <div className="flex items-center space-x-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34D399]" />
          <span className="text-xs text-white/70">{status}</span>
        </div>
      </div>
    </div>
  )
}
```
