#!/usr/bin/env node
/**
 * Gerbang "Ignored Build Step" Vercel.
 *
 * Kontrak Vercel: **exit 0 = lewati build**, exit selain 0 = jalankan build.
 * Karena itu arah defaultnya sengaja "build": setiap ketidakpastian (basis
 * pembanding hilang, bukan repository git, perintah git gagal) harus berujung
 * pada build, bukan pada deploy yang terlewat. Melewatkan build aplikasi nyata
 * jauh lebih mahal daripada membangun ulang untuk perubahan dokumentasi.
 *
 * Hanya perubahan yang benar-benar masuk ke keluaran aplikasi yang dihitung.
 * Perubahan pada `scripts/`, `tests/`, dan dokumentasi tidak mengubah bundel,
 * jadi tidak perlu menghabiskan menit build.
 *
 * Logika keputusan dipisah dari CLI agar bisa diuji tanpa memanggil git.
 */
const { execFileSync } = require("node:child_process")

/**
 * Path yang mempengaruhi keluaran build.
 *
 * Daftarnya tinggal di `lib/vercel-build-inputs.json` supaya halaman admin
 * `/dashboard/admin/vercel` menampilkan pola yang SAMA dengan yang dipakai
 * gerbang ini — dua salinan daftar akan menyimpang tanpa terlihat.
 *
 * `package-lock.json` dan `package.json` wajib ikut: keduanya menentukan
 * dependency yang dibundel. `scripts/vercel-preflight.js` juga ikut karena
 * `npm run vercel-build` menjalankannya sebagai gerbang sebelum `next build`.
 */
const BUILD_INPUT_PATTERN_SOURCES = require("../lib/vercel-build-inputs.json")
const BUILD_INPUT_PATTERNS = BUILD_INPUT_PATTERN_SOURCES.map(
  (source) => new RegExp(source)
)

function requiresBuild(changedPaths) {
  return changedPaths.some((changedPath) =>
    BUILD_INPUT_PATTERNS.some((pattern) => pattern.test(changedPath))
  )
}

function matchingBuildInputs(changedPaths) {
  return changedPaths.filter((changedPath) =>
    BUILD_INPUT_PATTERNS.some((pattern) => pattern.test(changedPath))
  )
}

function collectChangedPaths(baseRef) {
  const output = execFileSync("git", ["diff", "--name-only", baseRef, "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  })
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function baseRefExists(baseRef) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", baseRef], {
      stdio: ["ignore", "ignore", "ignore"],
    })
    return true
  } catch {
    return false
  }
}

function run() {
  // Push berisi beberapa commit menyediakan SHA sebelumnya secara eksplisit;
  // `HEAD^` hanya melihat commit terakhir sehingga perubahan aplikasi di commit
  // sebelumnya bisa terlewat.
  const baseRef = process.env.VERCEL_GIT_PREVIOUS_SHA || "HEAD^"

  if (!baseRefExists(baseRef)) {
    console.log(
      `[vercel-ignore] basis pembanding "${baseRef}" tidak tersedia — build dijalankan agar tidak ada perubahan yang terlewat.`
    )
    return 1
  }

  const changedPaths = collectChangedPaths(baseRef)
  const buildInputs = matchingBuildInputs(changedPaths)

  if (buildInputs.length > 0) {
    console.log(
      `[vercel-ignore] ${buildInputs.length} berkas mempengaruhi build (basis ${baseRef}) — build dijalankan.`
    )
    for (const buildInput of buildInputs.slice(0, 20)) {
      console.log(`[vercel-ignore]   ${buildInput}`)
    }
    return 1
  }

  console.log(
    `[vercel-ignore] tidak ada berkas aplikasi yang berubah (${changedPaths.length} berkas berubah, basis ${baseRef}) — build dilewati.`
  )
  return 0
}

module.exports = {
  BUILD_INPUT_PATTERNS,
  BUILD_INPUT_PATTERN_SOURCES,
  collectChangedPaths,
  matchingBuildInputs,
  requiresBuild,
}

if (require.main === module) {
  try {
    process.exitCode = run()
  } catch (error) {
    console.log(
      `[vercel-ignore] pemeriksaan gagal (${error.message}) — build dijalankan.`
    )
    process.exitCode = 1
  }
}
