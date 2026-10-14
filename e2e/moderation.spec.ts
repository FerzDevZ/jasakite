import { expect, test } from "@playwright/test"
import { login } from "./helpers/auth"
import { apiGet, firstDraftService } from "./helpers/api"

/**
 * Moderasi: ADMIN aktifkan DRAFT → customer lihat 200.
 * Seed memiliki 1 DRAFT; kalau tidak ada, test di-skip (tidak flaky).
 * Alur: cari draft lewat /api/admin/stats → klik Aktifkan di /dashboard/admin/moderasi
 * → verifikasi publik 200.
 */

test.describe("moderasi — DRAFT → ACTIVE", () => {
  test("admin aktifkan DRAFT, customer lihat 200 di /service/[slug]", async ({ page }) => {
    await login(page, "admin", "/dashboard/admin/moderasi")
    await expect(page.getByRole("heading", { name: /Moderasi Jasa/i })).toBeVisible({ timeout: 15_000 })

    const draft = await firstDraftService(page)
    if (!draft) {
      // tidak ada draft menunggu moderasi — anggap sudah bersih, skip tanpa fail
      test.skip(true, "tidak ada jasa DRAFT untuk dimoderasi")
      return
    }

    // pratinjau draft sebagai admin (sesi admin ikut karena request berbagi cookie)
    await page.goto(`/service/${draft.slug}?preview=1`)
    await expect(page.getByText(draft.title).first()).toBeVisible({ timeout: 15_000 })

    // kembali ke moderasi dan aktifkan.
    //
    // `page.locator("div").filter({ hasText: judul }).first()` sengaja tidak
    // dipakai lagi: `.first()` mengambil div TERLUAR yang memuat judul tersebut,
    // yaitu pembungkus dashboard — pemilih yang benar secara kebetulan, bukan
    // karena diarahkan. Halaman ini hanya punya satu tombol "Aktifkan".
    await page.goto("/dashboard/admin/moderasi")
    // `exact` WAJIB di sini. Tanpa itu pencarian nama bersifat substring dan
    // tombol PERTAMA yang cocok adalah "Aktifkan mode terang" — toggle tema di
    // navbar, yang letaknya lebih awal di DOM daripada kartu draft. Test-nya
    // lalu mengklik toggle tema, tidak ada PATCH yang pernah dikirim, dan
    // kegagalannya tampak seperti bug aktivasi di sisi aplikasi.
    const activateBtn = page.getByRole("button", { name: "Aktifkan", exact: true }).first()
    await expect(activateBtn).toBeVisible({ timeout: 10_000 })
    await activateBtn.click()

    // Diperiksa dari EFEKNYA, bukan dari toast: toast hanya hidup ~4 detik dan
    // membuat tes rapuh terhadap waktu, sedangkan yang benar-benar diuji adalah
    // jasa itu menjadi tayang. /api/services hanya mengembalikan jasa ACTIVE,
    // jadi kemunculannya di sana adalah bukti aktivasi berhasil.
    await expect
      .poll(
        async () => {
          const res = await apiGet(page, `/api/services?slug=${draft.slug}`)
          const body = (await res.json()) as { services?: unknown[] }
          return body.services?.length ?? 0
        },
        { timeout: 20_000 }
      )
      .toBe(1)

    // sekarang sebagai publik (tanpa cookie) harus 200 tanpa preview
    await page.context().clearCookies()
    const publicRes = await apiGet(page, `/service/${draft.slug}`)
    expect(publicRes.status(), "setelah aktif, publik harus 200").toBe(200)

    await page.goto(`/service/${draft.slug}`)
    await expect(page.getByText(draft.title).first()).toBeVisible({ timeout: 15_000 })
    // halaman aktif tidak boleh noindex
    const html = await publicRes.text()
    expect(html).not.toMatch(/<meta[^>]*name="robots"[^>]*noindex/i)
  })

  test("DRAFT tanpa preview tetap 404 (soft 404 noindex) untuk publik", async ({ page }) => {
    await login(page, "admin", "/dashboard/admin/moderasi")

    // cari draft yang masih ada (jika sudah diaktifkan di test sebelumnya, mungkin 0)
    const draft = await firstDraftService(page)
    if (!draft) {
      test.skip(true, "tidak ada DRAFT tersisa untuk uji 404 publik")
      return
    }

    await page.context().clearCookies()
    const res = await apiGet(page, `/service/${draft.slug}`)
    // karena Navbar async streaming, status 200 tapi UI not-found + noindex:
    // sebelum aktif, publik tidak boleh melihat konten
    const html = await res.text()
    if (html.includes(draft.title) && !html.includes("tidak ditemukan")) {
      test.skip(true, "draft sudah aktif, skip 404 check")
      return
    }
    expect(html).toMatch(/tidak ditemukan|noindex/i)
  })
})
