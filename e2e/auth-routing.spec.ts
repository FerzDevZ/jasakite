import { expect, test } from "@playwright/test"
import { login } from "./helpers/auth"

/**
 * Matrix auth-routing 6 kasus.
 * Memverifikasi guard peran di middleware.ts + dashboard/page.tsx.
 * - CUSTOMER / PROVIDER / ADMIN diarahkan ke dashboard masing-masing.
 * - Guard /dashboard/provider dan /dashboard/admin menolak role yang salah.
 * - Rute terproteksi tanpa sesi mengarah ke /login?callbackUrl=...
 */
test.describe("auth routing — guard peran", () => {
  test("CUSTOMER /dashboard → /dashboard/customer", async ({ page }) => {
    await login(page, "customer", "/dashboard")
    await expect(page).toHaveURL(/\/dashboard\/customer/)
    await expect(page.getByRole("heading", { level: 1, name: /Pesanan Saya/i })).toBeVisible()
  })

  test("PROVIDER /dashboard → /dashboard/provider", async ({ page }) => {
    await login(page, "provider", "/dashboard")
    await expect(page).toHaveURL(/\/dashboard\/provider/)
    await expect(page.getByRole("heading", { level: 1, name: /Dashboard Provider/i })).toBeVisible()
  })

  test("ADMIN /dashboard → /dashboard/admin", async ({ page }) => {
    await login(page, "admin", "/dashboard")
    await expect(page).toHaveURL(/\/dashboard\/admin/)
  })

  test("CUSTOMER GET /dashboard/provider → redirect ke /dashboard (tidak boleh akses kanban provider)", async ({
    page,
  }) => {
    await login(page, "customer", "/dashboard/provider")
    // middleware: /dashboard/provider hanya PROVIDER/ADMIN → redirect /dashboard
    // dashboard/page.tsx lalu redirect lagi ke /dashboard/customer
    await expect(page).toHaveURL(/\/dashboard(\/customer)?/)
    await expect(page).not.toHaveURL(/\/dashboard\/provider/)
    // pastikan kanban "Pesanan Masuk" tidak terlihat untuk customer
    await expect(page.getByRole("heading", { level: 2, name: /Pesanan Masuk/i })).toHaveCount(0)
  })

  test("unauth GET /dashboard → /login?callbackUrl=/dashboard", async ({ page }) => {
    // tanpa login, bersihkan cookie untuk simulasi unauth
    await page.context().clearCookies()
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard/)
    // form login harus tampil
    await expect(page.locator("form").filter({ has: page.locator("input#email") })).toBeVisible()
  })

  test("PROVIDER GET /dashboard/admin → redirect (hanya ADMIN)", async ({ page }) => {
    await login(page, "provider", "/dashboard/admin")
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)
    await expect(page).toHaveURL(/\/dashboard/)
    // provider tidak boleh melihat heading moderasi
    await expect(page.getByRole("heading", { name: /Moderasi/i })).toHaveCount(0)
  })
})
