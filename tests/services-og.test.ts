import { describe, expect, it } from "vitest"
import {
  buildFallbackServicesOgViewModel,
  buildServicesOgViewModel,
  MAX_LISTING_CATEGORY_CHIPS,
  type ServicesOgInput,
} from "@/lib/services-og"

/**
 * Kontrak kartu OG halaman daftar jasa.
 *
 * Tiga hal diuji karena ketiganya menentukan apa yang dibaca orang di grup
 * WhatsApp: kategori mana yang dapat petak (yang paling banyak, bukan yang
 * kebetulan pertama di DB), berapa yang diringkas jadi "+N", dan apa yang
 * dikatakan kartu ketika datanya belum ada — nol yang ditampilkan sebagai
 * angka besar adalah klaim, bukan informasi.
 */

const SHARE_URL = "https://jasakite.example/services"

const INPUT: ServicesOgInput = {
  activeServiceCount: 247,
  categories: [
    { name: "Jasa Belanja", count: 41 },
    { name: "Jasa Antar", count: 96 },
    { name: "Jasa Pembayaran", count: 58 },
    { name: "Jasa Titip", count: 22 },
    { name: "Layanan Lain", count: 18 },
  ],
  regionLabel: "Kepulauan Bangka Belitung",
  shareUrl: SHARE_URL,
}

describe("buildServicesOgViewModel", () => {
  it("menampilkan angka jasa aktif apa adanya dan mengurutkan kategori", () => {
    const viewModel = buildServicesOgViewModel(INPUT)

    expect(viewModel.metricLabel).toBe("247")
    expect(viewModel.metricCaption).toBe("jasa aktif siap dipesan")
    expect(viewModel.chips.map((chip) => chip.label)).toEqual([
      "JASA ANTAR",
      "JASA PEMBAYARAN",
      "JASA BELANJA",
    ])
    expect(viewModel.chips[0].countLabel).toBe("96 jasa")
  })

  it("meringkas kategori di luar petak sebagai jumlah sisa", () => {
    const viewModel = buildServicesOgViewModel(INPUT)

    // Lima kategori, tiga dapat petak: sisanya dua, dan angkanya harus menyebut
    // sisa itu — bukan diam-diam menghilang.
    expect(viewModel.chips).toHaveLength(MAX_LISTING_CATEGORY_CHIPS)
    expect(viewModel.moreLabel).toBe("+2 kategori lain")
  })

  it("tidak menampilkan sisa saat semua kategori sudah dapat petak", () => {
    const viewModel = buildServicesOgViewModel({
      ...INPUT,
      categories: INPUT.categories.slice(0, 3),
    })

    expect(viewModel.chips).toHaveLength(3)
    expect(viewModel.moreLabel).toBeNull()
  })

  it("menyebut jumlah kategori dan wilayah di baris bawah", () => {
    const viewModel = buildServicesOgViewModel(INPUT)

    expect(viewModel.supportLabel).toBe("5 kategori · Kepulauan Bangka Belitung")
  })

  it("memformat ribuan pada angka besar", () => {
    const viewModel = buildServicesOgViewModel({
      ...INPUT,
      activeServiceCount: 1_480,
      categories: [{ name: "Jasa Belanja", count: 1_200 }],
    })

    expect(viewModel.metricLabel).toBe("1.480")
    expect(viewModel.chips[0].countLabel).toBe("1.200 jasa")
  })

  it("memakai kalimat merek, bukan angka nol, saat belum ada jasa aktif", () => {
    const viewModel = buildServicesOgViewModel({
      ...INPUT,
      activeServiceCount: 0,
      categories: [],
    })

    expect(viewModel.metricLabel).toBeNull()
    expect(viewModel.metricCaption).toBeNull()
    expect(viewModel.headlineLabel).toContain("sekitar Anda")
    expect(viewModel.chips).toEqual([])
    expect(viewModel.moreLabel).toBeNull()
    expect(viewModel.supportLabel).toBe("0 kategori · Kepulauan Bangka Belitung")
  })

  it("tidak memutasi daftar kategori milik pemanggil saat mengurutkan", () => {
    const categories = [...INPUT.categories]
    buildServicesOgViewModel({ ...INPUT, categories })

    expect(categories.map((category) => category.name)).toEqual([
      "Jasa Belanja",
      "Jasa Antar",
      "Jasa Pembayaran",
      "Jasa Titip",
      "Layanan Lain",
    ])
  })

  it("selalu memuat QR ke halaman daftar", () => {
    const viewModel = buildServicesOgViewModel(INPUT)

    expect(viewModel.qrValue).toBe(SHARE_URL)
    expect(viewModel.qrLabel).toBe("Pindai untuk buka")
  })
})

describe("buildFallbackServicesOgViewModel", () => {
  it("tidak mengklaim angka, tapi tetap mengarahkan ke halaman yang ada", () => {
    const viewModel = buildFallbackServicesOgViewModel({
      regionLabel: "Kepulauan Bangka Belitung",
      shareUrl: SHARE_URL,
    })

    expect(viewModel.metricLabel).toBeNull()
    expect(viewModel.chips).toEqual([])
    expect(viewModel.moreLabel).toBeNull()
    expect(viewModel.headlineLabel).toContain("sekitar Anda")
    expect(viewModel.supportLabel).toBe("Kepulauan Bangka Belitung")

    // Beda dari kartu entitas: halaman ini memang ada, jadi QR-nya bukan janji
    // kosong — justru satu-satunya yang masih bisa ditawarkan kartu fallback.
    expect(viewModel.qrValue).toBe(SHARE_URL)
  })
})
