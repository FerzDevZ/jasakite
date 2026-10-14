---
name: tailwind-v4-shadcn-system
description: Master Tailwind CSS v4 CSS-first theming, Shadcn UI Radix headless primitives, OKLCH perceptual tokens, and responsive Bento grid layouts. Zero tailwind.config.js legacy clutter.
---

# 🚀 Tailwind CSS v4 & Shadcn Design System (2025/2026 Standard)

Master the modern CSS-first engine of **Tailwind CSS v4** combined with **Shadcn UI** accessible headless primitives.

---

## ⚡ CORE ARCHITECTURAL INVARIANTS

### 1. Pure CSS-First `@theme` (No JS Config)
Tailwind CSS v4 deprecates `tailwind.config.js` in favor of pure CSS directives.
In your `globals.css` or `app.css`:
```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-display: var(--font-clash), "Plus Jakarta Sans", sans-serif;
  --font-mono: var(--font-jetbrains-mono), monospace;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);

  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

### 2. Accessible Headless Primitives (Radix + CVA)
Always separate logic and accessibility from styling using Radix UI and Class Variance Authority (`cva`):
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### 3. Asymmetric Bento Grid Architecture
Avoid the AI-slop 3-equal-card row. Build structured, visual Bento grids with dynamic spans:
```tsx
export function BentoDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {/* Primary Hero Span */}
      <div className="md:col-span-2 lg:col-span-2 row-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">Main Telemetry</h3>
        <p className="text-muted-foreground text-sm mt-1">Real-time throughput metrics</p>
      </div>
      
      {/* Metric Stat 1 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Active Sessions</span>
        <div className="text-3xl font-mono font-bold mt-2">1,429</div>
      </div>

      {/* Metric Stat 2 */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">p95 Latency</span>
        <div className="text-3xl font-mono font-bold mt-2 text-emerald-500">18ms</div>
      </div>

      {/* Secondary Span */}
      <div className="md:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h4 className="font-semibold text-foreground">Security Audit Status</h4>
      </div>
    </div>
  )
}
```

### 4. Zero-Flash Dark Mode Script
Prevent hydration theme flicker by injecting an inline blocking script in the `<head>` of your root layout:
```html
<script dangerouslySetInnerHTML={{
  __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`
}} />
```
