import { Resolver } from "node:dns/promises"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Penjaga merek JASAKITE.
 *
 * Rebranding (nama merek lama → JASAKITE) menyentuh 55 berkas teks dan 14 berkas
 * yang di-rename. Yang paling berbahaya bukan sisa nama di dokumentasi, melainkan
 * pasangan identifier yang HARUS berubah bersamaan tetapi tersimpan di berkas
 * berbeda — persis jenis kesalahan yang tidak terlihat sampai aplikasinya
 * berperilaku salah di produksi:
 *
 *  1. `jasakite-theme` ditulis dua kali: skrip anti-FOUC blocking di
 *     `app/layout.tsx` dan `components/theme-provider.tsx`. Kalau hanya satu
 *     yang berubah, tema ter-reset tiap muat halaman.
 *  2. Email admin seed (`prisma/seed.js`) dan helper login E2E
 *     (`e2e/helpers/auth.ts`). Kalau berbeda, 8 spec E2E gagal login.
 *  3. `CACHE_NAME` service worker. Kalau nama berubah tanpa alasan, cache lama
 *     tidak lagi dibersihkan (activate hanya menghapus yang != CACHE_NAME).
 *
 * Selain itu, siapa pun yang menempelkan kembali nama lama akan langsung tahu,
 * bukan menemukannya dari keluhan pengguna.
 *
 * AUDIT REBRANDING PENUH — dua perluasan cakupan:
 *
 *  1. Dokumentasi (README, CHANGELOG, docs/** termasuk aset HTML pembuat PDF)
 *     ikut dipindai. Sebelumnya prosa dikecualikan; konsekuensinya DUA cover
 *     HTML dokumen menyimpan wordmark lama terbelah dan lolos — sapuan nama
 *     utuh tidak pernah menyentuh berkas yang dikecualikan.
 *  2. DNS: setiap hostname merek yang direferensikan source/dokumen harus
 *     bisa di-resolve A/AAAA. Audit ini OPT-IN (lihat `describe.skipIf` di
 *     bawah): domain `jasakite.id` memang belum terdaftar, jadi kalau tes ini
 *     ikut dalam suite reguler, `npm test` merah terus-menerus dan kegagalan
 *     nyata tenggelam — sirene yang selalu berbunyi berhenti menjadi sirene.
 *     Jalankan eksplisit lewat `npm run test:branding-dns` (atau `BRAND_DNS=1`),
 *     dan CI menjalankannya di step sendiri yang non-blocking.
 */

const ROOT = process.cwd()

/** Permukaan runtime, konfigurasi, aset publik, dan dokumentasi. */
const SCAN_DIRS = ["app", "components", "lib", "public", "prisma", "scripts", "tests", "e2e", "docs"]
const SCAN_FILES = [
  "middleware.ts",
  "package.json",
  ".env.example",
  "next.config.mjs",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "vitest.config.ts",
  "playwright.config.ts",
  "vercel.json",
  "tsconfig.json",
]

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "test-results",
  "playwright-report",
  "playwright",
])

/** Berkas non-teks: tidak mungkin memuat nama merek sebagai string yang bisa dibaca. */
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".ico", ".bmp",
  ".pdf", ".pptx", ".docx", ".xlsx", ".zip", ".gz", ".woff", ".woff2", ".ttf", ".otf",
  // Basis data SQLite lokal (prisma/dev.db) terbaca sebagai byte acak yang
  // kebetulan memuat alamat surel seed — bukan sumber yang bisa dipercaya.
  ".db", ".sqlite", ".sqlite3",
])

/**
 * Byte NUL di awal berkas. Ekstensi saja tidak cukup: `prisma/dev.db` pernah
 * lolos dan membuat tes ini gagal karena isinya, bukan karena merek.
 */
function looksBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0)
}

type ScannedFile = { path: string; text: string }

function collect(dir: string, out: ScannedFile[] = []): ScannedFile[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      collect(full, out)
      continue
    }
    const ext = extname(entry.name).toLowerCase()
    if (SKIP_EXT.has(ext)) continue
    const bytes = readFileSync(full)
    if (looksBinary(bytes)) continue
    out.push({ path: relative(ROOT, full), text: bytes.toString("utf8") })
  }
  return out
}

