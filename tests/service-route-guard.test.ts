import { describe, expect, it } from "vitest"
import { isNonDocumentRequest, serviceSlugFromPath } from "@/lib/service-route-guard"

/**
 * Gerbang 404 rute jasa hidup di middleware, yang tidak bisa dipanggil langsung
 * dari unit test. Yang diuji di sini adalah bagian yang menentukan keputusan:
 * apakah path ini rute detail jasa, dan apakah permintaan ini menentukan status
 * dokumen.
 */
describe("serviceSlugFromPath", () => {
  it("mengambil slug dari rute detail", () => {
    expect(serviceSlugFromPath("/service/cuci-ac-rutin")).toBe("cuci-ac-rutin")
  })

  it("menerima garis miring penutup", () => {
    expect(serviceSlugFromPath("/service/cuci-ac-rutin/")).toBe("cuci-ac-rutin")
  })

  it("menolak segmen kedua seperti opengraph-image", () => {
    // Kartu OG harus tetap 200 dengan kartu fallback; kalau ikut digerbangi,
    // tautan yang dibagikan ke WhatsApp kehilangan preview-nya.
    expect(serviceSlugFromPath("/service/cuci-ac-rutin/opengraph-image")).toBeNull()
  })

  it("menolak halaman katalog dan path tanpa slug", () => {
    expect(serviceSlugFromPath("/service")).toBeNull()
    expect(serviceSlugFromPath("/services")).toBeNull()
    expect(serviceSlugFromPath("/services/cuci-ac-rutin")).toBeNull()
    expect(serviceSlugFromPath("/")).toBeNull()
  })

  it("men-decode persen encoding", () => {
    expect(serviceSlugFromPath("/service/cuci%2Dac")).toBe("cuci-ac")
  })

  it("menolak encoding rusak tanpa melempar", () => {
    expect(serviceSlugFromPath("/service/%E0%A4%A")).toBeNull()
  })

  it("menolak slug yang tidak mungkin ada di database", () => {
    expect(serviceSlugFromPath("/service/a%20b")).toBeNull()
    expect(serviceSlugFromPath("/service/-awalan")).toBeNull()
    expect(serviceSlugFromPath(`/service/${"a".repeat(200)}`)).toBeNull()
  })
})

describe("isNonDocumentRequest", () => {
  const noHeaders = () => new Headers()

  it("permintaan dokumen biasa tidak dilewati", () => {
    expect(isNonDocumentRequest(noHeaders(), new URLSearchParams())).toBe(false)
  })

  it("payload RSC dilewati", () => {
    expect(isNonDocumentRequest(noHeaders(), new URLSearchParams("_rsc=1a2b3c"))).toBe(true)
  })

  it("prefetch router dilewati", () => {
    const headers = new Headers({ "next-router-prefetch": "1" })
    expect(isNonDocumentRequest(headers, new URLSearchParams())).toBe(true)
  })

  it("prefetch middleware dilewati", () => {
    const headers = new Headers({ "x-middleware-prefetch": "1" })
    expect(isNonDocumentRequest(headers, new URLSearchParams())).toBe(true)
  })
})
