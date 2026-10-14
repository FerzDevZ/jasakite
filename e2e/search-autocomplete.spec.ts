import { expect, test } from "@playwright/test"

/**
 * Search autocomplete — 6 kasus.
 * Menguji SearchBar (Navbar) + hero-search yang share /api/search-suggestions.
 * Endpoint sudah di-rate-limit dan dedup by title.
 */

test.describe("search autocomplete", () => {
  test("1 char → hint 'Ketik minimal 2 huruf'", async ({ page }) => {
    await page.goto("/")
    // fokus input desktop; di mobile fallback ke tombol cari
    const desktopInput = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    const mobileTrigger = page.getByRole("button", { name: /Cari jasa/i }).first()
    if (await desktopInput.isVisible().catch(() => false)) {
      await desktopInput.click()
      await desktopInput.fill("A")
      // panel suggestions muncul dengan hint
      await expect(page.getByText(/Ketik minimal 2 huruf/i).first()).toBeVisible({ timeout: 10_000 })
    } else {
      await mobileTrigger.click()
      const mobileInput = page.getByRole("combobox", { name: /Cari jasa/i }).last()
      await mobileInput.fill("A")
      await expect(page.getByText(/Ketik minimal 2 huruf/i).first()).toBeVisible({ timeout: 10_000 })
    }
  })

  test("2 char 'AC' → listbox muncul dengan saran", async ({ page }) => {
    await page.goto("/")
    const input = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    if (!(await input.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /Cari jasa/i }).first().click()
    }
    const target = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    await target.click()
    await target.fill("AC")
    // tunggu debounce 250ms + fetch
    const listbox = page.getByRole("listbox").first()
    await expect(listbox).toBeVisible({ timeout: 15_000 })
    const options = listbox.getByRole("option")
    await expect(options.first()).toBeVisible({ timeout: 10_000 })
    expect(await options.count()).toBeGreaterThan(0)
    expect(await options.count()).toBeLessThanOrEqual(6)
  })

  test("ArrowDown + Enter → navigasi ke /service/[slug]", async ({ page }) => {
    await page.goto("/")
    const input = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    if (!(await input.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /Cari jasa/i }).first().click()
    }
    const target = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    await target.click()
    await target.fill("AC")
    const listbox = page.getByRole("listbox").first()
    await expect(listbox).toBeVisible({ timeout: 15_000 })
    await expect(listbox.getByRole("option").first()).toBeVisible({ timeout: 10_000 })

    await target.press("ArrowDown")
    // option kedua harus ter-highlight (aria-selected true) atau bg-accent
    const second = listbox.getByRole("option").nth(1)
    if ((await second.count()) > 0) {
      await expect(second).toHaveAttribute("aria-selected", "true")
    }
    await target.press("Enter")
    await expect(page).toHaveURL(/\/service\//, { timeout: 15_000 })
  })

  test("dedup — judul sama hanya muncul sekali (case-insensitive)", async ({ page, request }) => {
    // cek via API langsung agar tidak bergantung UI
    const res = await request.get("/api/search-suggestions?q=AC")
    expect(res.ok()).toBeTruthy()
    const { suggestions } = (await res.json()) as { suggestions: { title: string; slug: string }[] }
    const keys = suggestions.map((s) => s.title.trim().toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
    // juga validasi via UI: tidak ada duplikat visible
    await page.goto("/")
    const input = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    if (!(await input.isVisible().catch(() => false))) {
      await page.getByRole("button", { name: /Cari jasa/i }).first().click()
    }
    const target = page.getByRole("combobox", { name: /Cari jasa/i }).first()
    await target.click()
    await target.fill("AC")
    const listbox = page.getByRole("listbox").first()
    await expect(listbox).toBeVisible({ timeout: 15_000 })
    const texts = await listbox.getByRole("option").allTextContents()
    const lowered = texts.map((t) => t.trim().toLowerCase())
    expect(new Set(lowered).size).toBe(lowered.length)
  })

  test("q kosong → suggestions [] (API)", async ({ request }) => {
    for (const q of ["", " ", "%20"]) {
      const res = await request.get(`/api/search-suggestions?q=${encodeURIComponent(q)}`)
      expect(res.ok()).toBeTruthy()
      const { suggestions } = (await res.json()) as { suggestions: unknown[] }
      expect(suggestions).toEqual([])
    }
  })

  test("q 1 char via API → [] (hint, bukan list)", async ({ request }) => {
    const res = await request.get("/api/search-suggestions?q=A")
    expect(res.ok()).toBeTruthy()
    const { suggestions } = (await res.json()) as { suggestions: unknown[] }
    expect(suggestions).toEqual([])
  })
})
