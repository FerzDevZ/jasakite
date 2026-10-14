import { describe, expect, it } from "vitest"
import { cn, formatIDR } from "@/lib/utils"

describe("formatIDR", () => {
  it("memformat angka sebagai rupiah tanpa desimal", () => {
    const out = formatIDR(150000)
    expect(out).toContain("150.000")
    expect(out).toMatch(/Rp/)
    expect(out).not.toContain(",00")
  })

  it("menangani nilai nol", () => {
    expect(formatIDR(0)).toContain("0")
  })

  it("membulatkan pecahan ke bilangan bulat", () => {
    expect(formatIDR(99999.6)).toContain("100.000")
  })
})

describe("cn", () => {
  it("menggabungkan kelas dan membuang nilai falsy", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c")
  })

  it("kelas Tailwind yang bertabrakan diselesaikan oleh yang terakhir", () => {
    expect(cn("px-2", "px-4")).toBe("px-4")
  })
})
