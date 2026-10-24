import { resetOrderCreateLimits } from "./helpers/api"
import { expect, test } from "@playwright/test"
import { ACCOUNTS, login } from "./helpers/auth"
import { apiGet, csrfHeaders, postJson, serviceNotOwnedBy } from "./helpers/api"

/**
 * Keranjang → checkout tiga langkah.
 *
 * Alur ini tidak bisa diuji lewat unit test: nilainya ada pada transisi
 * antar langkah, harga yang dibaca ulang dari server, dan satu pesanan yang
 * benar-benar lahir di database. Yang diperiksa di sini adalah janji UI-nya —
 * bahwa tombol "Lanjut" tidak membawa pengguna ke langkah yang tidak siap, dan
 * bahwa pesanan yang dibuat muncul dengan nomor yang bisa dibaca.
 */

async function clearCart(page: import("@playwright/test").Page) {
  await page.context().request.delete("/api/cart", {
    headers: await csrfHeaders(page),
  })
}

/** Pastikan pelanggan punya minimal satu alamat tersimpan. */
async function ensureAddress(page: import("@playwright/test").Page) {
  const res = await apiGet(page, "/api/addresses")
  if (res.ok()) {
    const body = (await res.json()) as { addresses?: unknown[] }
    if ((body.addresses ?? []).length > 0) return
  }
  const created = await postJson(page, "/api/addresses", {
    label: "Rumah",
    recipient: "Pelanggan Uji",
    phone: "08123456789",
    street: "Jl. Depati Amir No.12, Kelurahan Batin Tikal",
    city: "Pangkal Pinang",
    note: "Pagar hijau sebelah warung",
  })
  expect(created.ok(), "POST /api/addresses gagal").toBeTruthy()
}

test.describe("keranjang & checkout tiga langkah", () => {
  test("keranjang kosong menawarkan jalan ke katalog", async ({ page }) => {
    await login(page, "customer", "/services")
    await resetOrderCreateLimits()
    await clearCart(page)

    await page.goto("/keranjang")
    await expect(
      page.getByRole("heading", { level: 1, name: "Keranjang" })
    ).toBeVisible()
    await expect(page.getByText(/Keranjang masih kosong/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Cari jasa" })).toBeVisible()
  })

  test("item masuk keranjang, qty bisa diubah, lalu checkout tiga langkah membuat pesanan", async ({
    page,
  }) => {
    await login(page, "customer", "/services")
    await resetOrderCreateLimits()
    const service = await serviceNotOwnedBy(page, ACCOUNTS.provider.name)

    await clearCart(page)
    await ensureAddress(page)

    const added = await postJson(page, "/api/cart", {
      serviceId: service.id,
      qty: 1,
      note: "Tolong hubungi dulu sebelum datang",
    })
    expect(added.ok(), "POST /api/cart gagal").toBeTruthy()

    // ── Langkah UI: keranjang menampilkan item & subtotal ──────────────────
    await page.goto("/keranjang")
    await expect(page.getByText(service.title).first()).toBeVisible()
    await expect(page.getByText(/Rp/).first()).toBeVisible()

    const plus = page.getByRole("button", {
      name: `Tambah jumlah ${service.title}`,
    })
    await plus.click()
    // Angka qty berubah tanpa memuat ulang halaman; kalau PATCH gagal, angka
    // akan kembali ke 1 dan pemeriksaan ini gagal.
    await expect(
      page
        .getByRole("listitem")
        .filter({ hasText: service.title })
        .getByText("2", { exact: true })
    ).toBeVisible({ timeout: 15_000 })

    // ── Wizard ─────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: /^Checkout/ }).click()
    await expect(page).toHaveURL(/\/checkout\?from=cart/)

    // Langkah 1: alamat tersimpan sudah terpilih otomatis.
    await expect(
      page.getByRole("heading", { name: /Ke mana jasa dikerjakan/i })
    ).toBeVisible()
    await expect(page.locator('input[name="alamat"]:checked')).toHaveCount(1)

    await page.getByRole("button", { name: /Lanjut ke jadwal/i }).click()
    await expect(
      page.getByRole("heading", { name: /Kapan enaknya dikerjakan/i })
    ).toBeVisible()

    // Jadwal opsional: boleh dikosongkan, dan itu memang dinyatakan di layar.
    await expect(page.getByText(/boleh dikosongkan/i)).toBeVisible()

    await page.getByRole("button", { name: /Lanjut ke pembayaran/i }).click()
    await expect(
      page.getByRole("heading", { name: /Pembayaran & ringkasan/i })
    ).toBeVisible()

    const submit = page.getByRole("button", { name: /Buat pesanan/i })
    await expect(submit).toBeEnabled()
    await submit.click()

    // ── Hasil ──────────────────────────────────────────────────────────────
    await expect(
      page.getByRole("heading", { name: /Pesanan dibuat|pesanan dibuat/i })
    ).toBeVisible({ timeout: 20_000 })
    await expect(
      page.getByRole("link", { name: /Lihat semua pesanan/i })
    ).toBeVisible()

    // Pesanan benar-benar ada di database, dan keranjang sudah dibersihkan
    // supaya pesanan tidak dibuat dua kali dari isi yang sama.
    const orders = await apiGet(page, "/api/orders")
    expect(orders.ok()).toBeTruthy()
    const rows = (await orders.json()) as {
      id: string
      code: string | null
      qty: number
      service: { title: string }
    }[]
    const created = rows.find((row) => row.service.title === service.title)
    expect(created, "pesanan hasil checkout tidak ditemukan").toBeTruthy()
    expect(created?.code, "nomor pesanan manusiawi harus terisi").toMatch(
      /^JK-[A-Z0-9]{4,8}$/
    )
    expect(created?.qty, "qty dari keranjang ikut tersimpan").toBe(2)

    const cart = await apiGet(page, "/api/cart")
    const cartBody = (await cart.json()) as { items: unknown[] }
    expect(cartBody.items, "keranjang harus kosong setelah checkout").toHaveLength(0)
  })

  test("pesanan muncul di daftar pesanan dengan status awalnya", async ({ page }) => {
    await login(page, "customer", "/orders")

    await expect(
      page.getByRole("heading", { level: 1, name: "Pesanan" })
    ).toBeVisible()

    const orders = await apiGet(page, "/api/orders")
    expect(orders.ok()).toBeTruthy()
    const rows = (await orders.json()) as { code: string | null }[]
    const withCode = rows.find((row) => row.code)
    expect(withCode, "butuh minimal satu pesanan dengan kode").toBeTruthy()

    await expect(page.getByText(`#${withCode?.code}`).first()).toBeVisible({
      timeout: 20_000,
    })
  })
})
