import { describe, expect, it } from "vitest"
import {
  breadcrumbJsonLd,
  providerJsonLd,
  serializeJsonLd,
  serviceJsonLd,
} from "@/lib/structured-data"

/**
 * Kontrak data terstruktur (JSON-LD) untuk halaman publik.
 *
 * Angka di `aggregateRating` harus angka sebenarnya dan hanya muncul saat ada
 * ulasan — melanggar itu membuat markup ditolak Google. URL gambar juga wajib
 * http(s): avatar/foto unggahan disimpan sebagai data-URI base64 dan tidak
 * boleh ikut membengkakkan HTML.
 */

const SITE_URL = "https://jasakite.example"

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Nilai yang diperiksa bukan objek JSON-LD")
  }
  return value as Record<string, unknown>
}

const SERVICE_INPUT = {
  title: "Antar Paket Dokumen Pangkal Pinang",
  description: "Antar dokumen dan paket kecil se-Kota Pangkal Pinang dengan motor.",
  categoryName: "Jasa Antar",
  url: `${SITE_URL}/service/antar-paket-dokumen-pangkal-pinang`,
  imageUrl: "https://images.unsplash.com/photo-kurir.jpg",
  providerName: "Budi Santoso",
  providerUrl: `${SITE_URL}/provider/507f1f77bcf86cd799439011`,
  price: 350000,
  ratingAvg: 4.7,
  totalReviews: 12,
}

const PROVIDER_INPUT = {
  name: "Siti Rahayu",
  bio: "Kurir dan titip beli area Sungailiat sejak 2015.",
  location: "Sungailiat, Bangka",
  avatarUrl: "https://images.unsplash.com/avatar.jpg",
  url: `${SITE_URL}/provider/507f1f77bcf86cd799439011`,
  ratingAvg: 4.9,
  totalReviews: 31,
  services: [
    {
      title: "Titip Beli Obat Sungailiat",
      url: `${SITE_URL}/service/titip-beli-obat-sungailiat`,
      price: 25000,
      categoryName: "Jasa Titip",
    },
  ],
}

describe("breadcrumbJsonLd", () => {
  it("memberi nomor posisi berurutan mulai dari 1", () => {
    const node = breadcrumbJsonLd([
      { name: "Beranda", url: `${SITE_URL}/` },
      { name: "Jasa Antar", url: `${SITE_URL}/services?category=abc` },
      { name: "Antar Paket Toboali", url: `${SITE_URL}/service/antar-paket-toboali` },
    ])
    const items = node.itemListElement as Record<string, unknown>[]

    expect(node["@type"]).toBe("BreadcrumbList")
    expect(items.map((item) => item.position)).toEqual([1, 2, 3])
    expect(items[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Jasa Antar",
      item: `${SITE_URL}/services?category=abc`,
    })
  })

  it("menghasilkan daftar kosong bila tidak ada item", () => {
    expect(breadcrumbJsonLd([]).itemListElement).toEqual([])
  })
})

describe("serviceJsonLd", () => {
  it("memuat inti Service: harga IDR, wilayah, dan penyedia", () => {
    const node = serviceJsonLd(SERVICE_INPUT)

    expect(node["@type"]).toBe("Service")
    expect(node.serviceType).toBe("Jasa Antar")
    expect(node.url).toBe(SERVICE_INPUT.url)
    expect(node.image).toBe(SERVICE_INPUT.imageUrl)
    expect(node.areaServed).toEqual({ "@type": "Country", name: "Indonesia" })
    expect(node.provider).toEqual({
      "@type": "Organization",
      name: "Budi Santoso",
      url: SERVICE_INPUT.providerUrl,
    })

    const offers = asRecord(node.offers)
    expect(offers.price).toBe(350000)
    expect(offers.priceCurrency).toBe("IDR")
    expect(offers.availability).toBe("https://schema.org/InStock")
    expect(offers.url).toBe(SERVICE_INPUT.url)
  })

  it("menyertakan AggregateRating hanya saat ada ulasan", () => {
    const withReviews = serviceJsonLd(SERVICE_INPUT)
    expect(withReviews.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.7,
      reviewCount: 12,
      bestRating: 5,
      worstRating: 1,
    })

    const withoutReviews = serviceJsonLd({
      ...SERVICE_INPUT,
      ratingAvg: 0,
      totalReviews: 0,
    })
    expect(withoutReviews.aggregateRating).toBeUndefined()
    // Harus benar-benar hilang setelah serialisasi, bukan sekadar undefined.
    const serialized = JSON.parse(serializeJsonLd(withoutReviews))
    expect(serialized).not.toHaveProperty("aggregateRating")
  })

  it("tetap memberi nama penyedia saat nama kosong", () => {
    const node = serviceJsonLd({ ...SERVICE_INPUT, providerName: null })
    expect(asRecord(node.provider).name).toBe("Penyedia JASAKITE")
  })

  it("menolak gambar non-http agar data-URI unggahan tidak masuk HTML", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo="
    expect(serviceJsonLd({ ...SERVICE_INPUT, imageUrl: dataUri }).image).toBeUndefined()
    expect(serviceJsonLd({ ...SERVICE_INPUT, imageUrl: null }).image).toBeUndefined()
  })
})

