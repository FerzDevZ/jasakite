import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

/**
 * Rate limit harus GLOBAL, bukan per proses.
 *
 * Yang diuji bukan "apakah fungsinya mengembalikan angka", melainkan apakah dua
 * PROSES OS terpisah — yang hanya berbagi database — benar-benar menghabiskan
 * kuota yang sama. Dalam satu proses, implementasi berbasis `Map` juga akan
 * lolos, jadi uji ini tidak punya nilai kalau dijalankan in-process.
 *
 * Probe memakai `lib/rate-limit-store.js` yang sama dengan aplikasi; kalau
 * penyimpanannya diganti (mis. ke Redis), test ini tetap menangkap perubahan
 * perilakunya.
 */

const PROJECT_ROOT = path.resolve(__dirname, "..")

/** `.env` dibaca manual: vitest tidak memuat env file, sedangkan proses anak butuh DATABASE_URL. */
function databaseUrlFromEnvFile(): string | null {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  try {
    const contents = readFileSync(path.join(PROJECT_ROOT, ".env"), "utf8")
    const line = contents
      .split("\n")
      .find((entry) => entry.trim().startsWith("DATABASE_URL="))
    if (!line) return null
    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
  } catch {
    return null
  }
}

const DATABASE_URL = databaseUrlFromEnvFile()

type ProbeResult = { allowed: number; denied: number; count?: number }

function runProbe(args: string[]): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(PROJECT_ROOT, "scripts/rate-limit-probe.js"), ...args],
      {
        cwd: PROJECT_ROOT,
        env: { ...process.env, DATABASE_URL: DATABASE_URL ?? "" },
      }
    )

    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`probe keluar dengan kode ${code}: ${stderr.trim()}`))
        return
      }
      const line = stdout.trim().split("\n").filter(Boolean).pop()
      try {
        resolve(JSON.parse(line ?? "{}") as ProbeResult)
      } catch {
        reject(new Error(`keluaran probe bukan JSON: ${stdout}`))
      }
    })
  })
}

describe("rate limit global (dua proses)", () => {
  const scope = `test-global-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const identifier = "pengguna-uji"
  const limit = 10
  const windowMs = 60_000

  beforeAll(async () => {
    if (!DATABASE_URL) {
      throw new Error(
        "DATABASE_URL tidak ditemukan (env atau .env). Uji rate limit global butuh database sungguhan."
      )
    }
    await runProbe(["reset", scope])
  })

  afterAll(async () => {
    await runProbe(["reset", scope])
  })

  it("dua proses berbagi satu kuota, bukan masing-masing satu kuota", async () => {
    // Dua proses, masing-masing 8 percobaan, limit 10. Kalau hitungannya per
    // proses, keduanya akan lolos 8 (total 16). Yang benar: total 10.
    const [first, second] = await Promise.all([
      runProbe(["run", scope, identifier, String(limit), String(windowMs), "8"]),
      runProbe(["run", scope, identifier, String(limit), String(windowMs), "8"]),
    ])

    expect(first.allowed + second.allowed, "total yang diizinkan").toBe(limit)
    expect(first.denied + second.denied, "total yang ditolak").toBe(6)
  })

  it("hitungan tersimpan di database dan bisa dibaca proses lain tanpa menambah", async () => {
    const peeked = await runProbe([
      "peek",
      scope,
      identifier,
      String(limit),
      String(windowMs),
    ])
    expect(peeked.count).toBe(16)

    // `peek` tidak boleh menambah: kalau menambah, login yang berhasil akan
    // menghabiskan kuota percobaan berikutnya.
    const again = await runProbe([
      "peek",
      scope,
      identifier,
      String(limit),
      String(windowMs),
    ])
    expect(again.count).toBe(16)
  })
})
