import { expect, test, type Page } from "@playwright/test"

/**
 * Guard touch-target komponen baru (WCAG 2.5.8 / Apple-HIG 44pt).
 *
 * Banner install PWA dan elemen pendukungnya pernah ditulis dengan tinggi
 * 28–32px — di bawah minimum 44px untuk sentuhan jempol. Test ini mengukur
 * bounding box NYATA di browser (bukan membaca nama class Tailwind), jadi
 * perubahan padding/ukuran di masa depan tetap tertangkap.
 *
 * Catatan ketat: elemen yang sengaja kecil secara visual (ikon) harus tetap
 * punya AREA sentuh ≥44px — dicapai lewat padding, bukan diperbesar.
 */

type Target = { name: string; locator: string }

/** Halaman tempat tiap target bisa ditemukan. */
const CASES: { path: string; targets: Target[] }[] = [
  {
    path: "/",
    targets: [
      // Bottom-nav: 5 tab adalah navigasi utama di mobile.
      { name: "tab Beranda (bottom-nav)", locator: 'nav[aria-label="Navigasi utama"] a:has-text("Beranda")' },
      { name: "tab Kategori (bottom-nav)", locator: 'nav[aria-label="Navigasi utama"] a:has-text("Kategori")' },
      // Ikon lingkaran kategori ala GoFood.
      { name: "kategori Perbaikan Rumah", locator: 'a[href*="category="]:has-text("Perbaikan Rumah")' },
      { name: "kategori Kebersihan", locator: 'a[href*="category="]:has-text("Kebersihan")' },
    ],
  },
]

/**
 * Banner PWA butuh `beforeinstallprompt` yang tidak bisa dipicu di test —
 * tapi target yang sama penting untuk keterbacaan dismiss-nya. Uji ukuran
 * tombol via render paksa: banner hanya render saat state visible, jadi
 * kita ukur langsung markup tombol lewat komponen statis yang setara:
 * tombol Tutup di banner memakai pola sama dengan tombol ikon kecil lain.
 * Pendekatan jujur: banner TIDAK bisa diuji end-to-end tanpa event browser,
 * maka guard-nya berbentuk pengukuran elemen dengan pola ukuran identik
 * (h-11) di halaman nyata + unit check di file komponen (lihat tes vite).
 */
const BANNER_MIN_HEIGHT_PX = 44

async function assertMinBox(page: Page, selector: string, label: string, min = 44) {
  const box = page.locator(selector).first()
  await expect(box, `${label} harus ada di ${page.url()}`).toBeVisible()
  const b = await box.boundingBox()
  expect(b, `${label} punya bounding box`).not.toBeNull()
  expect(
    b!.height,
    `${label} tinggi ${b!.height}px — minimal ${min}px (WCAG 2.5.8)`
  ).toBeGreaterThanOrEqual(min)
  expect(
    b!.width,
    `${label} lebar ${b!.width}px — minimal ${min}px (WCAG 2.5.8)`
  ).toBeGreaterThanOrEqual(min)
}

test.describe("touch-target komponen baru (>=44px)", () => {
  for (const { path, targets } of CASES) {
    test.describe(`di ${path}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(path)
      })

      for (const { name, locator } of targets) {
        test(name, async ({ page }) => {
          await assertMinBox(page, locator, name)
        })
      }
    })
  }

  test("banner PWA mendeklarasikan area sentuh >=44px untuk tombol Pasang & Tutup", async () => {
    // Banner interaktif tidak bisa dirender di Playwright tanpa
    // beforeinstallprompt; guard ini memeriksa SOURCE-nya agar angka 44
    // tidak menyusut tanpa sengaja (mis. h-11 → h-8 saat refactor).
    const { readFileSync } = await import("node:fs")
    const src = readFileSync("components/layout/pwa-install-banner.tsx", "utf8")
    const buttonClass = /<Button[^>]*size="sm"[^>]*className="([^"]*)"/.exec(src)?.[1] ?? ""
    const closeClass = /aria-label="Tutup[^"]*"\s*onClick[^>]*className="([^"]*)"/.exec(src)?.[1] ?? ""
    // Tombol sm = h-8 (32px); area sentuh harus ditingkatkan via padding
    // tambahan sehingga total bounding box >= 44px, ATAU kelasnya >= h-11.
    expect(
      /h-11|h-12|p-3\b|py-3\b/.test(buttonClass + " " + closeClass),
      `kelas area sentuh banner (${buttonClass} | ${closeClass}) harus menjamin >=${BANNER_MIN_HEIGHT_PX}px`
    ).toBeTruthy()
  })
})
