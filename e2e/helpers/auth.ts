import { expect, type Page } from "@playwright/test"

/**
 * Akun dari prisma/seed.js. Password seragam untuk semua akun seed.
 * Ini kredensial pengembangan, bukan rahasia produksi.
 */
export const ACCOUNTS = {
  customer: {
    email: "dewi.lestari@email.com",
    password: "password123",
    name: "Dewi Lestari",
  },
  provider: {
    email: "budi.santoso@email.com",
    password: "password123",
    name: "Budi Santoso",
  },
  admin: {
    email: "admin@jasakite.id",
    password: "password123",
    name: "Admin JASAKITE",
  },
} as const

const ROLE_BY_ACCOUNT = {
  customer: "CUSTOMER",
  provider: "PROVIDER",
  admin: "ADMIN",
} as const

/**
 * Tandai modal sambutan sebagai sudah dilihat untuk role ini.
 *
 * `WelcomeModal` muncul sekali per role lewat localStorage, dan setiap tes
 * mendapat konteks browser baru yang localStorage-nya kosong — jadi modal
 * selalu terbuka pada kunjungan dashboard pertama. Radix Dialog menyetel
 * `aria-hidden` pada seluruh konten di luar modal, sehingga `getByRole` tidak
 * menemukan heading halaman SAMA SEKALI ("element(s) not found"), bukan sekadar
 * menganggapnya tidak terlihat.
 *
 * Akibatnya tes dashboard gagal bukan karena halamannya salah, melainkan
 * karena halamannya tersembunyi di balik modal yang tidak sedang diuji.
 * `addInitScript` berjalan sebelum skrip halaman pada setiap navigasi, jadi
 * bendera ini terpasang sebelum React sempat merender modal.
 */
async function suppressWelcomeModal(page: Page, role: string) {
  await page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, "true")
    } catch {
      // Konteks about:blank tidak punya localStorage — tidak masalah.
    }
  }, `jasakite-welcomed-${role}`)
}

/**
 * Masuk lewat form login sungguhan, bukan menyuntik cookie sesi.
 *
 * Alasannya: alur kredensial NextAuth (signIn → set cookie → router.refresh)
 * adalah bagian yang ingin diuji. Menyuntik cookie akan melewati justru bagian
 * yang paling mungkin rusak saat konfigurasi auth berubah.
 */
export async function login(
  page: Page,
  account: keyof typeof ACCOUNTS,
  callbackUrl = "/dashboard"
) {
  const { email, password } = ACCOUNTS[account]

  // Cookie WAJIB dibersihkan dulu. Kalau sesi lama masih ada, middleware
  // me-redirect /login ke /dashboard sebelum form tampil — login() lolos tanpa
  // benar-benar berganti akun, dan test berikutnya berjalan sebagai user yang
  // salah. Ini yang membuat langkah customer sebelumnya tereksekusi dengan
  // sesi provider.
  await page.context().clearCookies()

  await suppressWelcomeModal(page, ROLE_BY_ACCOUNT[account])

  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)

  // Selector di-scope ke <form>, bukan ke seluruh halaman: navbar punya tombol
  // "Masuk" sendiri dan footer punya tautan ber-aria-label "Kirim email ke
  // JASAKITE", jadi getByLabel("Email") maupun getByRole("button",
  // { name: "Masuk" }) sama-sama ambigu di level page.
  const form = page.locator("form").filter({ has: page.locator("input#email") })

  // Tunggu form benar-benar visible (Suspense fallback bisa muncul dulu)
  await expect(form.locator("input#email")).toBeVisible({ timeout: 15_000 })
  await expect(form.locator("input#password")).toBeVisible()

  await form.locator("input#email").fill(email)
  await form.locator("input#password").fill(password)
  await form.getByRole("button", { name: "Masuk" }).click()

  // Login berhasil bila kita meninggalkan /login. Menunggu URL, bukan elemen,
  // karena halaman tujuan berbeda per role.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })

  await waitForSettledUrl(page)
}

/**
 * Tunggu URL berhenti berubah.
 *
 * Setelah login, middleware mengarahkan /dashboard ke bentuk per peran, lalu
 * halaman mengalihkan sekali lagi secara klien. `login()` hanya memverifikasi
 * "sudah bukan /login", sehingga navigasi lanjutan itu MASIH BERJALAN ketika tes
 * memanggil page.goto() atau page.evaluate(). Akibatnya tes gagal sebelum
 * menyentuh aplikasinya, dengan gejala yang menyesatkan:
 * "Navigation is interrupted by another navigation" atau
 * "Execution context was destroyed, most likely because of a navigation".
 */
async function waitForSettledUrl(page: Page): Promise<string> {
  let previous = ""
  for (let attempt = 0; attempt < 24; attempt++) {
    const current = page.url()
    if (current === previous && current !== "about:blank") return current
    previous = current
    await page.waitForTimeout(250)
  }
  return page.url()
}

export async function logout(page: Page) {
  await page.goto("/dashboard")
  const signOut = page.getByRole("button", { name: /Keluar dari Akun/i })
  if (await signOut.isVisible().catch(() => false)) {
    await signOut.click()
    await expect(page).toHaveURL(/\/$/, { timeout: 20_000 })
  } else {
    // Drawer mobile / layout berbeda: bersihkan cookie sebagai cadangan.
    await page.context().clearCookies()
  }
}
