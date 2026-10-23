import { expect, test } from "@playwright/test"
import { login } from "./helpers/auth"

/**
 * Halaman Build & Deploy.
 *
 * Yang dikunci di sini adalah hal yang tidak bisa dibuktikan unit test: halaman
 * benar-benar ter-render untuk ADMIN, menampilkan perintah gerbang yang sama
 * dengan yang dibaca `scripts/vercel-ignore-build.js`, dan menolak peran lain.
 *
 * Isi daftar deployment sengaja tidak diasersi: data itu bergantung pada
 * `VERCEL_TOKEN` di lingkungan tempat suite dijalankan.
 */
test.describe("admin — Build & Deploy", () => {
  test("ADMIN melihat gerbang build dan sumber aturannya", async ({ page }) => {
    await login(page, "admin", "/dashboard/admin/vercel")

    await expect(page).toHaveURL(/\/dashboard\/admin\/vercel/)
    // Role heading, bukan teks: di mobile ada tautan nav "Build & Deploy" di
    // drawer yang tertutup, dan locator teks akan menemukan elemen tersembunyi
    // itu lebih dulu.
    await expect(
      page.getByRole("heading", { level: 1, name: /^Build & Deploy$/ })
    ).toBeVisible({ timeout: 30_000 })

    // Isi kartu bergantung pada `/api/admin/vercel`, yang menyentuh Prisma dan
    // (bila token tersedia) Vercel API. Koneksi MongoDB dingin bisa melewati
    // batas bawaan 10 detik, jadi kartu ini ditunggu lebih lama.
    await expect(
      page.getByRole("heading", { level: 2, name: "Gerbang build" })
    ).toBeVisible({ timeout: 30_000 })
    // Perintah yang sama muncul tiga kali (blok ignoreCommand, baris
    // vercel.json, dan baris "Berlaku") — bukan kesalahan render.
    await expect(
      page.getByText("node scripts/vercel-ignore-build.js").first()
    ).toBeVisible()
    await expect(page.getByText("Sumber aturan")).toBeVisible()
    await expect(page.getByText("^app/", { exact: true })).toBeVisible()
    await expect(page.getByText(/\d+ pola memicu build/)).toBeVisible()
    // Inti halaman: satu aturan untuk kedua environment.
    await expect(page.getByText(/produksi dan preview/i).first()).toBeVisible()
  })

  test("kartu deployment menampilkan keadaan yang sah, bukan data karangan", async ({
    page,
  }) => {
    await login(page, "admin", "/dashboard/admin/vercel")

    await expect(
      page.getByRole("heading", { level: 2, name: "Deployment terakhir" })
    ).toBeVisible()

    const emptyState = page.getByText(/Belum terhubung ke Vercel API/)
    const errorState = page.getByText(/Vercel API menolak|Gagal menghubungi Vercel API/)
    const rows = page.locator("li").filter({ hasText: /Produksi|Preview/ })

    // Query ke API berjalan setelah hidrasi, jadi tiga keadaan sah ini harus
    // ditunggu — mengeceknya segera setelah judul muncul akan membaca skeleton.
    const settledState = emptyState.or(errorState).or(rows.first())
    await expect(settledState).toBeVisible({ timeout: 20_000 })

    // Tanpa VERCEL_TOKEN di lingkungan E2E, halaman wajib menyebut variabel
    // yang kurang alih-alih menampilkan daftar kosong tanpa penjelasan.
    if (await emptyState.isVisible().catch(() => false)) {
      // Nama variabel muncul di deskripsi empty state sekaligus di baris
      // "Sumber aturan" — dua tempat, bukan duplikasi yang salah.
      await expect(page.getByText(/VERCEL_TOKEN/).first()).toBeVisible()
      await expect(page.getByText(/VERCEL_PROJECT_ID/).first()).toBeVisible()
    } else {
      expect(await rows.count()).toBeGreaterThan(0)
    }
  })

  test("CUSTOMER tidak bisa membuka halaman admin", async ({ page }) => {
    await login(page, "customer", "/dashboard/customer")
    await page.goto("/dashboard/admin/vercel")

    await expect(page).not.toHaveURL(/\/dashboard\/admin\/vercel/)
    await expect(
      page.getByRole("heading", { level: 1, name: /^Build & Deploy$/ })
    ).toHaveCount(0)
  })
})
