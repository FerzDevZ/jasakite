/**
 * Logika pemasangan hook git milik repo.
 *
 * Dipisahkan dari CLI supaya bisa diuji terhadap repository sementara sungguhan
 * (`git init` di direktori tmp), bukan hanya dibaca kodenya.
 *
 * Dua pelajaran yang membentuk bentuk modul ini:
 *
 * 1. **Git tidak selalu memakai `.git/hooks`.** `core.hooksPath` (lokal maupun
 *    global) mengalihkan direktori hook. Dulu installer hanya menulis ke satu
 *    lokasi dan melaporkan "terpasang", sementara git menjalankan hook lain —
 *    guard private key yang sudah diperbaiki tidak pernah aktif.
 * 2. **Salinan lama adalah jebakan.** Salinan guard di lokasi yang tidak dipakai
 *    git tetap terlihat seperti pengaman padahal tidak pernah dijalankan. Karena
 *    itu setiap salinan guard yang ditemukan ikut disinkronkan, dan `--check`
 *    melaporkan drift alih-alih diam.
 */
const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const HOOK_NAME = "pre-push"
const GUARD_MARKER = "# Freebuff Pre-Push Secret Guard"

function runGit(args, projectRoot) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()
}

function isGitRepository(projectRoot) {
  try {
    runGit(["rev-parse", "--git-dir"], projectRoot)
    return true
  } catch {
    return false
  }
}

function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8")
  } catch (error) {
    if (error.code === "ENOENT") return null
    throw error
  }
}

function readHooksPathConfig(projectRoot) {
  try {
    // `--show-origin` supaya laporan bisa menyebut file konfigurasi mana yang
    // mengalihkan hook (mis. ~/.gitconfig), bukan sekadar nilainya.
    const line = runGit(["config", "--show-origin", "--get", "core.hooksPath"], projectRoot)
    const [origin, ...rest] = line.split("\t")
    const value = rest.join("\t").trim()
    if (!value) return null
    return { value, origin: origin?.replace(/^file:/, "") ?? null }
  } catch {
    return null
  }
}

/**
 * Lokasi yang benar-benar dipakai git.
 *
 * `git rev-parse --git-path hooks` sudah menghormati `core.hooksPath` (termasuk
 * nilai relatif terhadap root repo) dan layout worktree — tidak perlu meniru
 * aturan itu sendiri.
 */
function resolveHookLocations(projectRoot) {
  const hooksPath = readHooksPathConfig(projectRoot)
  const activeHooksDirectory = path.resolve(
    projectRoot,
    runGit(["rev-parse", "--git-path", "hooks"], projectRoot)
  )
  const commonDirectory = path.resolve(
    projectRoot,
    runGit(["rev-parse", "--git-common-dir"], projectRoot)
  )
  return {
    hooksPath,
    activeHooksDirectory,
    // Lokasi konvensional tempat orang (dan versi installer lama) menaruh hook.
    // Untuk worktree, ini menunjuk `.git` bersama, bukan direktori per-worktree.
    conventionalHooksDirectory: path.join(commonDirectory, "hooks"),
  }
}

function readHookSource(hookSource) {
  const sourceContent = fs.readFileSync(hookSource, "utf8")
  if (!sourceContent.includes(GUARD_MARKER)) {
    throw new Error(
      `hook sumber tidak memuat penanda "${GUARD_MARKER}": ${hookSource}`
    )
  }
  return sourceContent
}

/**
 * Rencana pemasangan tanpa menyentuh disk.
 *
 * Target:
 *  - direktori hook aktif (wajib);
 *  - direktori `.git/hooks` konvensional **hanya bila sudah berisi salinan
 *    guard kita**. Tanpa pengecualian ini, repo yang memakai `core.hooksPath`
 *    akan mendapat salinan kedua yang tidak pernah dijalankan git — persis
 *    sumber kebingungan yang ingin dihilangkan.
 */
function planPrePushInstall({ projectRoot, hookSource }) {
  const sourceContent = readHookSource(hookSource)
  const locations = resolveHookLocations(projectRoot)

  const targetDirectories = [locations.activeHooksDirectory]
  const conventionalHookPath = path.join(
    locations.conventionalHooksDirectory,
    HOOK_NAME
  )
  const conventionalContent = readFileIfExists(conventionalHookPath)
  const activeIsConventional =
    path.resolve(locations.activeHooksDirectory) ===
    path.resolve(locations.conventionalHooksDirectory)

  if (
    !activeIsConventional &&
    conventionalContent !== null &&
    conventionalContent.includes(GUARD_MARKER)
  ) {
    targetDirectories.push(locations.conventionalHooksDirectory)
  }

  const steps = targetDirectories.map((directory) => {
    const filePath = path.join(directory, HOOK_NAME)
    const existingContent = readFileIfExists(filePath)
    let action = "unchanged"
    if (existingContent === null) action = "installed"
    else if (existingContent !== sourceContent) {
      action = existingContent.includes(GUARD_MARKER) ? "updated" : "replaced-foreign"
    }
    return {
      directory,
      filePath,
      existingContent,
      action,
      isActive: path.resolve(directory) === path.resolve(locations.activeHooksDirectory),
    }
  })

  return { sourceContent, locations, steps }
}

function writeHook(step, sourceContent) {
  fs.mkdirSync(step.directory, { recursive: true })
  if (step.action === "replaced-foreign") {
    // Hook buatan pengguna tidak dihapus diam-diam: simpan sebagai .backup.
    fs.copyFileSync(step.filePath, `${step.filePath}.backup`)
  }
  fs.writeFileSync(step.filePath, sourceContent, { mode: 0o755 })
  // writeFileSync dengan `mode` hanya berlaku saat file baru dibuat, jadi
  // chmod eksplisit diperlukan untuk file yang sudah ada.
  fs.chmodSync(step.filePath, 0o755)
}

function installPrePushHook({ projectRoot, hookSource }) {
  const plan = planPrePushInstall({ projectRoot, hookSource })
  for (const step of plan.steps) {
    if (step.action === "unchanged") continue
    writeHook(step, plan.sourceContent)
  }
  return {
    locations: plan.locations,
    steps: plan.steps,
    changed: plan.steps.filter((step) => step.action !== "unchanged"),
    backups: plan.steps
      .filter((step) => step.action === "replaced-foreign")
      .map((step) => `${step.filePath}.backup`),
  }
}

/** Drift = hook aktif hilang/berbeda, atau salinan guard lama tertinggal. */
function checkPrePushHook({ projectRoot, hookSource }) {
  const plan = planPrePushInstall({ projectRoot, hookSource })
  const drifted = plan.steps.filter((step) => step.action !== "unchanged")
  const activeStep = plan.steps.find((step) => step.isActive)
  return {
    locations: plan.locations,
    steps: plan.steps,
    drifted,
    inSync: drifted.length === 0 && activeStep !== undefined,
  }
}

module.exports = {
  GUARD_MARKER,
  HOOK_NAME,
  checkPrePushHook,
  installPrePushHook,
  isGitRepository,
  planPrePushInstall,
  resolveHookLocations,
}
