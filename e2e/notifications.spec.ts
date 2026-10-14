import { expect, test } from "@playwright/test"
import { ACCOUNTS, login } from "./helpers/auth"
import { apiGet, createOrderWithProvider, patchJson } from "./helpers/api"

/**
 * Kotak masuk notifikasi (`/notifications`).
 *
 * Lonceng navbar hanya jendela cepat; halaman ini arsip lengkapnya. Alur yang
 * diuji adalah satu rantai peristiwa nyata: pelanggan membuat pesanan →
 * penyedia memindahkannya ke IN_PROGRESS (menulis notifikasi ke pihak NON-aktif)
 * → pelanggan melihatnya di kotak masuk, menandai semua dibaca, lalu saringan
 * "Belum dibaca" kosong.
 *
 * Dua sesi login berjalan paralel, sama seperti e2e/marketplace.spec.ts.
 */
test.describe.configure({ mode: "serial" })

test("peristiwa pesanan muncul di kotak masuk dan bisa ditandai sudah dibaca", async ({
  browser,
}) => {
  const customerCtx = await browser.newContext()
  const providerCtx = await browser.newContext()
  try {
    const customer = await customerCtx.newPage()
    const provider = await providerCtx.newPage()

    await login(customer, "customer", "/services")
    const orderId = await createOrderWithProvider(customer, ACCOUNTS.provider.name)
    if (!orderId) {
      test.skip(true, "gagal membuat pesanan uji")
      return
    }

    await login(provider, "provider", "/dashboard/provider")
    const patch = await patchJson(provider, `/api/orders/${orderId}`, {
      status: "IN_PROGRESS",
    })
    expect(patch.ok(), `PATCH /api/orders/${orderId} → ${patch.status()}`).toBeTruthy()

    // Kode pesanan membuat entri bisa dituju tepat: tes lain juga memindahkan
    // pesanan, jadi mencocokkan "mulai dikerjakan" semata bisa mengenai entri
    // lama yang status bacanya sudah berbeda.
    const detail = await apiGet(customer, `/api/orders/${orderId}`)
    expect(detail.ok(), `GET /api/orders/${orderId}`).toBeTruthy()
    const code = ((await detail.json()) as { code?: string | null }).code
    const title = code ? `Pesanan #${code} mulai dikerjakan` : "mulai dikerjakan"

    // Pelanggan melihat kabarnya. Notifikasi ditulis server SETELAH transaksi
    // pesanan commit, jadi begitu PATCH sukses barisnya sudah ada.
    await customer.goto("/notifications")
    await expect(
      customer.getByRole("heading", { level: 1, name: "Notifikasi" })
    ).toBeVisible()
    await expect(
      customer.getByRole("radiogroup", { name: "Saring notifikasi" })
    ).toBeVisible()

    const entry = customer.locator("ul li").filter({ hasText: title }).first()
    await expect(entry).toBeVisible({ timeout: 15_000 })
    await expect(entry.getByText("Penyedia sudah menerima", { exact: false })).toBeVisible()
    // Selama belum dibaca, kartunya ditandai titik "Belum dibaca".
    await expect(entry.locator('[aria-label="Belum dibaca"]')).toBeVisible()

    // Saringan belum-dibaca harus menampilkan entri yang sama — filter dikerjakan
    // di server (`?unread=1`), jadi kalau UI menyaring di klien, saringan ini
    // tetap lulus; kekosongannya justru terbukti di langkah terakhir.
    await customer.getByRole("radio", { name: /Belum dibaca/ }).click()
    await expect(customer.locator("ul li").filter({ hasText: title }).first()).toBeVisible()
    await customer.getByRole("radio", { name: "Semua", exact: true }).click()

    await customer.getByRole("button", { name: /Tandai semua dibaca/ }).click()

    // Label saran "Belum dibaca (N)" turun kembali ke tanpa angka = unread 0.
    await expect(customer.getByRole("radio", { name: "Belum dibaca", exact: true })).toBeVisible({
      timeout: 15_000,
    })
    await expect(entry.locator('[aria-label="Belum dibaca"]')).toHaveCount(0)

    // Saringan yang kini kosong harus mengatakan "Semua sudah dibaca",
    // bukan menampilkan daftar yang sudah tidak relevan.
    await customer.getByRole("radio", { name: "Belum dibaca", exact: true }).click()
    await expect(
      customer.getByRole("heading", { level: 2, name: "Semua sudah dibaca" })
    ).toBeVisible()
  } finally {
    await customerCtx.close()
    await providerCtx.close()
  }
})

test("pengunjung yang belum masuk diarahkan ke halaman masuk", async ({ page }) => {
  await page.goto("/notifications")
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  await expect(page).toHaveURL(/callbackUrl=%2Fnotifications|callbackUrl=\/notifications/)
})
