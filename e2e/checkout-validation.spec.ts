import { expect, test } from "@playwright/test"
import { ACCOUNTS, login } from "./helpers/auth"
import { postJson, serviceNotOwnedBy, serviceOwnedBy } from "./helpers/api"

/**
 * Validasi checkout: 5 kasus.
 * - Alamat kosong, alamat tanpa kota, deadline kemarin (min), own service, tanpa slug.
 * Semua diuji lewat UI agar validasi cityFromLocation + minDate benar-benar dieksekusi.
 *
 * Data uji dan panggilan API memakai helpers/api: `page.evaluate(fetch)` gagal pada
 * aksi pertama (halaman about:blank) dan balapan dengan router.refresh() dashboard.
 */

test.describe("checkout validation", () => {
  test("alamat kosong → alert inline 'Alamat lengkap wajib diisi'", async ({ page }) => {
    await login(page, "customer", "/services")
    const service = await serviceNotOwnedBy(page, ACCOUNTS.provider.name)

    await page.goto(`/checkout?service=${service.slug}`)
    await expect(page.getByRole("heading", { name: /Detail Pesanan/i })).toBeVisible()

    // Field alamat memakai atribut `required`, jadi validasi native browser
    // memblokir submit sebelum handleSubmit berjalan. Pesan yang benar-benar
    // dilihat pengguna adalah alert inline di bawah field — itulah yang
    // diverifikasi di sini, bukan pesan dari handleSubmit yang tak pernah tampil.
    const address = page.getByLabel(/Alamat Pelaksanaan/i)
    await address.fill("")
    await address.blur()

    await expect(
      page.getByRole("alert").filter({ hasText: /Alamat lengkap wajib diisi/i })
    ).toBeVisible({ timeout: 10_000 })

    await page.getByRole("button", { name: /Konfirmasi Pesanan/i }).first().click()
    // tetap di halaman checkout, tidak berhasil
    await expect(page).toHaveURL(/\/checkout\?service=/)
  })

  test("alamat tanpa kota → error 'Sertakan kabupaten/kota'", async ({ page }) => {
    await login(page, "customer", "/services")
    const service = await serviceNotOwnedBy(page, ACCOUNTS.provider.name)

    await page.goto(`/checkout?service=${service.slug}`)
    const address = page.getByLabel(/Alamat Pelaksanaan/i)
    await expect(address).toBeVisible()

    await address.fill("Jl. Melati No.12 RT 03 RW 04")
    await address.blur()
    await page.getByRole("button", { name: /Konfirmasi Pesanan/i }).first().click()

    await expect(page.getByText(/Sertakan kabupaten\/kota/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test("deadline kemarin → input min besok + API menolak jadwal masa lalu", async ({ page }) => {
    await login(page, "customer", "/services")
    const service = await serviceNotOwnedBy(page, ACCOUNTS.provider.name)

    await page.goto(`/checkout?service=${service.slug}`)

    const deadline = page.getByLabel(/Jadwal yang Diinginkan/i)
    await expect(deadline).toBeVisible()
    const min = await deadline.getAttribute("min")
    expect(min, "min harus besok (YYYY-MM-DD)").toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const minDate = new Date(min!)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    // toleransi zona: cukup pastikan min adalah besok, bukan hari ini/kemarin
    expect(minDate.toISOString().slice(0, 10)).toBe(tomorrow.toISOString().slice(0, 10))

    // Coba bypass UI: kirim deadline kemarin lewat API — harus 400.
    // Lewat postJson() supaya header CSRF ikut; tanpa itu middleware menjawab 403
    // dan tes akan salah menyimpulkan bahwa validasi tanggalnya rusak.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const res = await postJson(page, "/api/orders", {
      serviceId: service.id,
      address:
        "Jl. Sudirman No.1, Muntok, Kabupaten Bangka Barat, Kepulauan Bangka Belitung",
      deadline: yesterday,
    })

    expect(res.status()).toBe(400)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toMatch(/Jadwal harus di masa depan/i)
  })

  test("own service → empty state 'Tidak bisa memesan jasa sendiri'", async ({ page }) => {
    await login(page, "provider", "/services")
    const ownService = await serviceOwnedBy(page, ACCOUNTS.provider.name)

    await page.goto(`/checkout?service=${ownService.slug}`)
    await expect(page.getByText(/Tidak bisa memesan jasa sendiri/i)).toBeVisible({ timeout: 10_000 })
    // tombol konfirmasi harus disabled
    const confirm = page.getByRole("button", { name: /Konfirmasi Pesanan/i })
    if ((await confirm.count()) > 0) {
      await expect(confirm.first()).toBeDisabled()
    }
  })

  test("without slug → ServiceNotFound 'Jasa tidak ditemukan'", async ({ page }) => {
    await login(page, "customer", "/services")
    await page.goto("/checkout")
    await expect(page.getByRole("heading", { name: /Jasa tidak ditemukan/i })).toBeVisible()
    // Di-scope ke <main>: navbar juga punya tautan "Jelajahi jasa", sehingga
    // pencarian di seluruh halaman melanggar strict mode dan gagal karena
    // menemukan dua elemen yang keduanya benar.
    await expect(
      page.getByRole("main").getByRole("link", { name: /Jelajahi Jasa/i })
    ).toBeVisible()
  })
})
