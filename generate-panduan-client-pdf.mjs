// Konversi panduan-client-jasakite.html menjadi PDF A4 dengan Playwright Chromium.
// Jalankan dari root proyek: node generate-panduan-client-pdf.mjs
// Hasil juga disalin ke docs/PANDUAN-CLIENT-JASAKITE.pdf (versi arsip repo).
import { chromium } from "playwright"
import { pathToFileURL } from "node:url"
import path from "node:path"
import fs from "node:fs"
import process from "node:process"

const root = process.cwd()
const htmlPath = path.join(root, "panduan-client-jasakite.html")
const pdfPath = path.join(root, "panduan-client-jasakite.pdf")
const archivePath = path.join(root, "docs", "PANDUAN-CLIENT-JASAKITE.pdf")

if (!fs.existsSync(htmlPath)) {
  console.error(`HTML tidak ditemukan: ${htmlPath}`)
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" })
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="width:100%;font-size:8px;color:#78716C;padding:0 14mm;display:flex;justify-content:space-between;">
      <span>JASAKITE — Buku Panduan Client</span>
      <span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span>
    </div>`,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
})

await browser.close()

const buffer = fs.readFileSync(pdfPath)
if (buffer.length === 0) {
  console.error("PDF kosong — konversi gagal.")
  process.exit(1)
}

fs.copyFileSync(pdfPath, archivePath)

console.log(`OK: ${pdfPath}`)
console.log(`Arsip: ${archivePath}`)
console.log(`Ukuran: ${(buffer.length / 1024).toFixed(1)} KB`)
console.log("Verifikasi jumlah halaman: jalankan `pdfinfo` (bukan menghitung byte).")