describe("providerJsonLd", () => {
  it("membungkus LocalBusiness dalam ProfilePage", () => {
    const node = providerJsonLd(PROVIDER_INPUT)
    const mainEntity = asRecord(node.mainEntity)

    expect(node["@type"]).toBe("ProfilePage")
    expect(node.url).toBe(PROVIDER_INPUT.url)
    expect(mainEntity["@type"]).toBe("LocalBusiness")
    expect(mainEntity.name).toBe("Siti Rahayu")
    expect(mainEntity.description).toBe(PROVIDER_INPUT.bio)
    expect(mainEntity.image).toBe(PROVIDER_INPUT.avatarUrl)
    expect(mainEntity.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Sungailiat, Bangka",
      addressCountry: "ID",
    })
    expect(mainEntity.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.9,
      reviewCount: 31,
      bestRating: 5,
      worstRating: 1,
    })
  })

  it("membulatkan rating ke satu desimal seperti tampilan UI", () => {
    const node = providerJsonLd({
      ...PROVIDER_INPUT,
      ratingAvg: 4.722222222222222,
    })
    expect(asRecord(node.mainEntity).aggregateRating).toMatchObject({
      ratingValue: 4.7,
    })
  })

  it("memetakan jasa aktif menjadi penawaran Offer+Service", () => {
    const node = providerJsonLd(PROVIDER_INPUT)
    const offers = asRecord(node.mainEntity).makesOffer as Record<string, unknown>[]

    expect(offers).toHaveLength(1)
    expect(offers[0].price).toBe(25000)
    expect(offers[0].priceCurrency).toBe("IDR")
    expect(offers[0].itemOffered).toEqual({
      "@type": "Service",
      name: "Titip Beli Obat Sungailiat",
      category: "Jasa Titip",
      url: `${SITE_URL}/service/titip-beli-obat-sungailiat`,
    })
  })

  it("menghilangkan seluruh bagian opsional yang kosong", () => {
    const node = providerJsonLd({
      ...PROVIDER_INPUT,
      name: null,
      bio: null,
      location: null,
      avatarUrl: null,
      ratingAvg: 0,
      totalReviews: 0,
      services: [],
    })
    const mainEntity = asRecord(node.mainEntity)

    expect(node.name).toBe("Penyedia JASAKITE — Penyedia Jasa")
    expect(mainEntity.name).toBe("Penyedia JASAKITE")
    expect(mainEntity.description).toBeUndefined()
    expect(mainEntity.image).toBeUndefined()
    expect(mainEntity.address).toBeUndefined()
    expect(mainEntity.aggregateRating).toBeUndefined()
    expect(mainEntity.makesOffer).toBeUndefined()
  })

  it("menolak avatar data-URI", () => {
    const node = providerJsonLd({
      ...PROVIDER_INPUT,
      avatarUrl: "data:image/png;base64,iVBORw0KGgo=",
    })
    expect(asRecord(node.mainEntity).image).toBeUndefined()
  })
})

describe("serializeJsonLd", () => {
  it("meng-escape '<' agar teks pengguna tidak menutup tag script", () => {
    const serialized = serializeJsonLd({
      description: "</script><script>alert(1)</script>",
    })
    expect(serialized).not.toContain("</script>")
    expect(serialized).toContain("\\u003c")
  })

  it("tetap bisa di-parse dan isinya utuh", () => {
    const nodes = [serviceJsonLd(SERVICE_INPUT), breadcrumbJsonLd([])]
    expect(JSON.parse(serializeJsonLd(nodes))).toEqual([
      JSON.parse(JSON.stringify(nodes[0])),
      JSON.parse(JSON.stringify(nodes[1])),
    ])
  })
})
