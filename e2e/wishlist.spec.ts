import { expect, test } from "@playwright/test"
import { login } from "./helpers/auth"
import { listServices, savedSlugs, unsaveIfSaved } from "./helpers/api"

/**
 * Wishlist: toggle SaveButton (optimistic + toast) dan SavedServices di dashboard customer.
 * Menguji boundary API /api/saved tanpa memock domain logic.
 *
 * Sebelumnya spec ini mengambil slug lewat `page.evaluate(() => fetch("/api/services?take=1"))`.
 * Pada tes unauth itu dijalankan saat halaman masih about:blank, sehingga gagal
 * dengan "Failed to parse URL" tanpa pernah menyentuh aplikasinya.
 */

test.describe("wishlist — SaveButton & SavedServices", () => {
  test("toggle simpan → hapus, dan dashboard menampilkan jasa tersimpan", async ({ page }) => {
    await login(page, "customer", "/services")

    const service = (await listServices(page))[0]
    expect(service, "butuh minimal 1 jasa aktif").toBeTruthy()

    // bersihkan dulu: pastikan tidak tersimpan, agar klik pertama benar-benar "menyimpan"
    await unsaveIfSaved(page, String(service.id))

    await page.goto(`/service/${service.slug}`)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()

    const saveBtn = page.getByRole("button", { name: /Simpan jasa ini|Simpan/i }).first()
    await expect(saveBtn).toBeVisible()

    // --- simpan ---
    await saveBtn.click()
    await expect(page.getByRole("button", { name: /Hapus dari simpanan/i })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText(/Jasa disimpan/i).first()).toBeVisible({ timeout: 10_000 })

    // muncul di dashboard
    await page.goto("/dashboard/customer")
    await expect(page.getByRole("heading", { level: 1, name: /Pesanan Saya/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Jasa Disimpan/i })).toBeVisible()
    await expect(page.getByText(service.title).first()).toBeVisible({ timeout: 15_000 })

    // --- hapus lagi (toggle off) ---
    // Selalu lewat halaman detail jasa, bukan tombol Trash di dashboard: satu
    // jalur, satu toast, dan tidak bergantung pada apakah kartu di dashboard
    // sudah selesai beranimasi masuk saat tombolnya dicari.
    await page.goto(`/service/${service.slug}`)
    await page.getByRole("button", { name: /Hapus dari simpanan/i }).first().click()
    await expect(page.getByText(/Jasa dihapus dari simpanan/i).first()).toBeVisible({
      timeout: 10_000,
    })

    // Persistensi diperiksa lewat API, bukan dengan menunggu animasi kartu
    // keluar dari grid — yang bergantung pada durasi transisi dan mudah rapuh.
    await expect.poll(() => savedSlugs(page), { timeout: 10_000 }).not.toContain(service.slug)
  })

  test("unauth klik Simpan → redirect /login?callbackUrl", async ({ page }) => {
    await page.context().clearCookies()

    const service = (await listServices(page))[0]
    expect(service, "butuh slug jasa aktif untuk uji unauth").toBeTruthy()

    await page.goto(`/service/${service.slug}`)
    const saveBtn = page.getByRole("button", { name: /Simpan/i }).first()
    await expect(saveBtn).toBeVisible({ timeout: 10_000 })
    await saveBtn.click()
    await expect(page).toHaveURL(/\/login\?callbackUrl=/)
  })

  test.skip("optimistic rollback saat API 500 (simulasi) — skip default, manual", async () => {
    // Gagasan: intercept /api/saved POST → 500, klik Simpan, pastikan toast "Gagal menyimpan" dan tombol rollback ke Simpan.
    // Dibiarkan skip agar tidak flaky di CI tanpa intercept stabil.
  })
})
