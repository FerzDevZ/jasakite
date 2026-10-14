import { defineConfig, devices } from "@playwright/test"

/**
 * Konfigurasi E2E.
 *
 * Menjalankan build produksi (`npm run start:e2e`), bukan `next dev`: dev server
 * punya perilaku berbeda soal caching, streaming, dan error overlay, sehingga
 * bug yang hanya muncul di produksi bisa lolos kalau diuji lewat dev.
 *
 * Build E2E memakai folder keluaran sendiri (`.next-e2e`, lihat next.config.mjs)
 * supaya bisa berjalan tanpa mematikan `next dev` milik pengembang. Sebelumnya
 * keduanya berbagi `.next` dan saling menimpa: server E2E kehilangan berkas
 * CSS/JS-nya, sementara tab dev dipenuhi error 404 untuk seluruh `/_next/`.
 * Siapkan build-nya dengan `npm run build:e2e` sebelum menjalankan suite.
 */
const PORT = Number(process.env.E2E_PORT ?? 3130)
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: "./e2e",
  // Alur pesanan mengubah data bersama (status order, review). Menjalankannya
  // paralel membuat test saling menimpa, jadi dijalankan berurutan.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "id-ID",
    // Hormati mode reduced-motion milik aplikasi sendiri (globals.css
    // menetapkan `scroll-behavior: auto !important` di bawah media query ini).
    //
    // Tanpa ini, `scroll-behavior: smooth` membuat halaman masih bergerak
    // ~500ms setelah setiap scroll. Koordinat yang diukur di sela animasi basi
    // sampai ratusan piksel: klik/drag mendarat di elemen yang salah, dan tes
    // gagal tanpa pesan apa pun dari aplikasi — tidak ada toast, tidak ada
    // error. Animasi yang deterministik juga menghapus confetti saat drag
    // selesai (komponennya sudah melewati jalur reduced-motion) sehingga tidak
    // ada kanvas yang menutupi interaksi.
    contextOptions: { reducedMotion: "reduce" },
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-320", use: { ...devices["Pixel 5"] } },
    // iPhone SE memakai WebKit. CI hanya memasang Chromium (`playwright
    // install --with-deps chromium`), dan mesin pengembang pun belum tentu
    // memasang WebKit — jadi project ini opt-in lewat E2E_WEBKIT=1 setelah
    // `npx playwright install webkit`. Tanpa ini `npm run test:e2e` gagal
    // launch di hampir semua mesin, padahal dua project pertama sehat.
    ...(process.env.E2E_WEBKIT === "1"
      ? [{ name: "iphone-se", use: { ...devices["iPhone SE"] } }]
      : []),
  ],

  webServer: {
    command: `npm run start:e2e -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_TRUST_HOST: "true",
      NEXTAUTH_URL: BASE_URL,
      // Auth.js v5 mengutamakan AUTH_URL, dan .env proyek mengisinya dengan
      // http://localhost:3000. Tanpa override ini server menganggap originnya
      // localhost, sehingga signIn() mengembalikan URL absolut ber-origin lain;
      // pembersih callbackUrl menolaknya dan tujuan setelah login hilang.
      AUTH_URL: BASE_URL,
    },
  },
})
