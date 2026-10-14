import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Pagar antara kode dan `prisma/schema.prisma`.
 *
 * Dua kegagalan nyata yang dijaga di sini, keduanya sudah pernah terjadi:
 *
 * 1. **Salinan schema yang tertinggal.** `prisma/schema.mongo.prisma` dulu
 *    disalin menimpa `prisma/schema.prisma` saat build Vercel. Salinan itu
 *    berhenti diperbarui pada satu titik dan tidak lagi memuat model
 *    `OgPhotoPreflightSnapshot` — yang dipakai `lib/og-photo-preflight-snapshot.ts`
 *    di jalur render kartu OG dan di endpoint admin. Build tetap sukses; yang
 *    hilang adalah fiturnya saat dijalankan, di produksi saja.
 * 2. **Model yang dipakai kode tapi tidak ada di schema.** Gejalanya sama:
 *    `prisma.<model>` bernilai `undefined`, dan TypeScript tidak mengeluh karena
 *    tipe klien di-generate dari schema yang sama-sama salah — atau karena
 *    modulnya di-mock di test.
 *
 * Keduanya tidak bisa ditangkap typecheck maupun test yang memakai Prisma
 * palsu. Yang bisa menangkapnya adalah membandingkan berkas schema satu sama
 * lain dan mencocokkan nama model yang benar-benar diakses kode dengan isi
 * schema.
 */

const PROJECT_ROOT = process.cwd()
const PRISMA_DIR = path.join(PROJECT_ROOT, "prisma")
const SCHEMA_PATH = path.join(PRISMA_DIR, "schema.prisma")

/** Direktori yang berisi kode yang memakai klien Prisma. */
const SCANNED_DIRECTORIES = ["app", "lib", "prisma", "scripts"]

const SCANNED_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"])

/** Lewati artefak build dan dependensi — isinya bukan kode kita. */
const SKIPPED_DIRECTORY_NAMES = new Set(["node_modules", ".next", ".next-e2e", ".git"])

function readSchemaText(): string {
  return readFileSync(SCHEMA_PATH, "utf8")
}

/** Nama model pada tingkat atas schema (bukan `type`, bukan `enum`). */
function extractModelNames(schemaText: string): Set<string> {
  const modelNames = new Set<string>()
  for (const match of schemaText.matchAll(/^model\s+(\w+)\s*\{/gm)) {
    modelNames.add(match[1])
  }
  return modelNames
}

function walkFiles(directory: string): string[] {
  const collected: string[] = []
  for (const entry of readdirSync(directory)) {
    if (SKIPPED_DIRECTORY_NAMES.has(entry)) continue
    const absolute = path.join(directory, entry)
    if (statSync(absolute).isDirectory()) {
      collected.push(...walkFiles(absolute))
      continue
    }
    if (SCANNED_EXTENSIONS.has(path.extname(entry))) collected.push(absolute)
  }
  return collected
}

/**
 * Nama properti yang diakses lewat `prisma.` — mis. `ogPhotoPreflightSnapshot`
 * dari `prisma.ogPhotoPreflightSnapshot.findMany()`.
 *
 * Properti berawalan `$` (mis. `$transaction`, `$connect`) bukan model dan
 * sengaja dilewati oleh polanya.
 */
function collectAccessedModelProperties(): Map<string, string[]> {
  const accessedByFile = new Map<string, string[]>()

  for (const filePath of SCANNED_DIRECTORIES.flatMap((name) =>
    walkFiles(path.join(PROJECT_ROOT, name))
  )) {
    const source = readFileSync(filePath, "utf8")
    const names = new Set<string>()
    for (const match of source.matchAll(/\bprisma\.([A-Za-z_]\w*)/g)) {
      names.add(match[1])
    }
    if (names.size > 0) {
      accessedByFile.set(path.relative(PROJECT_ROOT, filePath), [...names])
    }
  }

  return accessedByFile
}

/** Klien Prisma menurunkan properti model dari nama model: huruf pertama kecil. */
function toClientPropertyName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1)
}

describe("schema Prisma adalah satu-satunya sumber kebenaran", () => {
  it("tidak ada berkas schema kedua yang berbeda isi", () => {
    const schemaFileNames = readdirSync(PRISMA_DIR).filter((name) =>
      /^schema.*\.prisma$/.test(name)
    )

    expect(schemaFileNames).toContain("schema.prisma")

    const schemaText = readSchemaText()
    const divergedSchemaNames = schemaFileNames
      .filter((name) => name !== "schema.prisma")
      .filter((name) => readFileSync(path.join(PRISMA_DIR, name), "utf8") !== schemaText)

    expect(
      divergedSchemaNames,
      `Schema kembar yang isinya berbeda: ${divergedSchemaNames.join(", ")}. Ini penyebab bug produksi yang senyap — salinan schema disalin menimpa prisma/schema.prisma saat build, build tetap hijau, lalu model yang cuma ada di schema asli hilang dari Prisma Client (pernah terjadi pada OgPhotoPreflightSnapshot). Hapus salinannya, atau bikin identik dan pastikan tidak ada langkah build yang menyalinnya.`
    ).toEqual([])
  })

  it("setiap model yang diakses kode ada di schema.prisma", () => {
    const modelNames = extractModelNames(readSchemaText())
    const clientPropertyToModel = new Map(
      [...modelNames].map((modelName) => [toClientPropertyName(modelName), modelName])
    )

    const accessedByFile = collectAccessedModelProperties()
    expect(
      accessedByFile.size,
      "Tidak ada satu pun akses `prisma.<model>` yang terbaca — pola pencarian atau susunan direktori berubah, jadi test ini tidak memeriksa apa pun."
    ).toBeGreaterThan(0)

    const unknownAccessors: string[] = []
    for (const [filePath, accessedNames] of accessedByFile) {
      for (const accessedName of accessedNames) {
        if (!clientPropertyToModel.has(accessedName)) {
          unknownAccessors.push(`${filePath}: prisma.${accessedName}`)
        }
      }
    }

    expect(
      unknownAccessors,
      `Model ini dipakai kode tapi tidak ada di prisma/schema.prisma: ${unknownAccessors.join(", ")}. Prisma Client hanya punya properti untuk model yang tercantum di schema — kode seperti ini lolos typecheck saat modulnya di-mock, lalu menjadi undefined di produksi.`
    ).toEqual([])
  })
})
