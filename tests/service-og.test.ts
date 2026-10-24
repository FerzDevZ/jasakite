import { describe, expect, it } from "vitest"
import { ogTitleFontSize, resolveOgImageUrl } from "@/lib/og-card"
import {
  buildFallbackOgViewModel,
  buildServiceOgViewModel,
  type ServiceOgInput,
} from "@/lib/service-og"

/**
 * Kontrak kartu OG image per jasa.
 *
 * Foto yang masuk ke satori wajib http(s) absolut — data-URI membebani PNG dan
 * protokol lain tidak bisa digambar. Judul dipotong + font diskalakan agar
 * kartu 1200×630 tidak meluber. Rating hanya muncul saat ada ulasan, dan URL
 * foto relatif harus diabsolutkan ke SITE_URL kanonik.
 *
 * `resolveOgImageUrl` & `ogTitleFontSize` diuji di sini karena keduanya
 * primitif bersama kartu OG (`@/lib/og-card`), bukan milik jasa saja.
 */

const SITE_URL = "https://jasakite.example"

const SERVICE_INPUT: ServiceOgInput = {
  title: "Antar Paket Dokumen Pangkal Pinang",
  categoryName: "Jasa Antar",
  price: 150000,
  ratingAvg: 4.7,
  totalReviews: 18,
  imageUrl: "https://images.unsplash.com/photo-kurir.jpg",
  providerName: "Budi Santoso",
  providerCity: "Pangkal Pinang",
  completedOrders: 12,
  shareUrl: "https://jasakite.example/service/antar-paket-dokumen-pangkal-pinang",
}

describe("resolveOgImageUrl", () => {
  it("mempertahankan URL http(s) remote apa adanya", () => {
    expect(resolveOgImageUrl(SERVICE_INPUT.imageUrl, SITE_URL)).toBe(
      "https://images.unsplash.com/photo-kurir.jpg"
    )
  })

  it("mengabsolutkan path relatif ke SITE_URL", () => {
    expect(resolveOgImageUrl("/uploads/paket.jpg", SITE_URL)).toBe(
      "https://jasakite.example/uploads/paket.jpg"
    )
  })

  it("menolak data-URI dan protokol tak aman", () => {
    expect(resolveOgImageUrl("data:image/png;base64,AAAA", SITE_URL)).toBeNull()
    expect(resolveOgImageUrl("javascript:alert(1)", SITE_URL)).toBeNull()
    expect(resolveOgImageUrl("blob:https://x/y", SITE_URL)).toBeNull()
  })

  it("mengembalikan null untuk nilai kosong", () => {
    expect(resolveOgImageUrl(null, SITE_URL)).toBeNull()
    expect(resolveOgImageUrl("   ", SITE_URL)).toBeNull()
  })
})

describe("ogTitleFontSize", () => {
  it("mengecilkan font seiring judul memanjang", () => {
    expect(ogTitleFontSize(20)).toBe(64)
    expect(ogTitleFontSize(40)).toBe(54)
    expect(ogTitleFontSize(60)).toBe(44)
    expect(ogTitleFontSize(76)).toBe(36)
  })
})

describe("buildServiceOgViewModel", () => {
  it("membangun kartu lengkap: kategori kapital, harga, rating, penyedia", () => {
    const viewModel = buildServiceOgViewModel(SERVICE_INPUT, SITE_URL)

    expect(viewModel.title).toBe("Antar Paket Dokumen Pangkal Pinang")
    expect(viewModel.categoryLabel).toBe("JASA ANTAR")
    expect(viewModel.priceLabel).toContain("150.000")
    expect(viewModel.ratingLabel).toBe("4,7 · 18 ulasan")
    expect(viewModel.providerLabel).toBe("Budi Santoso · Pangkal Pinang")
    expect(viewModel.imageSrc).toBe(
      "https://images.unsplash.com/photo-kurir.jpg"
    )
    expect(viewModel.trustLabel).toBe("12 pesanan selesai")
    // QR menunjuk halaman yang sedang dibagikan — bukan halaman depan, yang
    // membuat pemindai mendarat di tempat yang tidak dilihatnya di kartu.
    expect(viewModel.qrValue).toBe(
      "https://jasakite.example/service/antar-paket-dokumen-pangkal-pinang"
    )
    expect(viewModel.qrLabel).toBe("Pindai untuk buka")
  })

  it("menyembunyikan label kepercayaan saat belum ada pesanan selesai", () => {
    const viewModel = buildServiceOgViewModel(
      { ...SERVICE_INPUT, completedOrders: 0 },
      SITE_URL
    )

    expect(viewModel.trustLabel).toBeNull()
  })

  it("memotong judul panjang dengan elipsis dan mengecilkan fontnya", () => {
    const viewModel = buildServiceOgViewModel(
      { ...SERVICE_INPUT, title: "J".repeat(120) },
      SITE_URL
    )

    expect(viewModel.title).toHaveLength(76)
    expect(viewModel.title.endsWith("…")).toBe(true)
    expect(viewModel.titleFontSize).toBe(36)
  })

  it("menyembunyikan rating saat belum ada ulasan", () => {
    const viewModel = buildServiceOgViewModel(
      { ...SERVICE_INPUT, totalReviews: 0, ratingAvg: 0 },
      SITE_URL
    )

    expect(viewModel.ratingLabel).toBeNull()
  })

  it("mengabaikan kota provider yang kosong", () => {
    const viewModel = buildServiceOgViewModel(
      { ...SERVICE_INPUT, providerCity: null },
      SITE_URL
    )

    expect(viewModel.providerLabel).toBe("Budi Santoso")
  })
})

describe("buildFallbackOgViewModel", () => {
  it("menyembunyikan harga dan foto saat jasa tidak ditemukan", () => {
    const viewModel = buildFallbackOgViewModel()

    expect(viewModel.priceLabel).toBeNull()
    expect(viewModel.ratingLabel).toBeNull()
    expect(viewModel.imageSrc).toBeNull()
    expect(viewModel.title).toContain("sekitar Anda")
    // Kartu fallback tidak mewakili jasa apa pun: tidak ada angka kepercayaan
    // dan tidak ada halaman jasa yang layak dikodekan jadi QR.
    expect(viewModel.trustLabel).toBeNull()
    expect(viewModel.qrValue).toBeNull()
    expect(viewModel.qrLabel).toBeNull()
  })
})
