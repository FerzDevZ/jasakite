import { describe, expect, it } from "vitest"
import { relativeNotificationTime } from "@/lib/notifications-feed"

/**
 * Label waktu di lonceng dihitung server (satu sumber untuk HTTP dan SSE).
 * Fungsi murni ini yang menentukan teksnya, jadi batas satuannya diuji di sini:
 * kesalahan ambang membuat notifikasi baru tertulis "0 menit lalu", bukan
 * "baru saja".
 */
describe("relativeNotificationTime", () => {
  const now = new Date("2026-10-24T12:00:00.000Z").getTime()
  const ago = (minutes: number) => new Date(now - minutes * 60_000)

  it("di bawah satu menit disebut baru saja", () => {
    expect(relativeNotificationTime(ago(0), now)).toBe("baru saja")
    expect(relativeNotificationTime(ago(0.4), now)).toBe("baru saja")
  })

  it("menit dan jam dibulatkan ke satuan terdekat", () => {
    expect(relativeNotificationTime(ago(1), now)).toBe("1 menit lalu")
    expect(relativeNotificationTime(ago(59), now)).toBe("59 menit lalu")
    expect(relativeNotificationTime(ago(60), now)).toBe("1 jam lalu")
    expect(relativeNotificationTime(ago(60 * 23), now)).toBe("23 jam lalu")
  })

  it("hari dipakai sampai seminggu", () => {
    expect(relativeNotificationTime(ago(60 * 24), now)).toBe("1 hari lalu")
    expect(relativeNotificationTime(ago(60 * 24 * 6), now)).toBe("6 hari lalu")
  })

  it("lebih dari seminggu memakai tanggal, bukan angka hari besar", () => {
    const label = relativeNotificationTime(ago(60 * 24 * 30), now)
    expect(label).not.toMatch(/hari lalu/)
    expect(label.length).toBeGreaterThan(0)
  })
})