/**
 * Pola nama merek lama, dirangkai dari dua potongan.
 *
 * Kalau ditulis utuh, berkas penjaga ini akan mencocokkan DIRINYA SENDIRI dan
 * tes tidak pernah bisa hijau tanpa menghapus tesnya. Joint `\\s*` membuat satu
 * pola menangkap dua bentuk penulisan: menyatu (bentuk resmi) maupun
 * berspasi (cara orang menempelkan wordmark visual ke dalam prosa/dokumen).
 */
const OLD_BRAND = new RegExp(["servis", "lokal"].join("\\s*"), "i")

/** Dokumentasi tingkat root (README, CHANGELOG, dsb.) — md/html, ikut dipindai. */
const ROOT_DOC_FILES = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isFile() && /\.(md|html|htm)$/i.test(e.name))
  .map((e) => e.name)

const SCANNED: ScannedFile[] = [
  ...SCAN_DIRS.flatMap((d) => collect(join(ROOT, d))),
  ...SCAN_FILES.map((f) => ({ path: f, text: readFileSync(join(ROOT, f), "utf8") })),
  ...ROOT_DOC_FILES.map((f) => ({ path: f, text: readFileSync(join(ROOT, f), "utf8") })),
]

const read = (path: string) => readFileSync(join(ROOT, path), "utf8")

/** Baris yang memuat pola, agar pesan kegagalan menunjuk lokasi persisnya. */
function linesMatching(file: ScannedFile, pattern: RegExp): string[] {
  return file.text
    .split("\n")
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => pattern.test(line))
    .map(({ line, n }) => `${file.path}:${n}  ${line.trim().slice(0, 120)}`)
}

describe("merek JASAKITE", () => {
  it("memindai runtime, konfigurasi, DAN dokumentasi (bukan hanya beberapa berkas)", () => {
    // Pengaman agar tes ini tidak diam-diam berhenti memeriksa apa pun kalau
    // struktur folder berubah.
    expect(SCANNED.length).toBeGreaterThan(165)
    expect(SCANNED.map((f) => f.path)).toContain("app/layout.tsx")
    expect(SCANNED.map((f) => f.path)).toContain("prisma/seed.js")
    expect(SCANNED.map((f) => f.path)).toContain("e2e/helpers/auth.ts")
    // Dokumentasi wajib tercakup: dua kebocoran wordmark terbelah di cover
    // HTML dokumen hanya terlihat setelah cakupan ini ada.
    expect(SCANNED.map((f) => f.path)).toContain("README.md")
    expect(SCANNED.map((f) => f.path)).toContain("docs/FULL-DOKUMENTASI-JASAKITE.md")
    expect(SCANNED.map((f) => f.path)).toContain("docs/pdf-assets/dokumen-penjelasan.html")
  })

  it("tidak menyisakan nama merek lama di permukaan runtime DAN dokumentasi", () => {
    const hits = SCANNED.flatMap((f) => linesMatching(f, OLD_BRAND))
    expect(hits, `Nama merek lama masih muncul:\n${hits.join("\n")}`).toEqual([])
  })

  it("memakai satu domain dan satu email merek di seluruh source", () => {
    // Menangkap alamat surel merek lama atau domain lain yang tertinggal
    // sebagian (mis. `cdn.merek-lain.id`).
    const domains = SCANNED.flatMap((f) =>
      linesMatching(f, /@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.id\b/i)
    )
    const offenders = domains.filter((line) => !/@jasakite\.id\b/i.test(line))
    expect(offenders, `Domain email non-JASAKITE:\n${offenders.join("\n")}`).toEqual([])
  })

  it("mendeklarasikan nama paket sebagai jasakite", () => {
    const pkg = JSON.parse(read("package.json")) as { name: string }
    expect(pkg.name).toBe("jasakite")
  })

  it("memakai nama merek di manifest PWA", () => {
    const manifest = JSON.parse(read("public/manifest.json")) as {
      name: string
      short_name: string
    }
    expect(manifest.name).toContain("JASAKITE")
    expect(manifest.short_name).toBe("JASAKITE")
  })

  it("mengunci nama cache service worker agar cache lama tetap dibersihkan", () => {
    // `activate` menghapus SEMUA cache yang namanya !== CACHE_NAME. Nama harus
    // tetap berversi supaya bump versi = invalidasi cache yang disengaja.
    const sw = read("public/sw.js")
    const cacheName = /const CACHE_NAME = ['"]([^'"]+)['"]/.exec(sw)?.[1]
    expect(cacheName, "CACHE_NAME tidak ditemukan di public/sw.js").toBeDefined()
    expect(cacheName).toMatch(/^jasakite-v\d+$/)
  })

  it("memakai nama merek di metadata dan JSON-LD halaman root", () => {
    const layout = read("app/layout.tsx")
    expect(layout).toContain('applicationName: "JASAKITE"')
    expect(layout).toContain('"JASAKITE — Marketplace Jasa Lokal"')
    expect(layout).toMatch(/name:\s*"JASAKITE"/)
  })

  it("tidak menyisakan wordmark terbelah dari merek lama", () => {
    // Nama merek lama pernah dirender sebagai DUA span berdampingan untuk
    // pewarnaan dua warna. Karena tidak pernah ada sebagai string utuh di
    // source, pemindaian nama lengkap tidak pernah melihatnya — baru ketahuan
    // dari snapshot aksesibilitas halaman yang sudah jadi ("link S ...").
    // Pola di bawah menangkap pemenggalan element-level itu: konten tag yang
    // persis potongan pertama nama lama.
    //
    // Dua regex di berkas ini sengaja menulis potongan nama, bukan nama utuh —
    // berkas penjaga ikut dipindai, dan menulis nama utuh akan membuat tes
    // mencocokkan dirinya sendiri.
    const split = />\s*servis</i
    const hits = SCANNED.flatMap((f) => linesMatching(f, split))
    expect(hits, `Wordmark terbelah:\n${hits.join("\n")}`).toEqual([])
  })

  it("monogram merek konsisten di semua ikon gradasi", () => {
    // Setiap monogram di kotak gradasi merek harus J. Sebelumnya masih huruf
    // awal merek lama — satu huruf tidak pernah tersentuh sapuan nama penuh.
    // Baris yang isinya persis satu huruf itu (whitespace diizinkan) dicari di
    // seluruh permukaan terpindai.
    const mono = /^\s*s\s*$/i
    const offenders = SCANNED.flatMap((f) => linesMatching(f, mono))
    expect(offenders, `Monogram lama:\n${offenders.join("\n")}`).toEqual([])
  })
})

