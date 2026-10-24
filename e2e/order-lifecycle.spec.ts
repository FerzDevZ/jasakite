import { expect, test } from "@playwright/test"
import { ACCOUNTS, login } from "./helpers/auth"
import { markOrderPaid } from "./helpers/api"

/**
 * Alur pesanan end-to-end: customer memesan → provider menerima → provider
 * menandai selesai → customer memberi ulasan.
 *
 * Ini satu-satunya verifikasi yang membuktikan mesin status pesanan, guard
 * peran, dan kanban provider bekerja bersama pada server produksi. Unit test
 * di tests/order-status.test.ts hanya menguji fungsi transisinya secara murni.
 *
 * Test berurutan (serial) dan berbagi satu data: nomor pesanan yang dibuat di
 * langkah pertama dipakai langkah berikutnya. Menjalankannya paralel akan
 * membuat kedua sesi berebut status pesanan yang sama.
 */

test.describe.configure({ mode: "serial" })

test.describe("siklus hidup pesanan", () => {
  let orderId: string
  let serviceHref: string

  /**
   * Pesanan harus dibuat pada jasa yang (a) milik akun provider yang dipakai di
   * langkah berikutnya, dan (b) berstatus ACTIVE.
   *
   * Dua percobaan sebelumnya gagal karena melanggar salah satunya: "jasa
   * pertama di katalog" bisa milik provider lain, dan "jasa pertama di dashboard
   * provider" ternyata berstatus DRAFT — halaman publiknya memang 404, jadi
   * tombol Pesan Sekarang tidak pernah ada.
   *
   * `/api/services?search=<nama provider>` menyelesaikan keduanya: endpoint itu
   * mencocokkan nama provider DAN memfilter status ACTIVE.
   */
  test("ambil jasa aktif milik provider uji", async ({ request }) => {
    const response = await request.get(
      `/api/services?search=${encodeURIComponent(ACCOUNTS.provider.name)}`
    )
    expect(response.ok()).toBeTruthy()

    const { services } = (await response.json()) as {
      services: { slug: string }[]
    }
    expect(services.length, "provider uji harus punya jasa aktif").toBeGreaterThan(0)

    serviceHref = `/service/${services[0].slug}`
  })

  test("customer membuat pesanan atas jasa provider tersebut", async ({
    page,
  }) => {
    await login(page, "customer", "/services")
    await page.goto(serviceHref)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    // "Pesan Sekarang" kini <Link>, bukan window.location — navigasi klien.
    await page.getByRole("link", { name: "Pesan Sekarang" }).first().click()
    await expect(page).toHaveURL(/\/checkout\?service=/)

    await page
      .getByLabel(/Alamat Pelaksanaan/i)
      .fill("Jl. Melati No.12, Pangkal Pinang, Kepulauan Bangka Belitung")

    // Label di halaman checkout berbunyi "Catatan untuk Provider (opsional)".
    // Nama lama "Catatan Tambahan" tidak ada lagi, dan getByLabel yang tidak
    // menemukan apa pun menunggu sampai seluruh batas waktu tes habis.
    await page
      .getByLabel(/Catatan untuk Provider/i)
      .fill("Pesanan uji otomatis dari Playwright.")

    // Metode pembayaran adalah radiogroup dengan roving tabindex: pilihan aktif
    // tabindex=0, sisanya -1. Panah harus memindahkan pilihan.
    const radios = page.getByRole("radio")
    await radios.first().focus()
    await page.keyboard.press("ArrowDown")
    await expect(radios.nth(1)).toHaveAttribute("aria-checked", "true")
    await expect(radios.nth(1)).toHaveAttribute("tabindex", "0")
    await expect(radios.first()).toHaveAttribute("tabindex", "-1")

    // Kembalikan ke pilihan pertama agar pesanan memakai transfer bank.
    await page.keyboard.press("ArrowUp")
    await expect(radios.first()).toHaveAttribute("aria-checked", "true")

    await page
      .getByRole("button", { name: /Konfirmasi Pesanan/i })
      .first()
      .click()

    await expect(
      page.getByRole("heading", { level: 1, name: /Pesanan Berhasil Dibuat/i })
    ).toBeVisible({ timeout: 20_000 })

    const detailLink = page.getByRole("link", { name: /Lihat Pesanan Ini/i })
    const detailHref = await detailLink.getAttribute("href")
    orderId = detailHref!.split("/").pop()!
    // Bukan Number(orderId): di MongoDB id adalah ObjectId 24-hex, dan
    // Number("507f1f77...") bernilai NaN — perbandingan NaN > 0 selalu gagal,
    // jadi tesnya menolak id yang sebenarnya sah.
    expect(orderId).toMatch(/^[0-9a-f]{24}$|^\d+$/)

    // Checkout menyimpan pesanan sebagai UNPAID (QRIS statis menunggu
    // verifikasi SUPER_ADMIN ber-TOTP). Fixture menandainya sudah dibayar agar
    // langkah berikutnya menguji transisi PENDING → IN_PROGRESS, bukan gerbang
    // pembayaran yang sudah diuji unit di tests/payments.test.ts.
    await markOrderPaid(orderId)
  })

  test("pesanan baru muncul sebagai PENDING di dashboard customer", async ({
    page,
  }) => {
    // callbackUrl langsung ke halaman tujuan: page.goto() sesudah login bisa
    // ditabrak redirect klien yang masih berjalan.
    await login(page, "customer", "/dashboard/customer")

    await expect(
      page.getByRole("heading", { level: 1, name: /Pesanan Saya/i })
    ).toBeVisible()
    await expect(page.getByText(`#${orderId}`).first()).toBeVisible({
      timeout: 20_000,
    })
  })

  test("customer tidak bisa memajukan status pesanannya sendiri", async ({
    page,
  }) => {
    await login(page, "customer", `/orders/${orderId}`)

    await expect(
      page.getByRole("heading", { level: 1, name: new RegExp(`Pesanan #${orderId}`) })
    ).toBeVisible()

    // Guard peran: hanya provider yang boleh menerima/menyelesaikan pesanan.
    await expect(
      page.getByRole("button", { name: /Terima & Kerjakan/i })
    ).toHaveCount(0)
  })

  test("provider menerima pesanan dari kanban", async ({ page }) => {
    // `login` dengan callbackUrl sudah mendaratkan kita di dashboard provider.
    // Memanggil page.goto() ke URL yang sama setelahnya bisa bertabrakan dengan
    // redirect middleware/klien yang masih berjalan ("navigation is
    // interrupted by another navigation").
    await login(page, "provider", "/dashboard/provider")

    // Kanban ini sebelumnya ada di komponen yang tidak pernah diimpor —
    // keberadaannya di halaman adalah bagian dari yang diuji.
    await expect(
      page.getByRole("heading", { level: 2, name: /Pesanan Masuk/i })
    ).toBeVisible()

    const card = page
      .locator("article")
      .filter({ hasText: `Pesanan #${orderId}` })
    await expect(card).toBeVisible({ timeout: 20_000 })

    await card.getByRole("button", { name: /Terima & Kerjakan/i }).click()

    // Setelah transisi, kartu pindah kolom dan tombolnya berganti.
    await expect(
      page
        .locator("article")
        .filter({ hasText: `Pesanan #${orderId}` })
        .getByRole("button", { name: /Tandai Selesai/i })
    ).toBeVisible({ timeout: 20_000 })
  })

  test("provider menandai pesanan selesai", async ({ page }) => {
    await login(page, "provider", "/dashboard/provider")

    const card = page
      .locator("article")
      .filter({ hasText: `Pesanan #${orderId}` })
    await expect(card).toBeVisible({ timeout: 20_000 })

    await card.getByRole("button", { name: /Tandai Selesai/i }).click()

    // Kolom "Selesai" tidak punya tombol aksi lanjutan.
    await expect(
      page
        .locator("article")
        .filter({ hasText: `Pesanan #${orderId}` })
        .getByRole("button", { name: /Tandai Selesai|Terima & Kerjakan/i })
    ).toHaveCount(0, { timeout: 20_000 })
  })

  test("customer memberi ulasan setelah pesanan selesai", async ({ page }) => {
    await login(page, "customer", `/orders/${orderId}`)

    // Form ulasan hanya muncul pada status COMPLETED — kalau langkah provider
    // gagal, test ini gagal di sini, bukan lolos diam-diam.
    //
    // Formulirnya dirender TERBUKA di halaman ini (prop defaultOpen), jadi tidak
    // ada tombol pemicu "Beri Rating & Ulasan" untuk diklik. Langsung ke bintangnya.
    const star5 = page.getByRole("radio", { name: "5 bintang" })
    await expect(star5).toBeVisible({ timeout: 20_000 })
    await star5.click()
    await expect(star5).toHaveAttribute("aria-checked", "true")

    await page
      .getByLabel(/Komentar/i)
      .fill("Pekerjaan rapi dan selesai tepat waktu. Uji otomatis.")
    await page.getByRole("button", { name: /Kirim Ulasan/i }).click()

    await expect(
      page.getByText(/Ulasan Anda sudah terkirim/i)
    ).toBeVisible({ timeout: 20_000 })
  })
})
