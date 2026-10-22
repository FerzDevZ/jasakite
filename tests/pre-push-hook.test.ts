import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

/**
 * Hook pre-push diuji sebagai proses bash sungguhan terhadap repository
 * sementara, karena perilaku yang dijaga di sini hanya muncul dari protokol
 * stdin git — bukan dari memanggil fungsi.
 *
 * Regresi yang dikunci:
 *  - hook lama memindai `origin/main..HEAD`; di cabang/repo tanpa `origin/main`
 *    diff-nya gagal dan guard diam saja;
 *  - hanya selisih ujung yang diperiksa, jadi secret yang ditambahkan lalu
 *    dihapus antar-commit tidak pernah terlihat.
 */

const PROJECT_ROOT = process.cwd()
const HOOK_PATH = path.join(PROJECT_ROOT, "scripts", "githooks", "pre-push")
const ZERO_SHA = "0".repeat(40)

const scratchRepositories: string[] = []
const previousGlobalConfig = process.env.GIT_CONFIG_GLOBAL
const previousSystemConfig = process.env.GIT_CONFIG_SYSTEM

beforeAll(() => {
  // Konfigurasi pengguna (mis. commit.gpgsign) tidak boleh ikut campur.
  process.env.GIT_CONFIG_GLOBAL = "/dev/null"
  process.env.GIT_CONFIG_SYSTEM = "/dev/null"
})

afterAll(() => {
  if (previousGlobalConfig === undefined) delete process.env.GIT_CONFIG_GLOBAL
  else process.env.GIT_CONFIG_GLOBAL = previousGlobalConfig
  if (previousSystemConfig === undefined) delete process.env.GIT_CONFIG_SYSTEM
  else process.env.GIT_CONFIG_SYSTEM = previousSystemConfig

  for (const repositoryRoot of scratchRepositories) {
    rmSync(repositoryRoot, { recursive: true, force: true })
  }
})

function git(repositoryRoot: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    // stderr dibuang: satu tes sengaja menanyakan ref yang tidak ada.
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

function makeRepository(): string {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "jasakite-pre-push-"))
  scratchRepositories.push(repositoryRoot)
  execFileSync("git", ["init", "--quiet", repositoryRoot])
  git(repositoryRoot, ["config", "user.email", "uji@contoh.test"])
  git(repositoryRoot, ["config", "user.name", "Uji"])
  return repositoryRoot
}

/** Tulis file lalu commit; mengembalikan SHA commit baru. */
function commitFile(
  repositoryRoot: string,
  relativePath: string,
  content: string,
  message: string
): string {
  writeFileSync(path.join(repositoryRoot, relativePath), content)
  git(repositoryRoot, ["add", "--all"])
  git(repositoryRoot, ["commit", "--quiet", "-m", message])
  return git(repositoryRoot, ["rev-parse", "HEAD"])
}

function removeFile(repositoryRoot: string, relativePath: string, message: string): string {
  unlinkSync(path.join(repositoryRoot, relativePath))
  git(repositoryRoot, ["add", "--all"])
  git(repositoryRoot, ["commit", "--quiet", "-m", message])
  return git(repositoryRoot, ["rev-parse", "HEAD"])
}

function runHook(
  repositoryRoot: string,
  refLines: string
): { status: number; output: string } {
  const result = spawnSync("bash", [HOOK_PATH], {
    cwd: repositoryRoot,
    input: refLines,
    encoding: "utf8",
  })
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` }
}

// Header PEM dirakit dari potongan: berkas uji ini ikut dipindai oleh hook
// saat di-push, dan literal utuh akan membuat guard menandai fixture-nya
// sendiri. Nilai akhirnya tetap header PEM yang sah.
const PEM_SECRET = [
  ["-----BEGIN", "RSA", "PRIVATE", "KEY-----"].join(" "),
  "MIIEcontohSaja",
  ["-----END", "RSA", "PRIVATE", "KEY-----"].join(" "),
  "",
].join("\n")
const GITHUB_TOKEN = `ghp_${"a".repeat(36)}`

describe("hook pre-push memindai ref yang dikirim", () => {
  it("meloloskan push bersih", () => {
    const repositoryRoot = makeRepository()
    const base = commitFile(repositoryRoot, "catatan.txt", "awal\n", "c1")
    const tip = commitFile(repositoryRoot, "catatan.txt", "awal\nisi\n", "c2")

    const result = runHook(
      repositoryRoot,
      `refs/heads/main ${tip} refs/heads/main ${base}\n`
    )
    expect(result.status).toBe(0)
    expect(result.output).not.toMatch(/CRITICAL LEAK/)
  })

  it("memblokir secret di commit ujung", () => {
    const repositoryRoot = makeRepository()
    const base = commitFile(repositoryRoot, "catatan.txt", "awal\n", "c1")
    const tip = commitFile(repositoryRoot, "token.txt", GITHUB_TOKEN, "c2 tambah token")

    const result = runHook(
      repositoryRoot,
      `refs/heads/main ${tip} refs/heads/main ${base}\n`
    )
    expect(result.status).toBe(1)
    expect(result.output).toMatch(/GitHub Personal Access Token/)
  })

  it("menangkap secret yang dihapus lagi di commit berikutnya", () => {
    const repositoryRoot = makeRepository()
    const base = commitFile(repositoryRoot, "catatan.txt", "awal\n", "c1")
    const leaked = commitFile(repositoryRoot, "kunci.pem", PEM_SECRET, "c2 bocor")
    const cleaned = removeFile(repositoryRoot, "kunci.pem", "c3 hapus")

    // Selisih ujung base..cleaned bersih, jadi `git diff` tidak akan melihat
    // apa pun; commit `leaked` tetap ter-push dan tetap bisa diambil.
    const netDiff = git(repositoryRoot, ["diff", `${base}..${cleaned}`])
    expect(netDiff).not.toMatch(/PRIVATE KEY/)

    const result = runHook(
      repositoryRoot,
      `refs/heads/main ${cleaned} refs/heads/main ${base}\n`
    )
    expect(result.status).toBe(1)
    expect(result.output).toMatch(/Private Key/)
  })

  it("memindai cabang baru meski repo tidak punya remote sama sekali", () => {
    const repositoryRoot = makeRepository()
    commitFile(repositoryRoot, "catatan.txt", "awal\n", "c1")
    const tip = commitFile(repositoryRoot, "kunci.pem", PEM_SECRET, "c2 bocor")

    // Kondisi yang membuat hook lama buta: `origin/main` tidak ada.
    expect(() => git(repositoryRoot, ["rev-parse", "--verify", "origin/main"])).toThrow()

    const result = runHook(
      repositoryRoot,
      `refs/heads/fitur ${tip} refs/heads/fitur ${ZERO_SHA}\n`
    )
    expect(result.status).toBe(1)
    expect(result.output).toMatch(/Private Key/)
  })

  it("tidak memindai penghapusan ref", () => {
    const repositoryRoot = makeRepository()
    const base = commitFile(repositoryRoot, "kunci.pem", PEM_SECRET, "c1 berisi kunci")

    const result = runHook(
      repositoryRoot,
      `(delete) ${ZERO_SHA} refs/heads/lama ${base}\n`
    )
    expect(result.status).toBe(0)
  })

  it("tidak menggantung saat stdin kosong", () => {
    const repositoryRoot = makeRepository()
    commitFile(repositoryRoot, "catatan.txt", "awal\n", "c1")

    const result = runHook(repositoryRoot, "")
    expect(result.status).toBe(0)
  })
})