describe("identifier lintas berkas yang wajib sinkron", () => {
  it("kunci tema anti-FOUC sama di layout dan theme-provider", () => {
    // Skrip blocking di <head> membaca kunci ini SEBELUM React hidup; kalau
    // berbeda dari yang ditulis ThemeProvider, tema berkedip lalu ter-reset
    // setiap muat halaman.
    const inlineKey = /localStorage\.getItem\(\\?"([^"\\]+)\\?"\)/.exec(
      read("app/layout.tsx")
    )?.[1]
    const providerKey = /localStorage\.setItem\("([^"]+)"/.exec(
      read("components/theme-provider.tsx")
    )?.[1]

    expect(inlineKey, "kunci tema tidak ditemukan di app/layout.tsx").toBeDefined()
    expect(providerKey, "kunci tema tidak ditemukan di theme-provider.tsx").toBeDefined()
    expect(inlineKey).toBe(providerKey)
    expect(inlineKey).toBe("jasakite-theme")
  })

  it("email admin seed sama dengan akun yang dipakai E2E", () => {
    // Seed memakai `upsert`, jadi mengganti email admin TIDAK memindahkan akun
    // lama — ia membuat admin kedua. Kalau helper E2E menunjuk email berbeda
    // dari seed, 8 spec E2E gagal login tanpa pesan yang jelas.
    const seedAdmin = /\["([^"]+)",\s*"[^"]+",\s*"ADMIN"/.exec(read("prisma/seed.js"))?.[1]
    // `[^}]` sudah mencakup baris baru, jadi tidak perlu flag `s` — flag itu
    // juga menuntut target es2018 ke atas, sedangkan tsconfig proyek lebih rendah.
    const e2eAdmin = /admin:\s*\{[^}]*?email:\s*"([^"]+)"/.exec(
      read("e2e/helpers/auth.ts")
    )?.[1]

    expect(seedAdmin, "baris admin tidak ditemukan di prisma/seed.js").toBeDefined()
    expect(e2eAdmin, "akun admin tidak ditemukan di e2e/helpers/auth.ts").toBeDefined()
    expect(e2eAdmin).toBe(seedAdmin)
  })

  it("kunci localStorage lain memakai prefiks jasakite", () => {
    const prefixed = new RegExp(`["']((?:jasakite|${OLD_BRAND.source})-[a-z-]+)["']`, "g")
    const keys = SCANNED.flatMap((f) =>
      [...f.text.matchAll(prefixed)].map((m) => `${f.path}: ${m[1]}`)
    )
    expect(keys.length).toBeGreaterThan(0)
    const offenders = keys.filter((k) => !k.includes("jasakite-"))
    expect(offenders, `Prefiks kunci lama:\n${offenders.join("\n")}`).toEqual([])
  })
})

