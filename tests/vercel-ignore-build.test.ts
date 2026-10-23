import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, describe, expect, it } from "vitest"

const requireCommonJs = createRequire(import.meta.url)
const { matchingBuildInputs, requiresBuild } = requireCommonJs(
  "../scripts/vercel-ignore-build.js"
) as {
  matchingBuildInputs: (changedPaths: string[]) => string[]
  requiresBuild: (changedPaths: string[]) => boolean
}

const GATE_SCRIPT = path.join(
  process.cwd(),
  "scripts",
  "vercel-ignore-build.js"
)

const scratchRepositories: string[] = []
const previousGlobalConfig = process.env.GIT_CONFIG_GLOBAL
const previousSystemConfig = process.env.GIT_CONFIG_SYSTEM

// Isolasi konfigurasi global: `core.hooksPath` atau alias milik mesin
// pengembang tidak boleh mempengaruhi repository sementara di test ini.
process.env.GIT_CONFIG_GLOBAL = "/dev/null"
process.env.GIT_CONFIG_SYSTEM = "/dev/null"

afterAll(() => {
  if (previousGlobalConfig === undefined) delete process.env.GIT_CONFIG_GLOBAL
  else process.env.GIT_CONFIG_GLOBAL = previousGlobalConfig
  if (previousSystemConfig === undefined) delete process.env.GIT_CONFIG_SYSTEM
  else process.env.GIT_CONFIG_SYSTEM = previousSystemConfig

  for (const repositoryRoot of scratchRepositories) {
    rmSync(repositoryRoot, { recursive: true, force: true })
  }
})

function createRepository(filePaths: string[]): string {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "vercel-ignore-"))
  scratchRepositories.push(repositoryRoot)
  execFileSync("git", ["init", "-q"], { cwd: repositoryRoot })
  execFileSync("git", ["config", "user.email", "test@example.com"], {
    cwd: repositoryRoot,
  })
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repositoryRoot })
  commitFiles(repositoryRoot, filePaths, "awal")
  return repositoryRoot
}

function commitFiles(
  repositoryRoot: string,
  filePaths: string[],
  message: string
): string {
  for (const filePath of filePaths) {
    const absolutePath = path.join(repositoryRoot, filePath)
    mkdirSync(path.dirname(absolutePath), { recursive: true })
    writeFileSync(absolutePath, `${message}\n`)
  }
  execFileSync("git", ["add", "--all"], { cwd: repositoryRoot })
  execFileSync("git", ["commit", "-qm", message], { cwd: repositoryRoot })
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim()
}

function runGate(repositoryRoot: string, previousSha?: string) {
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.VERCEL_GIT_PREVIOUS_SHA
  if (previousSha !== undefined) env.VERCEL_GIT_PREVIOUS_SHA = previousSha

  return spawnSync(process.execPath, [GATE_SCRIPT], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env,
  })
}

describe("keputusan build dari daftar berkas berubah", () => {
  it("melewati build saat hanya perkakas, tes, dan dokumentasi berubah", () => {
    expect(
      requiresBuild([
        "scripts/githooks/pre-push",
        "scripts/install-git-hooks.js",
        "tests/pre-push-hook.test.ts",
        "README.md",
        "MEMORY.md",
      ])
    ).toBe(false)
  })

  it("menjalankan build saat berkas aplikasi berubah", () => {
    for (const changedPath of [
      "app/page.tsx",
      "components/ui/button.tsx",
      "lib/auth.ts",
      "middleware.ts",
      "next.config.mjs",
      "package.json",
      "package-lock.json",
      "tailwind.config.ts",
      "prisma/schema.prisma",
      "scripts/vercel-preflight.js",
    ]) {
      expect(requiresBuild([changedPath]), changedPath).toBe(true)
    }
  })

  it("melaporkan hanya berkas pemicu build", () => {
    expect(
      matchingBuildInputs(["README.md", "lib/auth.ts", "tests/x.test.ts"])
    ).toEqual(["lib/auth.ts"])
  })
})

describe("CLI gerbang build Vercel", () => {
  it("keluar 0 (lewati) saat perubahan hanya di skrip dan dokumentasi", () => {
    const repositoryRoot = createRepository(["app/page.tsx", "README.md"])
    const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim()
    commitFiles(repositoryRoot, ["scripts/helper.js", "docs/catatan.md"], "alat")

    const gateResult = runGate(repositoryRoot, baseSha)

    expect(gateResult.status).toBe(0)
    expect(gateResult.stdout).toContain("build dilewati")
  })

  it("keluar 1 (build) saat berkas aplikasi berubah", () => {
    const repositoryRoot = createRepository(["app/page.tsx"])
    const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim()
    commitFiles(repositoryRoot, ["lib/auth.ts"], "perubahan aplikasi")

    const gateResult = runGate(repositoryRoot, baseSha)

    expect(gateResult.status).toBe(1)
    expect(gateResult.stdout).toContain("build dijalankan")
  })

  it("memakai VERCEL_GIT_PREVIOUS_SHA sehingga commit lama dalam satu push tetap diperiksa", () => {
    const repositoryRoot = createRepository(["app/page.tsx"])
    const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repositoryRoot,
      encoding: "utf8",
    }).trim()
    // Perubahan aplikasi ada di commit pertama dari dua commit yang dikirim.
    commitFiles(repositoryRoot, ["components/card.tsx"], "komponen")
    commitFiles(repositoryRoot, ["README.md"], "dokumentasi")

    // Tanpa SHA pembanding, `HEAD^` hanya melihat commit terakhir (dokumentasi)
    // dan keliru melewati build.
    expect(runGate(repositoryRoot).status).toBe(0)
    expect(runGate(repositoryRoot, baseSha).status).toBe(1)
  })

  it("keluar 1 saat basis pembanding tidak ada (commit pertama)", () => {
    const repositoryRoot = createRepository(["app/page.tsx"])

    const gateResult = runGate(repositoryRoot)

    expect(gateResult.status).toBe(1)
    expect(gateResult.stdout).toContain("tidak tersedia")
  })
})
