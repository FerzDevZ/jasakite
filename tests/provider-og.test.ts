import { describe, expect, it } from "vitest"
import {
  buildFallbackProviderOgViewModel,
  buildProviderOgViewModel,
  type ProviderOgInput,
} from "@/lib/provider-og"

/**
 * Kontrak kartu OG image per penyedia.
 *
 * Angka di kartu harus berasal dari agregat (jumlah jasa ACTIVE, seluruh
 * ulasan), bukan panjang daftar yang dibatasi `take` di halaman profil.
 * Avatar non-http tidak boleh masuk ke satori, alamat panjang dipotong, dan
 * monogram memakai inisial nama seperti avatar fallback di halaman profil.
 *
 * Sinyal kepercayaan ("12 pesanan selesai") dan QR ikut diuji di sini karena
 * keduanya diklaim di kartu: satu angka yang tidak punya sumbernya adalah klaim
 * kosong, dan QR yang menunjuk halaman yang tidak ada hanya menyesatkan orang
 * yang memindainya.
 */

const SITE_URL = "https://jasakite.example"

const PROVIDER_INPUT: ProviderOgInput = {
  name: "Budi Santoso",
  location: "Jl. Melati No.12, Pangkal Pinang",
  avatarUrl: "https://i.pravatar.cc/300?img=12",
  ratingAvg: 4.722222222222222,
  totalReviews: 18,
  serviceCount: 5,
  completedOrders: 34,
  shareUrl: "https://jasakite.example/provider/507f1f77bcf86cd799439011",
}

describe("buildProviderOgViewModel", () => {
  it("membangun kartu lengkap: badge, jasa aktif, rating, alamat, avatar", () => {
    const viewModel = buildProviderOgViewModel(PROVIDER_INPUT, SITE_URL)

    expect(viewModel.title).toBe("Budi Santoso")
    expect(viewModel.badgeLabel).toBe("PENYEDIA JASA")
    expect(viewModel.highlightLabel).toBe("5 jasa aktif")
    expect(viewModel.ratingLabel).toBe("4,7 · 18 ulasan")
    expect(viewModel.locationLabel).toBe("Jl. Melati No.12, Pangkal Pinang")
    expect(viewModel.imageSrc).toBe("https://i.pravatar.cc/300?img=12")
    expect(viewModel.monogram).toBe("B")
    expect(viewModel.trustLabel).toBe("34 pesanan selesai")
    expect(viewModel.qrValue).toBe(
      "https://jasakite.example/provider/507f1f77bcf86cd799439011"
    )
    expect(viewModel.qrLabel).toBe("Pindai untuk buka")
  })

  it("memisahkan ribuan pada angka kepercayaan dan menyembunyikannya saat nol", () => {
    expect(
      buildProviderOgViewModel(
        { ...PROVIDER_INPUT, completedOrders: 1_250 },
        SITE_URL
      ).trustLabel
    ).toBe("1.250 pesanan selesai")

    // "0 pesanan selesai" bukan bukti kepercayaan: badge-nya disembunyikan.
    expect(
      buildProviderOgViewModel(
        { ...PROVIDER_INPUT, completedOrders: 0 },
        SITE_URL
      ).trustLabel
    ).toBeNull()
  })

  it("memakai inisial nama dalam huruf besar", () => {
    const viewModel = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, name: "siti rahayu" },
      SITE_URL
    )

    expect(viewModel.monogram).toBe("S")
  })

  it("memakai judul & monogram fallback saat nama kosong atau null", () => {
    const kosong = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, name: "   " },
      SITE_URL
    )
    expect(kosong.title).toBe("Penyedia Jasa")
    expect(kosong.monogram).toBe("P")

    const nullNama = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, name: null },
      SITE_URL
    )
    expect(nullNama.title).toBe("Penyedia Jasa")
    expect(nullNama.monogram).toBe("P")
  })

  it("menyembunyikan rating saat belum ada ulasan", () => {
    const viewModel = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, totalReviews: 0, ratingAvg: 0 },
      SITE_URL
    )

    expect(viewModel.ratingLabel).toBeNull()
  })

  it("menyembunyikan pill jumlah jasa saat belum ada jasa aktif", () => {
    const viewModel = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, serviceCount: 0 },
      SITE_URL
    )

    expect(viewModel.highlightLabel).toBeNull()
  })

  it("memotong nama panjang dengan elipsis dan mengecilkan fontnya", () => {
    const viewModel = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, name: "N".repeat(120) },
      SITE_URL
    )

    expect(viewModel.title).toHaveLength(76)
    expect(viewModel.title.endsWith("…")).toBe(true)
    expect(viewModel.titleFontSize).toBe(36)
  })

  it("memotong alamat panjang agar baris bawah tidak menabrak tepi", () => {
    const viewModel = buildProviderOgViewModel(
      {
        ...PROVIDER_INPUT,
        location: "Jl. Raya Pantai Parigi KM 12 No. 345, Kabupaten Bangka Barat",
      },
      SITE_URL
    )

    expect(viewModel.locationLabel).toHaveLength(40)
    expect(viewModel.locationLabel?.endsWith("…")).toBe(true)
  })

  it("menyembunyikan alamat kosong", () => {
    const viewModel = buildProviderOgViewModel(
      { ...PROVIDER_INPUT, location: "  " },
      SITE_URL
    )

    expect(viewModel.locationLabel).toBeNull()
  })

  it("mengabsolutkan avatar relatif dan menolak yang bukan http", () => {
    expect(
      buildProviderOgViewModel(
        { ...PROVIDER_INPUT, avatarUrl: "/uploads/avatar.jpg" },
        SITE_URL
      ).imageSrc
    ).toBe("https://jasakite.example/uploads/avatar.jpg")

    expect(
      buildProviderOgViewModel(
        { ...PROVIDER_INPUT, avatarUrl: "data:image/png;base64,AAAA" },
        SITE_URL
      ).imageSrc
    ).toBeNull()
  })
})

describe("buildFallbackProviderOgViewModel", () => {
  it("menyembunyikan statistik dan foto saat penyedia tidak ditemukan", () => {
    const viewModel = buildFallbackProviderOgViewModel()

    expect(viewModel.title).toContain("sekitar Anda")
    expect(viewModel.badgeLabel).toBe("PENYEDIA JASA")
    expect(viewModel.highlightLabel).toBeNull()
    expect(viewModel.ratingLabel).toBeNull()
    expect(viewModel.imageSrc).toBeNull()
    expect(viewModel.monogram).toBe("P")
    // Tanpa entitas, tidak ada angka kepercayaan yang boleh diklaim dan tidak
    // ada halaman penyedia yang layak di-QR.
    expect(viewModel.trustLabel).toBeNull()
    expect(viewModel.qrValue).toBeNull()
    expect(viewModel.qrLabel).toBeNull()
  })
})
