import { expect, test } from "@playwright/test"

/**
 * Verifikasi PWA offline end-to-end:
 *
 * 1. Service worker ter-registrasi & aktif (build produksi).
 * 2. Rute yang pernah dibuka online tetap terbuka saat offline (network-first
 *    gagal → salinan cache).
 * 3. Rute yang BELUM pernah dibuka saat offline menerima halaman offline
 *    kustom (/offline.html) — bukan dino browser tanpa penjelasan.
 *
 * Aset /_next/ sengaja dilewati SW (lihat sw.js), jadi halaman yang dirender
 * ulang dari cache tetap menampilkan markup SSR-nya; CSS/JS tidak dibutuhkan
 * untuk asersi konten dokumen.
 */
test.describe("PWA offline fallback", () => {
  let contextLoadCount = 0

  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    // Pastikan SW aktif sebelum mulai (produksi: registrasi di window load).
    await page.waitForFunction(
      () => navigator.serviceWorker.ready.then((r) => !!r.active),
      { timeout: 15_000 },
    )
    // Beri waktu install precache menyelesaikan safeAddAll.
    await page.waitForTimeout(1500)
    contextLoadCount += 1
  })

  test("rute yang pernah dibuka tetap terbuka saat offline", async ({ page, context }) => {
    // Panaskan cache dengan navigasi nyata (network-first menyimpan salinan).
    await page.goto("/services")
    await expect(page).toHaveURL(/\/services/)

    await context.setOffline(true)
    // Load ulang rute yang sama — harus dilayani cache, bukan error jaringan.
    await page.reload({ waitUntil: "commit" })
    await expect(page).toHaveURL(/\/services/)
    // Konten dokumen hadir (markup SSR tersimpan).
    await expect(page.locator("body")).toContainText("JASAKITE")
    await context.setOffline(false)
  })

  test("rute tak-tercache saat offline menampilkan halaman offline kustom", async ({ page, context }) => {
    // Rute yang tidak ada di STATIC_ASSETS dan tidak dikunjungi sebelumnya.
    await context.setOffline(true)
    const resp = await page.goto("/paket-bantuan", { waitUntil: "commit" })
    // SW menjawab (bukan kegagalan transport browser).
    expect(resp?.status(), "fallback harus berupa respons 200 dari SW").toBe(200)
    await expect(page).toHaveTitle(/Offline — JASAKITE/)
    await expect(page.getByRole("heading", { name: /Kamu sedang offline/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Coba Lagi/i })).toBeVisible()
    await context.setOffline(false)
  })

  test("offline.html selalu tersedia sebagai dokumen mandiri", async ({ page }) => {
    await page.goto("/offline.html")
    await expect(page.getByRole("heading", { name: /Kamu sedang offline/i })).toBeVisible()
    // Self-contained: tidak ada subresource eksternal yang bisa gagal offline.
    const externals = await page.evaluate(() =>
      [...document.querySelectorAll("link[href], script[src], img[src]")]
        .map((el) => el.getAttribute("href") ?? el.getAttribute("src") ?? "")
        .filter((u) => u.startsWith("http") || u.startsWith("/_next")),
    )
    expect(externals, "halaman offline harus tanpa dependensi eksternal").toHaveLength(0)
  })

  test("badge offline-inline tampil saat offline dan hilang saat online lagi", async ({ page, context }) => {
    await page.goto("/")
    await expect(page.getByTestId("offline-badge")).toHaveCount(0)

    await context.setOffline(true)
    // Event 'offline' browser memicu badge persisten di bawah navbar.
    await expect(page.getByTestId("offline-badge")).toBeVisible()
    await expect(page.getByTestId("offline-badge")).toContainText("melihat data tersimpan")

    // Badge adalah status dokumen yang hidup: tetap tampil sepanjang sesi
    // (SPA navigation tidak mengganti dokumen). Reload penuh saat offline
    // nyata juga menampilkannya via pembacaan navigator.onLine saat mount —
    // jalur itu tidak bisa disimulasikan Playwright karena emulasi onLine
    // di-reset pada dokumen baru setelah navigasi gagal (quirk terverifikasi).
    await page.waitForTimeout(500)
    await expect(page.getByTestId("offline-badge")).toBeVisible()

    await context.setOffline(false)
    // Online lagi: badge hilang — pengguna kembali melihat data langsung.
    await expect(page.getByTestId("offline-badge")).toHaveCount(0)
  })
})
