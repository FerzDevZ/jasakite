#!/usr/bin/env node
/**
 * Memasang hook git milik repo (scripts/githooks) ke direktori hooks Git.
 *
 * Dijalankan otomatis oleh lifecycle `prepare` saat `npm install`, supaya
 * clone baru langsung memakai guard yang sama tanpa langkah manual. Hook
 * disalin, bukan disimlink, agar tetap bekerja di Windows tanpa hak symlink.
 */
const { execFileSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const projectRoot = path.resolve(__dirname, "..")
const hookSource = path.join(__dirname, "githooks", "pre-push")

function resolveHooksDirectory() {
  const reportedPath = execFileSync("git", ["rev-parse", "--git-path", "hooks"], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim()

  if (!reportedPath) {
    throw new Error("git tidak melaporkan direktori hooks")
  }
  return path.resolve(projectRoot, reportedPath)
}

function installPrePushHook() {
  if (!fs.existsSync(hookSource)) {
    throw new Error(`hook sumber tidak ditemukan: ${hookSource}`)
  }

  const hooksDirectory = resolveHooksDirectory()
  fs.mkdirSync(hooksDirectory, { recursive: true })

  const installedHook = path.join(hooksDirectory, "pre-push")

  // Jangan menimpa hook buatan pengguna tanpa jejak. Hook guard lama dari
  // repo ini aman ditimpa; hook asing disimpan sebagai .backup lebih dulu.
  if (fs.existsSync(installedHook)) {
    const previousHook = fs.readFileSync(installedHook, "utf8")
    if (!previousHook.includes("Freebuff Pre-Push Secret Guard")) {
      fs.copyFileSync(installedHook, `${installedHook}.backup`)
      console.log(`[git-hooks] hook lama disimpan: ${installedHook}.backup`)
    }
  }

  fs.copyFileSync(hookSource, installedHook)
  fs.chmodSync(installedHook, 0o755)

  console.log(`[git-hooks] pre-push terpasang: ${installedHook}`)
}

try {
  installPrePushHook()
} catch (error) {
  // Arsip sumber atau build CI tanpa .git tidak punya hook untuk dipasang;
  // jangan gagalkan instalasi dependensi hanya karena itu.
  console.log(`[git-hooks] pemasangan hook dilewati: ${error.message}`)
}
