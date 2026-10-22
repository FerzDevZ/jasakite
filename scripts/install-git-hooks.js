#!/usr/bin/env node
/**
 * Pasang / periksa guard pre-push milik repo.
 *
 * Dijalankan otomatis oleh lifecycle `prepare` saat `npm install`, dan bisa
 * dipanggil manual:
 *
 *   node scripts/install-git-hooks.js            # pasang atau sinkronkan
 *   node scripts/install-git-hooks.js --check    # gagal bila hook tidak sinkron
 *
 * Hook disalin (bukan disimlink) agar bekerja di Windows tanpa hak symlink.
 * Lokasi tujuan mengikuti direktori yang benar-benar dipakai git — termasuk
 * bila `core.hooksPath` mengalihkannya — dan salinan lama di `.git/hooks`
 * ikut disinkronkan supaya tidak ada versi basi yang terlihat seperti pengaman.
 */
const path = require("node:path")
const {
  checkPrePushHook,
  installPrePushHook,
  isGitRepository,
} = require("./lib/git-hooks")

const projectRoot = path.resolve(__dirname, "..")
const hookSource = path.join(__dirname, "githooks", "pre-push")
const checkOnly = process.argv.includes("--check")

const ACTION_LABELS = {
  installed: "dipasang",
  updated: "diperbarui",
  "replaced-foreign": "diganti (hook lama disimpan sebagai .backup)",
  unchanged: "sudah sinkron",
}

function describeHooksPath(locations) {
  if (!locations.hooksPath) return "tidak diset (memakai .git/hooks)"
  const origin = locations.hooksPath.origin ? ` dari ${locations.hooksPath.origin}` : ""
  return `${locations.hooksPath.value}${origin}`
}

function run() {
  if (!isGitRepository(projectRoot)) {
    console.log("[git-hooks] dilewati: bukan repository git (arsip sumber / build CI)")
    return 0
  }

  if (checkOnly) {
    const result = checkPrePushHook({ projectRoot, hookSource })
    console.log(`[git-hooks] core.hooksPath: ${describeHooksPath(result.locations)}`)
    console.log(
      `[git-hooks] direktori hook aktif (yang dijalankan git): ${result.locations.activeHooksDirectory}`
    )
    for (const step of result.steps) {
      console.log(`[git-hooks]   ${step.filePath}: ${ACTION_LABELS[step.action]}`)
    }
    if (result.inSync) {
      console.log("[git-hooks] OK: guard pre-push sinkron dengan scripts/githooks/pre-push")
      return 0
    }
    console.error(
      "[git-hooks] DRIFT: hook yang dijalankan git tidak sama dengan scripts/githooks/pre-push."
    )
    console.error("[git-hooks] Jalankan: node scripts/install-git-hooks.js")
    return 1
  }

  const result = installPrePushHook({ projectRoot, hookSource })
  console.log(`[git-hooks] core.hooksPath: ${describeHooksPath(result.locations)}`)
  console.log(
    `[git-hooks] direktori hook aktif (yang dijalankan git): ${result.locations.activeHooksDirectory}`
  )
  for (const step of result.steps) {
    console.log(`[git-hooks]   ${step.filePath}: ${ACTION_LABELS[step.action]}`)
  }
  for (const backupPath of result.backups) {
    console.log(`[git-hooks] hook lama disimpan: ${backupPath}`)
  }
  if (result.changed.length === 0) {
    console.log("[git-hooks] tidak ada perubahan")
  }
  return 0
}

try {
  process.exitCode = run()
} catch (error) {
  // Arsip sumber atau build CI tanpa .git tidak punya hook untuk dipasang;
  // jangan gagalkan instalasi dependensi hanya karena itu.
  console.log(`[git-hooks] pemasangan hook dilewati: ${error.message}`)
  // `--check` adalah gerbang eksplisit: kegagalan di sana harus terlihat.
  process.exitCode = checkOnly ? 1 : 0
}
