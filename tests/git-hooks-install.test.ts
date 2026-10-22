import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

// Modul installer berupa CommonJS (dijalankan `node` saat `npm install`),
// jadi dimuat lewat createRequire agar tidak perlu deklarasi tipe terpisah.
const requireCommonJs = createRequire(import.meta.url)
const { GUARD_MARKER, checkPrePushHook, installPrePushHook } = requireCommonJs(
  "../scripts/lib/git-hooks.js"
) as {
  GUARD_MARKER: string
  checkPrePushHook: (input: { projectRoot: string; hookSource: string }) => {
    inSync: boolean
    locations: { hooksPath: { value: string } | null; activeHooksDirectory: string }
    steps: { action: string; filePath: string }[]
  }
  installPrePushHook: (input: { projectRoot: string; hookSource: string }) => {
    locations: { hooksPath: { value: string } | null; activeHooksDirectory: string }
    steps: { action: string; filePath: string }[]
    changed: { action: string }[]
    backups: string[]
  }
}

const PROJECT_ROOT = process.cwd()
const HOOK_SOURCE = path.join(PROJECT_ROOT, "scripts", "githooks", "pre-push")
const SOURCE_CONTENT = readFileSync(HOOK_SOURCE, "utf8")

const scratchRepositories: string[] = []
const previousGlobalConfig = process.env.GIT_CONFIG_GLOBAL
const previousSystemConfig = process.env.GIT_CONFIG_SYSTEM

// Tanpa isolasi ini, `core.hooksPath` milik mesin pengembang ikut terbaca dan
// test "tanpa hooksPath" tidak lagi menguji apa pun.
beforeAll(() => {
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

function makeRepository(): string {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "jasakite-hooks-"))
  scratchRepositories.push(repositoryRoot)
  execFileSync("git", ["init", "--quiet", repositoryRoot])
  return repositoryRoot
}

function runGit(repositoryRoot: string, args: string[]): string {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim()
}

function readHook(filePath: string): string {
  return readFileSync(filePath, "utf8")
}

describe("installPrePushHook", () => {
  it("memasang ke .git/hooks saat core.hooksPath tidak diset", () => {
    const repositoryRoot = makeRepository()
    const result = installPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })

    const installedHook = path.join(repositoryRoot, ".git", "hooks", "pre-push")
    expect(result.locations.hooksPath).toBeNull()
    expect(readHook(installedHook)).toBe(SOURCE_CONTENT)
    expect(statSync(installedHook).mode & 0o111).not.toBe(0)
  })

  it("mengikuti core.hooksPath absolut", () => {
    const repositoryRoot = makeRepository()
    const customDirectory = path.join(repositoryRoot, "hooks-custom")
    runGit(repositoryRoot, ["config", "core.hooksPath", customDirectory])

    const result = installPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })

    expect(result.locations.activeHooksDirectory).toBe(customDirectory)
    expect(readHook(path.join(customDirectory, "pre-push"))).toBe(SOURCE_CONTENT)
    // Tanpa salinan guard lama, .git/hooks tidak boleh disentuh: salinan di sana
    // tidak pernah dijalankan git dan hanya menyesatkan.
    expect(existsSync(path.join(repositoryRoot, ".git", "hooks", "pre-push"))).toBe(false)
  })

  it("mengikuti core.hooksPath relatif terhadap root repo", () => {
    const repositoryRoot = makeRepository()
    runGit(repositoryRoot, ["config", "core.hooksPath", ".githooks"])

    const result = installPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })

    expect(result.locations.activeHooksDirectory).toBe(
      path.join(repositoryRoot, ".githooks")
    )
    expect(readHook(path.join(repositoryRoot, ".githooks", "pre-push"))).toBe(SOURCE_CONTENT)
  })

  it("menyinkronkan salinan basi di .git/hooks saat hooksPath mengalihkan hook", () => {
    const repositoryRoot = makeRepository()
    const customDirectory = path.join(repositoryRoot, "templates")
    runGit(repositoryRoot, ["config", "core.hooksPath", customDirectory])

    // Kondisi nyata yang pernah terjadi: guard versi lama tertinggal di
    // .git/hooks sementara git menjalankan hook dari direktori lain.
    const staleHook = path.join(repositoryRoot, ".git", "hooks", "pre-push")
    mkdirSync(path.dirname(staleHook), { recursive: true })
    writeFileSync(staleHook, `${GUARD_MARKER}\n# versi lama\n`, { mode: 0o755 })

    const result = installPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })

    expect(readHook(staleHook)).toBe(SOURCE_CONTENT)
    expect(readHook(path.join(customDirectory, "pre-push"))).toBe(SOURCE_CONTENT)
    expect(result.steps.map((step) => step.action)).toContain("updated")
    expect(checkPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE }).inSync).toBe(
      true
    )
  })

  it("menyimpan hook asing sebagai .backup sebelum menggantinya", () => {
    const repositoryRoot = makeRepository()
    const hookPath = path.join(repositoryRoot, ".git", "hooks", "pre-push")
    const foreignHook = "#!/bin/sh\necho hook milik pengguna\n"
    writeFileSync(hookPath, foreignHook, { mode: 0o755 })

    const result = installPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })

    expect(readHook(hookPath)).toBe(SOURCE_CONTENT)
    expect(readHook(`${hookPath}.backup`)).toBe(foreignHook)
    expect(result.backups).toEqual([`${hookPath}.backup`])
  })

  it("menolak sumber yang bukan guard dan tidak mengubah hook aktif", () => {
    const repositoryRoot = makeRepository()
    const foreignSource = path.join(repositoryRoot, "bukan-guard.sh")
    writeFileSync(foreignSource, "#!/bin/sh\necho siapa ini\n")

    expect(() =>
      installPrePushHook({ projectRoot: repositoryRoot, hookSource: foreignSource })
    ).toThrow(/penanda/)
    expect(existsSync(path.join(repositoryRoot, ".git", "hooks", "pre-push"))).toBe(false)
  })
})

describe("checkPrePushHook", () => {
  it("melaporkan drift sebelum pemasangan dan sinkron sesudahnya", () => {
    const repositoryRoot = makeRepository()
    const installedHook = path.join(repositoryRoot, ".git", "hooks", "pre-push")

    const before = checkPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })
    expect(before.inSync).toBe(false)
    expect(before.steps.map((step) => step.action)).toContain("installed")

    installPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })
    expect(
      checkPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE }).inSync
    ).toBe(true)

    // Hook yang tertinggal satu versi harus terdeteksi, bukan diam.
    writeFileSync(installedHook, `${GUARD_MARKER}\n# isi basi\n`, { mode: 0o755 })
    const afterEdit = checkPrePushHook({ projectRoot: repositoryRoot, hookSource: HOOK_SOURCE })
    expect(afterEdit.inSync).toBe(false)
    expect(afterEdit.steps.map((step) => step.action)).toEqual(["updated"])
  })
})
