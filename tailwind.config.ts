import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Pakai `text-primary-strong` untuk teks/ikon oranye di atas
          // background atau card. `text-primary` gagal kontras AA di light mode.
          strong: "hsl(var(--primary-strong))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          // `text-destructive-strong` untuk teks merah di atas latar terang
          // atau tint bg-destructive/10 — `text-destructive` gagal AA di sana.
          strong: "hsl(var(--destructive-strong))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          soft: "hsl(var(--info-soft))",
        },
        rating: "hsl(var(--rating))",
        // Kutub kedua gradien brand — satu-satunya warna gradien yang sah.
        "brand-2": "hsl(var(--brand-2))",
      },
      borderRadius: {
        // Empat peran: kontrol/input (lg), kotak ikon (xl), kartu (2xl),
        // panel besar (3xl). sm/md hanya untuk komponen shadcn bawaan.
        sm: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 2px)",
        lg: "var(--radius)",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      fontSize: {
        // 2xs menggantikan text-[10px]/text-[11px] yang tersebar di badge & kbd.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        // Display fluid: skala mengikuti viewport tanpa media query, batas
        // bawah = ukuran mobile yang masih nyaman dibaca, batas atas = desktop.
        "3xl": ["clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem)", { lineHeight: "1.2" }],
        "4xl": ["clamp(1.875rem, 1.6rem + 1.4vw, 2.5rem)", { lineHeight: "1.15" }],
        "5xl": ["clamp(2.25rem, 1.8rem + 2.2vw, 3.25rem)", { lineHeight: "1.08" }],
        "6xl": ["clamp(2.75rem, 2rem + 3.4vw, 4.25rem)", { lineHeight: "1.05" }],
        "7xl": ["clamp(3.25rem, 2.2rem + 4.6vw, 5.25rem)", { lineHeight: "1" }],
      },
      transitionTimingFunction: {
        // Satu sumber easing untuk CSS, Tailwind, dan GSAP (lihat lib/motion.ts).
        smooth: "cubic-bezier(.16, 1, .3, 1)",
        crisp: "cubic-bezier(.4, 0, .2, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "450ms",
      },
      boxShadow: {
        card: "0 1px 2px rgba(12,10,9,.04), 0 4px 12px rgba(12,10,9,.07), 0 12px 32px rgba(12,10,9,.10)",
        "card-lg":
          "0 4px 12px rgba(12,10,9,.08), 0 16px 40px rgba(12,10,9,.12)",
        "card-dark": "0 1px 2px rgba(0,0,0,.4), 0 12px 32px rgba(0,0,0,.5)",
        // Glow diturunkan dari token --primary, bukan rgba oranye tetap —
        // kalau warna brand berubah, glow ikut tanpa edit manual.
        glow: "0 0 0 1px hsl(var(--primary) / .2), 0 8px 32px hsl(var(--primary) / .25)",
        "glow-lg":
          "0 0 0 1px hsl(var(--primary) / .25), 0 16px 48px hsl(var(--primary) / .35)",
      },
      backgroundImage: {
        "grid-dark":
          "linear-gradient(to right, rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.035) 1px, transparent 1px)",
        "grid-light":
          "linear-gradient(to right, rgba(12,10,9,.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(12,10,9,.04) 1px, transparent 1px)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".55" },
        },
      },
      animation: {
        // Easing sama dengan lib/motion.ts EASE.smooth — satu sistem gerak.
        "fade-up": "fade-up .45s cubic-bezier(.16,1,.3,1) both",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
