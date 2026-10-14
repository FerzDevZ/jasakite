import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Pagar service worker (`public/sw.js`) dan pendaftarannya (`app/layout.tsx`).
 *
 * Dua kesalahan di area ini gejalanya menyesatkan — "Failed to load resource:
 * 404 (Not Found)" untuk SELURUH berkas `/_next/` di console, seolah servernya
 * rusak, padahal server sehat dan penyebabnya ada di sisi cache browser:
 *
 *  1. **Dokumen HTML disajikan cache-first.** Shell dari build sebelumnya
 *     menunjuk berkas `/_next/...` versi lama yang sudah tidak dilayani, jadi
 *     halaman gagal memuat CSS/JS-nya sendiri. Navigasi harus network-first.
 *  2. **Service worker didaftarkan di mode dev.** Nama berkas `/_next/...` di
 *     dev berubah setiap rekompilasi, sehingga cache dari tab sebelumnya
 *     menjamin 404 di tab berikutnya. Di dev, pendaftaran dilewati dan cache
 *     lama justru dibersihkan.
 *
 * Keduanya tidak terlihat dari unit test biasa dan tidak akan ketahuan sampai
 * ada orang membuka aplikasi dengan profil browser yang sudah pernah dipakai.
 */

const ROOT = process.cwd()
const swSource = readFileSync(join(ROOT, "public", "sw.js"), "utf8")
const layoutSource = readFileSync(join(ROOT, "app", "layout.tsx"), "utf8")

describe("service worker", () => {
  it("menaikkan versi cache supaya cache lama benar-benar dibuang", () => {
    const match = swSource.match(/const CACHE_NAME = '([^']+)'/)
    expect(match, "CACHE_NAME harus dideklarasikan").not.toBeNull()
    // `activate` hanya menghapus cache dengan nama berbeda — nama tetap berarti
    // pengguna lama terus memakai shell hasil strategi sebelumnya.
    expect(match![1]).toMatch(/^jasakite-v(\d+)$/)
    expect(Number(match![1].replace("jasakite-v", ""))).toBeGreaterThanOrEqual(2)
  })

  it("melewatkan berkas /_next/ dan /api/ sepenuhnya (selalu dari jaringan)", () => {
    expect(swSource).toContain("includes('/api/')")
    expect(swSource).toContain("includes('/_next/')")
  })

  it("memakai network-first untuk navigasi — cache-first hanya cadangan offline", () => {
    const navigationBranch = swSource.indexOf("mode === 'navigate'")
    expect(navigationBranch, "harus ada cabang khusus navigasi").toBeGreaterThan(-1)

    const firstCacheLookup = swSource.indexOf("caches.match")
    expect(firstCacheLookup, "harus ada pembacaan cache").toBeGreaterThan(-1)

    // Kalau pembacaan cache muncul SEBELUM cabang navigasi, berarti dokumen
    // masih dilayani cache-first dan badai 404 itu kembali.
    expect(
      firstCacheLookup,
      "caches.match harus berada setelah cabang navigasi, bukan sebelum"
    ).toBeGreaterThan(navigationBranch)

    // Fallback offline tetap harus ada di dalam cabang navigasi: cache rute
    // → halaman offline kustom → Response minimal inline (dino tidak pernah
    // terlihat).
    const navigationBlock = swSource.slice(navigationBranch)
    expect(navigationBlock).toContain(".catch(")
    expect(navigationBlock).toContain("caches.match('/offline.html')")
    expect(navigationBlock).toContain("new Response(")
  })

  it("memprecache halaman offline fallback", () => {
    // Tanpa precache, fallback tidak tersedia saat offline pertama kali.
    expect(swSource).toContain("'/offline.html'")
  })

  it("tidak menulis cache dari respons gagal", () => {
    // Respons 404 yang ikut tersimpan akan abadi sampai versi cache naik.
    expect(swSource).toContain("response.status === 200")
  })
})

describe("pendaftaran service worker di root layout", () => {
  it("hanya mendaftar di produksi", () => {
    expect(layoutSource).toContain("NODE_ENV === \"production\"")
    const registration = layoutSource.indexOf("serviceWorker.register")
    expect(registration, "pendaftaran sw.js harus ada").toBeGreaterThan(-1)

    // Pendaftaran harus berada di dalam cabang produksi: cari penanda produksi
    // terdekat SEBELUM baris register, dan pastikan cabang dev-nya membatalkan
    // service worker lama.
    const before = layoutSource.slice(0, registration)
    expect(before.lastIndexOf("isProduction")).toBeGreaterThan(-1)
    expect(layoutSource).toContain("unregister()")
    expect(layoutSource).toContain("caches.delete(")
  })
})
