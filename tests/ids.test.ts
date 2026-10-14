import { describe, expect, it } from "vitest"
import { isObjectId, prismaId, sameId, toPrismaId } from "@/lib/ids"

/**
 * Kontrak sistem ID ganda (MongoDB ObjectId vs SQLite/Postgres number).
 *
 * Berkas ini sebelumnya mengimpor NOL baris dari `lib/ids.ts`: seluruh perilaku
 * disimulasikan ulang dengan salinan lokal fungsi-fungsinya. Akibatnya tes tetap
 * hijau sambil menegaskan hal yang tidak dilakukan kode aslinya — salinan itu
 * mengembalikan `null` untuk ID tidak valid, sedangkan `toPrismaId` asli
 * mengembalikan string apa adanya. Tes yang tidak bisa gagal bukanlah tes.
 *
 * Sekarang semua fungsi diimpor langsung, jadi perubahan perilaku apa pun di
 * `lib/ids.ts` akan terlihat di sini.
 */

const OBJECT_ID = "507f1f77bcf86cd799439011"

describe("isObjectId", () => {
  it("menerima ObjectId 24 hex yang valid", () => {
    expect(isObjectId(OBJECT_ID)).toBe(true)
  })

  it("menerima huruf hex besar-kecil", () => {
    expect(isObjectId("507F1F77BCF86CD799439011")).toBe(true)
  })

  it("menolak karakter non-hex", () => {
    expect(isObjectId("507f1f77bcf86cd79943901z")).toBe(false)
  })

  it("menolak panjang yang salah", () => {
    expect(isObjectId("507f1f77bcf86cd799439")).toBe(false)
    expect(isObjectId("507f1f77bcf86cd799439011123")).toBe(false)
  })

  it("menolak string kosong", () => {
    expect(isObjectId("")).toBe(false)
  })
})

describe("toPrismaId", () => {
  it("mempertahankan ObjectId sebagai string", () => {
    expect(toPrismaId(OBJECT_ID)).toBe(OBJECT_ID)
    expect(typeof toPrismaId(OBJECT_ID)).toBe("string")
  })

  it("mengubah string digit murni menjadi number", () => {
    expect(toPrismaId("42")).toBe(42)
    expect(typeof toPrismaId("42")).toBe("number")
  })

  it("menghilangkan spasi di sekeliling", () => {
    expect(toPrismaId("  42  ")).toBe(42)
  })

  it("TIDAK memotong string campuran (regresi P0 be84816)", () => {
    // Number("123abc") === NaN, parseInt("123abc") === 123. Memakai parseInt
    // diam-diam mengubah ID tidak valid menjadi ID milik record lain.
    expect(toPrismaId("123abc")).toBe("123abc")
    expect(toPrismaId("123abc")).not.toBe(123)
  })

  it("mengembalikan ID tidak valid apa adanya, bukan null", () => {
    expect(toPrismaId("abc")).toBe("abc")
    expect(toPrismaId("507f1f77bcf86cd79943901z")).toBe("507f1f77bcf86cd79943901z")
  })

  it("memperlakukan 24 digit angka sebagai ObjectId, bukan number", () => {
    // Semua digit adalah karakter hex, jadi cabang ObjectId menang lebih dulu.
    const digits24 = "123456789012345678901234"
    expect(toPrismaId(digits24)).toBe(digits24)
    expect(typeof toPrismaId(digits24)).toBe("string")
  })

  it("tidak menormalkan bilangan negatif maupun desimal menjadi number", () => {
    expect(toPrismaId("-1")).toBe("-1")
    expect(toPrismaId("123.45")).toBe("123.45")
  })

  it("mengembalikan input kosong tanpa mengubahnya", () => {
    expect(toPrismaId("")).toBe("")
  })

  it("mengembalikan string spasi apa adanya (tidak di-trim) saat isinya kosong", () => {
    expect(toPrismaId("   ")).toBe("   ")
  })

  it("menerima nol sebagai number", () => {
    expect(toPrismaId("0")).toBe(0)
  })

  it("tidak pernah menghasilkan NaN untuk input apa pun", () => {
    const inputs = [
      OBJECT_ID,
      "42",
      "0",
      "-1",
      "123abc",
      "123.45",
      "",
      "   ",
      "abc",
      "507f1f77bcf86cd79943901z",
    ]
    for (const input of inputs) {
      const out = toPrismaId(input)
      expect(Number.isNaN(out as number)).toBe(false)
    }
  })
})

