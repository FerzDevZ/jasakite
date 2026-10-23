import { z } from "zod"
import buildInputSources from "@/lib/vercel-build-inputs.json"
import vercelConfig from "@/vercel.json"

/**
 * Konfigurasi gerbang build yang benar-benar dipakai Vercel.
 *
 * Sumbernya berkas repo, bukan salinan di halaman admin: `ignoreCommand` dibaca
 * dari `vercel.json` dan daftar polanya dari `lib/vercel-build-inputs.json` —
 * berkas yang sama yang dibaca `scripts/vercel-ignore-build.js` saat build
 * berjalan. Dengan begitu halaman admin tidak bisa menampilkan aturan yang
 * berbeda dari yang dieksekusi.
 */

const vercelConfigSchema = z
  .object({
    ignoreCommand: z.string().optional(),
  })
  .passthrough()

export type BuildGateConfiguration = {
  ignoreCommand: string | null
  buildInputPatterns: string[]
}

const parsedVercelConfig = vercelConfigSchema.safeParse(vercelConfig)

export const BUILD_INPUT_PATTERNS: string[] = buildInputSources

export function readBuildGateConfiguration(): BuildGateConfiguration {
  const ignoreCommand = parsedVercelConfig.success
    ? parsedVercelConfig.data.ignoreCommand ?? null
    : null

  return {
    ignoreCommand,
    buildInputPatterns: BUILD_INPUT_PATTERNS,
  }
}