const APEX = "jasakite.id"

/**
 * Semua hostname merek yang direferensikan source/dokumen — URL maupun baris
 * email menangkap subdomain (cdn.…, www.…) — plus apex itu sendiri, supaya
 * domain resmi tetap diperiksa meski suatu saat tidak ada file yang
 * menuliskannya secara eksplisit.
 */
function brandHostnames(): string[] {
  const pattern = /\b([a-z0-9.-]*jasakite\.id)\b/gi
  const hosts = new Set<string>([APEX])
  for (const file of SCANNED) {
    for (const match of file.text.matchAll(pattern)) {
      hosts.add(match[0].toLowerCase().replace(/\.$/, ""))
    }
  }
  return [...hosts].sort()
}

// Ekstraksi hostname TIDAK menghitung DNS — tesnya murni lokal, jadi ia tetap
// berjalan di suite reguler dan tidak ikut ter-skip bersama audit resolusi.
describe("kandidat hostname merek", () => {
  it("ekstraksi hostname menghasilkan kandidat domain merek yang valid", () => {
    const hosts = brandHostnames()
    expect(hosts).toContain(APEX)

    // Extraction tidak boleh diam-diam kosong: setidaknya satu berkas harus
    // benar-benar mereferensikan apex.
    const referenced = SCANNED.some((f) => f.text.toLowerCase().includes(APEX))
    expect(referenced, `tidak ada satu pun berkas yang mereferensikan ${APEX}`).toBe(true)

    // Typo domain tidak boleh lolos hanya karena mengandung apex di ekornya —
    // prefiks yang menempel langsung tanpa titik pemisah tetap mengandung
    // string apex tetapi bukan hostname yang bisa di-resolve.
    const invalid = hosts.filter((h) => h !== APEX && !h.endsWith(`.${APEX}`))
    expect(invalid, `Hostname merek tidak berakhiran .${APEX}:\n${invalid.join("\n")}`).toEqual([])
  })
})

/**
 * Opt-in: `BRAND_DNS=1` (lokal: `npm run test:branding-dns`).
 *
 * Domain `jasakite.id` belum terdaftar, sehingga tes ini gagal di setiap mesin
 * — dan kegagalan permanen seperti itu justru melatih semua orang mengabaikan
 * merah. Auditnya tetap ada dan tetap dijalankan CI, hanya di step terpisah
 * yang non-blocking (lihat .github/workflows/ci.yml).
 */
describe.skipIf(process.env.BRAND_DNS !== "1")("audit DNS domain merek", () => {
  it("setiap domain merek bisa di-resolve (A atau AAAA)", async () => {
    // Resolver ber-batas: tanpa timeout, nameserver yang mati menggantung test
    // sampai batas vitest dengan pesan "test timed out" yang tidak menyebut
    // domain mana yang bermasalah.
    const resolver = new Resolver({ timeout: 4000, tries: 1 })
    const failures: string[] = []

    for (const host of brandHostnames()) {
      try {
        await resolver.resolve4(host)
        continue
      } catch {
        // IPv4 tidak ada — coba IPv6 sebelum menyimpulkan gagal.
      }
      try {
        await resolver.resolve6(host)
        continue
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code ?? "UNKNOWN"
        const network = ["EAI_AGAIN", "ETIMEOUT", "ESERVFAIL"].includes(code)
        failures.push(
          network
            ? `${host} → ${code} (resolver/jaringan bermasalah — bukan bukti domain mati)`
            : `${host} → ${code} (domain tidak terdaftar atau tanpa record A/AAAA)`
        )
      }
    }

    expect(
      failures,
      [
        "Domain merek gagal di-resolve:",
        ...failures,
        "",
        "Tindakan: daftarkan domain + arahkan record A/AAAA (dan record CDN-nya)",
        "sebelum rilis. Audit ini opt-in (BRAND_DNS=1) karena domain memang belum",
        "didaftarkan — tetap jalankan sebelum rilis, dan jangan menganggap hijau",
        "berarti domain sudah hidup.",
      ].join("\n")
    ).toEqual([])
  }, 30_000)
})