describe("prismaId", () => {
  it("mengembalikan nilai runtime yang identik dengan toPrismaId", () => {
    // Satu-satunya alasan prismaId() ada adalah tipe kembaliannya. Kalau nilainya
    // sampai berbeda dari toPrismaId(), seluruh klausa where di aplikasi
    // berubah perilaku tanpa satu pun error kompilasi.
    for (const input of [OBJECT_ID, "42", "123abc", "", "   ", "507f1f77bcf86cd79943901z"]) {
      expect(prismaId(input)).toBe(toPrismaId(input))
    }
  })

  it("ObjectId tetap string, digit murni jadi number", () => {
    expect(typeof prismaId(OBJECT_ID)).toBe("string")
    expect(typeof prismaId("42")).toBe("number")
  })
})

describe("sameId", () => {
  it("mencocokkan ID string", () => {
    expect(sameId(OBJECT_ID, OBJECT_ID)).toBe(true)
    expect(sameId("abc", "abc")).toBe(true)
  })

  it("mencocokkan ID number", () => {
    expect(sameId(42, 42)).toBe(true)
  })

  it("mencocokkan string dengan number yang setara", () => {
    expect(sameId("42", 42)).toBe(true)
    expect(sameId(42, "42")).toBe(true)
  })

  it("membedakan nilai yang berbeda", () => {
    expect(sameId("42", "43")).toBe(false)
    expect(sameId("42", 43)).toBe(false)
  })

  it("tidak pernah menganggap ID yang hilang sebagai sama", () => {
    expect(sameId(null, null)).toBe(false)
    expect(sameId(undefined, undefined)).toBe(false)
    expect(sameId(null, undefined)).toBe(false)
    expect(sameId(null, "42")).toBe(false)
    expect(sameId("42", null)).toBe(false)
    expect(sameId(undefined, OBJECT_ID)).toBe(false)
  })

  it("tidak menyamakan NaN dengan NaN", () => {
    // Guard agar regresi Number(ObjectId) tidak bisa lolos diam-diam.
    expect(sameId(Number.NaN, Number.NaN)).toBe(false)
    expect(sameId(Number.NaN, OBJECT_ID)).toBe(false)
  })

  it("tidak menyamakan string kosong dengan nol", () => {
    expect(sameId(0, "")).toBe(false)
    expect(sameId("", 0)).toBe(false)
  })

  it("tidak menyamakan string kosong dengan string kosong bila keduanya tidak ada", () => {
    // "" bukan null, jadi perbandingan string normal tetap berlaku.
    expect(sameId("", "")).toBe(true)
  })
})

describe("regresi: perbandingan kepemilikan pada MongoDB", () => {
  it("Number() pada ObjectId menghasilkan NaN — alasan sameId wajib dipakai", () => {
    expect(Number.isNaN(Number(OBJECT_ID))).toBe(true)
  })

  it("pola lama (Number + ===) gagal, pola sameId berhasil", () => {
    // Ditulis sebagai fungsi agar tipe parameternya tidak menyempit ke literal
    // string — bentuk `order.customer.id` yang asli memang `string | number`.
    const polaLama = (orderCustomerId: string | number): boolean =>
      Number(OBJECT_ID) === orderCustomerId

    expect(polaLama(OBJECT_ID)).toBe(false)
    expect(sameId(OBJECT_ID, OBJECT_ID)).toBe(true)
  })
})
