import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Guard kontras token warna. Nilai HSL di globals.css pernah gagal WCAG AA di
 * beberapa titik (teks putih di atas oranye 53% = 2.68:1, border input 1.37:1
 * yang praktis tak terlihat). Test ini menghitung rasio langsung dari file CSS
 * sehingga siapa pun yang mengubah token akan langsung tahu kalau kontrasnya
 * jatuh — bukan menemukannya lewat audit manual berbulan-bulan kemudian.
 */

const CSS = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")

type Tokens = Record<string, string>

function parseTokens(selector: string): Tokens {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n  \\}`).exec(CSS)
  if (!match) throw new Error(`Blok CSS "${selector}" tidak ditemukan`)

  const tokens: Tokens = {}
  for (const [, name, value] of match[1].matchAll(
    /--([a-z0-9-]+):\s*([^;]+);/g
  )) {
    tokens[name] = value.trim()
  }
  return tokens
}

function hslToRgb(value: string): [number, number, number] {
  const m = /^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/.exec(value)
  if (!m) throw new Error(`Nilai HSL tidak valid: "${value}"`)

  const h = Number(m[1])
  const s = Number(m[2]) / 100
  const l = Number(m[3]) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m0 = l - c / 2
  const sector = Math.floor(h / 60) % 6

  const rgb: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ]
  const [r, g, b] = rgb[sector]
  return [r + m0, g + m0, b + m0]
}

function relativeLuminance(value: string): number {
  const channel = (u: number) =>
    u <= 0.03928 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4)
  const [r, g, b] = hslToRgb(value).map(channel)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(tokens: Tokens, a: string, b: string): number {
  const la = relativeLuminance(tokens[a])
  const lb = relativeLuminance(tokens[b])
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// Pasangan yang memuat TEKS → WCAG 1.4.3 level AA: minimal 4.5:1.
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["muted-foreground", "background"],
  ["card-foreground", "card"],
  ["primary-strong", "background"],
  ["primary-strong", "card"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["destructive-strong", "background"],
  ["destructive-strong", "card"],
  ["success", "success-soft"],
  ["warning", "warning-soft"],
  ["info", "info-soft"],
  ["success-foreground", "success"],
  ["warning-foreground", "warning"],
  ["info-foreground", "info"],
  // Chip rating tile katalog (bg-brand-2 kuning + teks coklat gelap) — pasangan
  // baru revamp UI; chip ini menempel di atas foto apa pun, jadi kontras
  // internalnya harus AA mandiri (lihat components/services/dense-service-tile).
  ["rating-foreground", "brand-2"],
]

// Komponen UI & grafis non-teks → WCAG 1.4.11: minimal 3:1.
const UI_PAIRS: [string, string][] = [
  ["rating", "card"],
  ["input", "background"],
  ["input", "card"],
  ["ring", "background"],
  ["ring", "card"],
  // Ikon kategori lingkaran: primary-strong di atas primary/12 di atas background
  // — grafis yang membawa makna navigasi, jadi wajib 3:1 terhadap background.
  ["primary-strong", "background"],
]

const THEMES = [
  { name: "light", tokens: parseTokens(":root") },
  { name: "dark", tokens: parseTokens(".dark") },
]

describe("kontras token warna (WCAG 2.1 AA)", () => {
  for (const { name, tokens } of THEMES) {
    describe(`tema ${name}`, () => {
      for (const [fg, bg] of TEXT_PAIRS) {
        it(`teks ${fg} di atas ${bg} >= 4.5:1`, () => {
          expect(contrast(tokens, fg, bg)).toBeGreaterThanOrEqual(4.5)
        })
      }

      for (const [fg, bg] of UI_PAIRS) {
        it(`UI ${fg} di atas ${bg} >= 3:1`, () => {
          expect(contrast(tokens, fg, bg)).toBeGreaterThanOrEqual(3)
        })
      }

      it("mendefinisikan seluruh token semantik status", () => {
        for (const token of [
          "success",
          "success-foreground",
          "success-soft",
          "warning",
          "warning-foreground",
          "warning-soft",
          "info",
          "info-foreground",
          "info-soft",
          "rating",
          "primary-strong",
          "destructive-strong",
          "brand-2",
        ]) {
          expect(tokens[token], `token --${token} hilang`).toBeTruthy()
        }
      })
    })
  }

  it("light dan dark mendefinisikan kumpulan token yang sama", () => {
    const [light, dark] = THEMES.map((t) => Object.keys(t.tokens).sort())
    // --radius hanya ada di :root karena tidak berubah antar tema.
    expect(light.filter((k) => k !== "radius")).toEqual(dark)
  })
})
