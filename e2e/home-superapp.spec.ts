import { expect, test } from "@playwright/test"

/**
 * Beranda super-app — blok aplikasi setelah hero.
 *
 * Empat rail (pesanan berjalan → promo → pintasan kategori → voucher) adalah
 * bagian yang membuat halaman terasa bisa dipakai, bukan brosur. Tes ini
 * menjaga dua hal yang mudah rusak tanpa terlihat:
 *
 *   1. rail promo/voucher yang tampil HARUS berisi data — rail kosong berarti
 *      ada bug filtering, sedangkan rail hilang saat data ada berarti query-nya
 *      rusak. Karena itu keputusan "harus tampil atau tidak" diambil dari API
 *      yang sumber datanya sama dengan beranda (`/api/promos`), bukan dari
 *      asumsi isi database;
 *   2. pintasan kategori benar-benar membawa pengguna ke katalog terfilter.
 *
 * Kontrak lama tidak disentuh: h1 hero, combobox "Cari jasa", dan bottom-nav
 * diuji di e2e/public-pages.spec.ts.
 */
test.describe("beranda super-app", () => {
  test("rail promo, pintasan kategori, voucher, dan feed tampil sesuai data", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(
      page.getByRole("heading", { level: 1, name: /Jasa terbaik dari/ })
    ).toBeVisible()

    // Pintasan kategori: grid ikon menuju katalog terfilter.
    const categorySection = page.locator('section[aria-labelledby="pintasan-kategori"]')
    await expect(categorySection).toBeVisible()
    const categoryLinks = categorySection.locator('a[href*="/services?category="]')
    await expect(categoryLinks.first()).toBeVisible()
    expect(await categoryLinks.count(), "pintasan kategori").toBeGreaterThanOrEqual(4)

    // Promo: data yang sama dengan yang dibaca beranda.
    const promoRes = await page.request.get("/api/promos")
    expect(promoRes.ok(), `GET /api/promos → ${promoRes.status()}`).toBeTruthy()
    const banners = ((await promoRes.json()) as { banners?: unknown[] }).banners ?? []
    const promoHeading = page.getByRole("heading", { name: "Promo & penawaran" })
    if (banners.length > 0) {
      await expect(promoHeading).toBeVisible()
      const promoCards = page.locator('section[aria-labelledby="promo-heading"] li')
      // Jumlahnya tidak dipatok sama dengan API: beranda di-ISR 60 detik,
      // sehingga bisa saja masih memajang banner yang baru kedaluwarsa. Yang
      // penting rail tidak pernah tampil kosong saat datanya ada.
      expect(await promoCards.count(), "kartu banner").toBeGreaterThan(0)
    } else {
      await expect(promoHeading).toHaveCount(0)
    }

    // Voucher: kalau rail-nya ada, isinya voucher sungguhan (kuota habis sudah
    // difilter di beranda — rail tidak boleh mengumumkan voucher tak terpakai).
    const voucherSection = page.locator('section[aria-labelledby="voucher-heading"]')
    if ((await voucherSection.count()) > 0) {
      const voucherCards = voucherSection.locator("li")
      expect(await voucherCards.count(), "kartu voucher").toBeGreaterThan(0)
      await expect(voucherSection.getByRole("heading", { name: "Voucher yang bisa dipakai" })).toBeVisible()
      await expect(voucherSection.getByText(/Rp\d|Tanpa minimum|%/).first()).toBeVisible()
    }

    // Feed padat: kartu jasa mengarah ke halaman detail.
    await expect(page.getByRole("heading", { name: "Paling banyak dipesan" })).toBeVisible()
    const feedLinks = page.locator('a[href^="/service/"]')
    expect(await feedLinks.count(), "kartu jasa di feed").toBeGreaterThanOrEqual(4)

    // Blok aplikasi ditutup dengan janji layanan + CTA penyedia.
    await expect(page.locator('section[aria-label="Janji layanan"]')).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Punya keahlian? Ubah jadi penghasilan." })
    ).toBeVisible()
  })

  test("pintasan kategori membuka katalog terfilter", async ({ page }) => {
    await page.goto("/")
    const categorySection = page.locator('section[aria-labelledby="pintasan-kategori"]')
    const firstCategory = categorySection.locator('a[href*="/services?category="]').first()
    await expect(firstCategory).toBeVisible()
    await firstCategory.click()

    await expect(page).toHaveURL(/\/services\?category=/)
    await expect(page.getByRole("heading", { level: 1, name: "Jelajahi Jasa" })).toBeVisible()
    // Filter yang aktif ikut terbaca dari URL — tanpa ini katalog tidak
    // bisa membedakan "jasa kategori X" dari "seluruh jasa".
    expect(page.url()).toMatch(/category=[0-9a-z]+/i)
  })

  test("menu hamburger menyediakan pintasan keranjang & notifikasi", async ({ page }) => {
    // Tombol dan panelnya md:hidden — di desktop justru mega-menu yang dipakai
    // (diuji di e2e/marketplace.spec.ts).
    if ((page.viewportSize()?.width ?? 1280) >= 768) {
      test.skip(true, "menu hamburger hanya untuk layar sempit")
      return
    }

    await page.goto("/")
    await page.getByRole("button", { name: "Buka menu" }).click()
    const menu = page.getByRole("dialog", { name: "Menu navigasi" })
    await expect(menu).toBeVisible()
    // Lonceng di header dan tab bawah mudah terlewat; menu ini satu-satunya
    // navigasi yang selalu terbuka penuh, jadi kedua tujuan harus ada di sini.
    await expect(menu.getByRole("link", { name: "Keranjang" })).toBeVisible()
    await expect(menu.getByRole("link", { name: "Notifikasi" })).toBeVisible()
  })
})
