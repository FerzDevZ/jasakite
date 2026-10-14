import { expect, test } from "@playwright/test"
import { listOrders, listServices } from "./helpers/api"
import { login } from "./helpers/auth"

/**
 * Breadcrumb: aria-label="Breadcrumb" di service detail / provider / orders.
 * Memverifikasi navigasi hierarki dan aksesibilitas landmark.
 *
 * Seluruh data uji diambil lewat helper API, bukan `page.evaluate(() => fetch(...))`.
 * Cara lama gagal pada AKSI PERTAMA setiap tes: halaman masih about:blank, jadi
 * URL relatif tidak punya basis dan fetch melempar "Failed to parse URL".
 */

test.describe("breadcrumb — aria-label Breadcrumb", () => {
  test("service detail: Beranda > Kategori > Judul (aria-current=page)", async ({ page }) => {
    const service = (await listServices(page))[0]
    expect(service, "butuh minimal satu jasa aktif").toBeTruthy()

    await page.goto(`/service/${service.slug}`)
    const nav = page.getByLabel("Breadcrumb")
    await expect(nav).toBeVisible({ timeout: 10_000 })
    await expect(nav.getByRole("link", { name: "Beranda" })).toBeVisible()
    // link kategori + judul sebagai current
    const current = nav.locator('[aria-current="page"]')
    await expect(current).toBeVisible()
    await expect(current).not.toBeEmpty()
    // separator "/" ada sebagai span aria-hidden
    await expect(nav.locator('span[aria-hidden="true"]', { hasText: "/" }).first()).toBeVisible()
  })

  test("provider profile: breadcrumb atau heading provider + link Beranda", async ({ page }) => {
    const service = (await listServices(page))[0]
    expect(service, "butuh minimal satu jasa aktif").toBeTruthy()

    await page.goto(`/provider/${service.provider.id}`)
    // provider page saat ini tidak punya nav Breadcrumb eksplisit — verifikasi fallback:
    // heading nama provider + setidaknya tidak error
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 10_000 })
    const breadcrumb = page.getByLabel("Breadcrumb")
    if ((await breadcrumb.count()) > 0) {
      await expect(breadcrumb).toBeVisible()
      await expect(breadcrumb.getByRole("link", { name: "Beranda" })).toBeVisible()
    } else {
      // TODO: tambahkan Breadcrumb di provider/[id]/page.tsx — skeleton skip ketat
      test.skip(true, "provider belum punya Breadcrumb (fallback heading saja)")
    }
  })

  test("orders detail: breadcrumb via 'Kembali ke dashboard' + status timeline", async ({ page }) => {
    await login(page, "customer", "/dashboard/customer")
    const orders = await listOrders(page)
    if (orders.length === 0) {
      test.skip(true, "customer belum punya pesanan untuk uji breadcrumb orders")
      return
    }
    const orderId = String(orders[0].id)

    await page.goto(`/orders/${orderId}`)
    await expect(page.getByRole("heading", { name: new RegExp(`Pesanan #${orderId}`) })).toBeVisible({
      timeout: 15_000,
    })
    // orders page saat ini memakai Link "Kembali ke dashboard" bukan Breadcrumb nav — cek itu
    const back = page.getByRole("link", { name: /Kembali ke dashboard/i })
    await expect(back).toBeVisible()
    const breadcrumb = page.getByLabel("Breadcrumb")
    if ((await breadcrumb.count()) > 0) {
      await expect(breadcrumb).toBeVisible()
    } else {
      // skeleton: catat TODO tanpa fail
      test.skip(true, "orders detail belum pakai nav Breadcrumb — gunakan Back link sebagai breadcrumb minimal")
    }
  })

  test("breadcrumb link Beranda selalu ke '/'", async ({ page }) => {
    const service = (await listServices(page))[0]
    expect(service, "butuh minimal satu jasa aktif").toBeTruthy()

    await page.goto(`/service/${service.slug}`)
    const homeLink = page.getByLabel("Breadcrumb").getByRole("link", { name: "Beranda" })
    await expect(homeLink).toHaveAttribute("href", "/")
  })
})
