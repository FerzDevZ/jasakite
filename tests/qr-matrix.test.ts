import { describe, expect, it, vi } from "vitest"
import {
  buildQrMatrix,
  qrDarkModuleCount,
  qrPathData,
  QR_QUIET_ZONE_MODULES,
  type QrMatrix,
} from "@/lib/qr-matrix"

/**
 * Matriks QR kartu share.
 *
 * Yang diuji bukan "ada QR di kartu", melainkan sifat-sifat yang membuatnya
 * bisa dipindai: quiet zone 4 modul yang ikut ke dalam matriks (bukan
 * diserahkan ke padding CSS yang bisa berubah), ukuran yang sah, determinisme
 * antar-render, dan jalur SVG yang benar-benar menutup setiap modul gelap
 * tepat sekali.
 *
 * Nilai uji memakai URL sungguhan, bukan "test": panjangnya menentukan versi QR,
 * dan versi QR menentukan jumlah modul — inti dari asersi ukuran di bawah.
 */

const SERVICE_URL =
  "https://jasakite.id/service/antar-paket-dokumen-pangkal-pinang"

/** Ukuran sisi QR mentah (tanpa quiet zone) hanya boleh 21 + 4k. */
function rawSize(matrix: QrMatrix): number {
  return matrix.size - QR_QUIET_ZONE_MODULES * 2
}

function moduleAt(matrix: QrMatrix, x: number, y: number): boolean {
  return matrix.modules[y * matrix.size + x]
}

describe("matriks QR", () => {
  it("menyertakan quiet zone empat modul di dalam matriks", () => {
    const matrix = buildQrMatrix(SERVICE_URL)
    expect(matrix).not.toBeNull()
    if (!matrix) return

    // Cincin terluar harus terang seluruhnya — tanpa ini, QR yang tampak benar
    // bisa ditolak pemindai.
    for (let i = 0; i < matrix.size; i++) {
      for (let band = 0; band < QR_QUIET_ZONE_MODULES; band++) {
        expect(moduleAt(matrix, i, band)).toBe(false)
        expect(moduleAt(matrix, i, matrix.size - 1 - band)).toBe(false)
        expect(moduleAt(matrix, band, i)).toBe(false)
        expect(moduleAt(matrix, matrix.size - 1 - band, i)).toBe(false)
      }
    }

    // Dan di dalam quiet zone itu benar-benar ada isi.
    expect(qrDarkModuleCount(matrix)).toBeGreaterThan(0)
  })

  it("memakai ukuran sisi yang sah untuk versi QR", () => {
    const matrix = buildQrMatrix(SERVICE_URL)
    expect(matrix).not.toBeNull()
    if (!matrix) return

    const raw = rawSize(matrix)
    expect(raw).toBeGreaterThanOrEqual(21)
    // 21, 25, 29, ... : setiap kenaikan versi menambah 4 modul per sisi.
    expect((raw - 21) % 4).toBe(0)
    expect(matrix.modules).toHaveLength(matrix.size * matrix.size)
  })

  it("deterministik antar-render dan berbeda untuk nilai berbeda", () => {
    const first = buildQrMatrix(SERVICE_URL)
    const second = buildQrMatrix(SERVICE_URL)
    const other = buildQrMatrix(
      "https://jasakite.id/provider/507f1f77bcf86cd799439011"
    )

    expect(first).toEqual(second)
    expect(first).not.toEqual(other)
  })

  it("mengembalikan null alih-alih melempar saat nilai tidak bisa di-encode", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      expect(buildQrMatrix("")).toBeNull()
      expect(buildQrMatrix("   ")).toBeNull()
      // Terlalu panjang untuk satu QR: kartu tanpa QR lebih baik daripada
      // route 500 yang menghapus og:image.
      expect(buildQrMatrix(`https://jasakite.id/${"x".repeat(5_000)}`)).toBeNull()
      expect(warn).toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })
})

describe("jalur SVG matriks QR", () => {
  /** Terapkan jalur run-length ke peta kosong dan kembalikan peta isinya. */
  function rasterizePath(matrix: QrMatrix, path: string): boolean[] {
    const covered = new Array<boolean>(matrix.size * matrix.size).fill(false)
    const commandPattern = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/g
    let match: RegExpExecArray | null

    while ((match = commandPattern.exec(path)) !== null) {
      const startX = Number(match[1])
      const y = Number(match[2])
      const width = Number(match[3])
      const returnWidth = Number(match[4])

      // Potongan yang digambar dan yang dikembalikan harus sama panjang, kalau
      // tidak bentuknya bukan persegi panjang.
      expect(returnWidth).toBe(width)

      for (let offset = 0; offset < width; offset++) {
        const index = y * matrix.size + startX + offset
        // Satu modul tidak boleh tertutup dua potongan: tumpang tindih berarti
        // jalur menggambar ulang sesuatu, dan artinya perhitungannya salah.
        expect(covered[index]).toBe(false)
        covered[index] = true
      }
    }

    return covered
  }

  it("menutup setiap modul gelap tepat sekali dan tidak menyentuh yang terang", () => {
    const matrix = buildQrMatrix(SERVICE_URL)
    expect(matrix).not.toBeNull()
    if (!matrix) return

    const covered = rasterizePath(matrix, qrPathData(matrix))

    for (let index = 0; index < matrix.modules.length; index++) {
      expect(covered[index]).toBe(matrix.modules[index])
    }
  })

  it("memadatkan modul berurutan menjadi satu potongan", () => {
    // Matriks 5×5 dengan dua blok berurutan: satu di tengah baris 1 (3 modul),
    // satu di tepi kanan baris 3 (2 modul).
    const matrix: QrMatrix = {
      size: 5,
      modules: [
        false, false, false, false, false,
        false, true, true, true, false,
        false, false, false, false, false,
        false, false, false, true, true,
        false, false, false, false, false,
      ],
    }

    expect(qrPathData(matrix)).toBe("M1 1h3v1h-3zM3 3h2v1h-2z")
    expect(qrDarkModuleCount(matrix)).toBe(5)
  })

  it("menggambar potongan yang mencapai tepi kanan tanpa kehilangan modul", () => {
    const matrix: QrMatrix = {
      size: 2,
      modules: [false, true, true, true],
    }

    expect(qrPathData(matrix)).toBe("M1 0h1v1h-1zM0 1h2v1h-2z")
    expect(qrPathData({ size: 1, modules: [false] })).toBe("")
  })
})
