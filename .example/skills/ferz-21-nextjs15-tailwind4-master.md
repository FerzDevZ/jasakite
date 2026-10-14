---
name: ferz-21-nextjs15-tailwind4-master
description: "Mastery for Next.js 15 App Router, React 19 Server Components, Server Actions, Tailwind CSS v4, Lucide Icons, and Shadcn/UI integration."
version: 1.0.0
author: "FerzDevZ Enterprise"
---

# 🚀 Ferz 21: Next.js 15 & Tailwind v4 Autonomous Master

## Autonomous Operating Rules
1. **React 19 & App Router Standards**:
   - Default all components to Server Components unless client interactivity (`useState`, `useEffect`, event handlers) is strictly needed (`"use client"`).
   - Use Next.js 15 asynchronous request APIs (`await params`, `await searchParams`, `await cookies()`).
2. **Tailwind CSS v4 Directives**:
   - Use `@import "tailwindcss";` in `globals.css` (Tailwind v4 zero-config CSS-first engine).
   - Use modern arbitrary variants and dynamic CSS variables.
3. **Server Actions & Mutations**:
   - Use `"use server"` for backend mutations with proper error handling and `revalidatePath()`.
4. **Icons & UI Design**:
   - Use `lucide-react` for modern icon kits.
   - Maintain dark-mode first, glassmorphism, and responsive design systems.
