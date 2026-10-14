import { expect, test } from "@playwright/test"
import { ACCOUNTS, login } from "./helpers/auth"
import { createOrderWithProvider, orderStatus } from "./helpers/api"

/**
 * Kanban drag — GripVertical dari PENDING ke IN_PROGRESS + invalid target toast.
 * Kanban ada di /dashboard/provider, memakai dnd-kit dengan PointerSensor distance 6px.
 *
 * Pesanan uji dibuat lewat helper API (dengan header CSRF). Sebelumnya POST-nya
 * memakai fetch polos tanpa token, sehingga middleware menjawab 403 dan helper
 * menyimpulkan "gagal buat pesanan" padahal penyebabnya bukan rate-limit.
 */

test.describe("kanban drag — provider", () => {
  test("grip handle GripVertical terlihat dan bisa drag PENDING → IN_PROGRESS", async ({ page }) => {
    // pastikan ada pesanan: login customer buat 1 order PENDING
    await login(page, "customer", "/services")
    const orderId = await createOrderWithProvider(page, ACCOUNTS.provider.name)
    if (!orderId) {
      test.skip(true, "gagal buat pesanan uji")
      return
    }

    // login sebagai provider untuk menguji kanban
    await login(page, "provider", "/dashboard/provider")
    await expect(page.getByRole("heading", { level: 2, name: /Pesanan Masuk/i })).toBeVisible()

    const card = page.locator("article").filter({ hasText: `Pesanan #${orderId}` })
    await expect(card).toBeVisible({ timeout: 20_000 })

    // kolom tujuan: label diambil dari statusShortLabel — "Dikerjakan" untuk IN_PROGRESS
    const targetColumn = page.locator("section", { hasText: "Dikerjakan" }).first()
    // fallback: cari droppable dengan id IN_PROGRESS (dnd-kit Droppable id = OrderStatus)
    const droppable = page.locator('[aria-label="Dikerjakan"]').first()
    const dropTarget = (await droppable.count()) > 0 ? droppable : targetColumn

    // Pegangan drag bukan keturunan <article>, melainkan saudara kandungnya di
    // dalam pembungkus draggable. Mencarinya dari `card` selalu nihil.
    const draggable = page.locator(`[aria-label^="Pesanan #${orderId} "]`).first()
    const grip = draggable.getByRole("button", { name: new RegExp(`Geser pesanan #${orderId}`) })
    await expect(grip).toBeVisible({ timeout: 10_000 })

    // pastikan target terlihat sebelum drag
    await expect(dropTarget).toBeVisible({ timeout: 10_000 })

    // Pesanan yang baru dibuat muncul di urutan teratas kolom "Menunggu", jadi
    // pegangan bisa berada di bawah header sticky. Bawa ke TENGAH viewport
    // dengan scroll instan milik Playwright.
    //
    // `el.scrollIntoView()` dari halaman TIDAK boleh dipakai di sini.
    // globals.css menetapkan `scroll-behavior: smooth`, sehingga halaman masih
    // bergerak ~500ms setelah panggilan itu — terukur: pegangan bergerak 493 →
    // 375 → 342px. boundingBox() yang diukur di sela animasi basi sampai 150px,
    // mouse.down() mendarat di kartu alih-alih pegangan, drag tidak pernah
    // mulai, dan tes gagal tanpa satu pun pesan dari aplikasi: tidak ada toast,
    // tidak ada error, hanya "element not found" dua puluh detik kemudian.
    await grip.scrollIntoViewIfNeeded()
    await expect(grip).toBeVisible()

    // Dudukkan SEMUA koordinat di pita tengah viewport sebelum mengukur.
    //
    // (1) Kolom kanan menjulang ~3500px: titik tengahnya berada jauh di luar
    //     viewport, dan gerakan mouse ke koordinat itu tidak akan pernah sampai.
    // (2) dnd-kit meng-auto-scroll halaman saat benda yang diseret mendekati
    //     tepi viewport (ambang default 25% tinggi = 180px). Percobaan dengan
    //     titik jatuh 40px dari tepi bawah membuat halaman menggulir 355px
    //     SELAMA pointer ditahan; kolom target bergerak menjauh dari pointer
    //     statis, `over` kosong saat mouse.up, dan transisi tidak pernah
    //     dikirim. Solusinya bukan melawan auto-scroll (itu fitur nyata untuk
    //     pengguna), melainkan meniru manusia: tekanan dan titik jatuh diletakkan
    //     di pita tengah yang jauh dari kedua ambang (atas 180px, bawah 540px).
    const anchorY = 300
    const boxBefore = await grip.boundingBox()
    if (!boxBefore) {
      test.skip(true, "boundingBox tidak tersedia (layout mobile?)")
      return
    }
    const gripPageY = boxBefore.y + (await page.evaluate(() => window.scrollY))
    // Bulatkan targetnya: pada viewport perangkat (deviceScaleFactor > 1)
    // boundingBox berpecahan desimal — 78.453 — sementara browser
    // membulatkan offset gulir ke bilangan bulat, jadi perbandingan ketat
    // `scrollY === target` tidak akan pernah cocok dan waitForFunction
    // menggantung sampai timeout 60 detik. Gulir juga dibatasi ke maksimum
    // dokumen agar tidak menuntut posisi yang tak bisa dicapai.
    const targetScrollY = Math.round(Math.max(0, gripPageY - anchorY))
    // behavior: "instant" WAJIB. Tanpa itu, scrollTo mengikuti CSS
    // scroll-behavior: smooth milik globals.css dan semua koordinat yang
    // diukur setelahnya basi di tengah animasi — cacat yang persis sama dengan
    // scrollIntoView() halaman sebelumnya, hanya dalam bentuk lain.
    await page.evaluate((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: Math.min(y, max), behavior: "instant" })
    }, targetScrollY)
    await page.waitForFunction((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return Math.abs(window.scrollY - Math.min(y, max)) <= 1
    }, targetScrollY)

    // Lakukan drag manual via mouse — distance >6px untuk aktivasi PointerSensor
    const box = await grip.boundingBox()
    const targetBox = await dropTarget.boundingBox()
    if (!box || !targetBox) {
      test.skip(true, "boundingBox tidak tersedia (layout mobile?)")
      return
    }

    // Di layar sempit (mis. Pixel 5, 393px) ketiga kolom kanban menumpuk
    // VERTIKAL (lg:grid-cols-3 baru aktif di ≥1024px), sehingga kolom
    // "Dikerjakan" berada ribuan piksel di bawah viewport: titik jatuh tidak
    // akan pernah mendarat di kolomnya dan drag tidak bisa diselesaikan.
    // Jalur aksesibel diuji sebagai gantinya — tombol "Terima & Kerjakan"
    // pada kartu yang sama, dengan kontrak PATCH + status yang sama persis.
    const viewportH = (page.viewportSize()?.height ?? 720)
    const targetInView =
      targetBox.y < viewportH - 60 && targetBox.y + targetBox.height > 60
    const gripInView = box.y >= 0 && box.y + box.height <= viewportH
    if (!targetInView || !gripInView) {
      const buttonPatchPromise = page.waitForResponse(
        (r) =>
          r.url().includes(`/api/orders/${orderId}`) &&
          r.request().method() === "PATCH",
        { timeout: 15_000 }
      )
      await card.getByRole("button", { name: /Terima & Kerjakan/i }).click()
      const buttonPatch = await buttonPatchPromise
      expect(buttonPatch.status(), "PATCH /api/orders/[id] harus sukses").toBe(200)
      await expect(card.getByRole("button", { name: /Tandai Selesai/i })).toBeVisible({
        timeout: 20_000,
      })
      expect(await orderStatus(page, orderId)).toBe("IN_PROGRESS")
      return
    }

    const pressX = box.x + box.width / 2
    const pressY = box.y + box.height / 2

    // Penjaga arah: titik yang akan ditekan HARUS benar-benar mengenai pegangan.
    // Tanpa ini, layout yang bergeser mengubah tes menjadi hijau palsu — ia
    // menekan elemen lain, drag tidak pernah mulai, lalu gagal 20 detik kemudian
    // dengan pesan yang tidak menyebut penyebabnya.
    const pressed = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label") ?? "",
      [pressX, pressY]
    )
    expect(pressed, "titik tekan harus mengenai pegangan drag").toContain(`Geser pesanan #${orderId}`)

    // Titik jatuh: 120px di bawah tepi atas kolom — melewati baris kepala
    // kolom (~45px), masuk area droppable, dan tetap di pita tengah viewport
    // yang jauh dari zona auto-scroll.
    const dropX = targetBox.x + targetBox.width / 2
    const dropY = targetBox.y + 120

    await page.mouse.move(pressX, pressY)
    await page.mouse.down()
    // gerak kecil dulu untuk lewat threshold 6px
    await page.mouse.move(pressX + 12, pressY, { steps: 6 })
    await page.mouse.move(dropX, dropY, { steps: 12 })

    // Tunggu PATCH-nya, JANGAN menebak dari UI. moveOrder itu optimistik: kartu
    // pindah kolom dan tombol "Tandai Selesai" muncul SEBELUM server commit —
    // assertion UI lulus instan, lalu orderStatus() membaca PENDING karena PATCH
    // masih di jalan. Listener didaftarkan SEBELUM mouse.up (PATCH baru terkirim
    // saat drop) dan di-await SETELAHNYA — balapan hilang, dan kalau server
    // menolak, kodenya terlihat di pesan kegagalan.
    const patchResPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/orders/${orderId}`) &&
        r.request().method() === "PATCH",
      { timeout: 15_000 }
    )
    await page.mouse.up()
    const patchRes = await patchResPromise
    expect(patchRes.status(), "PATCH /api/orders/[id] harus sukses").toBe(200)

    // setelah PATCH sukses, tombol harus berganti jadi "Tandai Selesai" (IN_PROGRESS)
    await expect(card.getByRole("button", { name: /Tandai Selesai/i })).toBeVisible({ timeout: 20_000 })

    // juga validasi via API: order status sekarang IN_PROGRESS
    expect(await orderStatus(page, orderId)).toBe("IN_PROGRESS")
  })

  test("invalid target (IN_PROGRESS → PENDING) → toast 'Transisi tidak diizinkan'", async ({ page }) => {
    await login(page, "provider", "/dashboard/provider")
    await expect(page.getByRole("heading", { level: 2, name: /Pesanan Masuk/i })).toBeVisible({
      timeout: 15_000,
    })

    // ambil kartu pertama yang sudah IN_PROGRESS (kalau tidak ada, skip)
    // Dashboard memuat daftarnya ASINKRON (react-query): heading "Pesanan Masuk"
    // muncul sebelum kartu, jadi menghitung di sini selalu 0 dan tes ter-skip
    // salah alasan. Tunggu minimal satu kartu terender dulu.
    const anyCard = page.locator("article")
    await expect(anyCard.first()).toBeVisible({ timeout: 20_000 })
    const inProgressCard = page
      .locator("article")
      .filter({ has: page.getByRole("button", { name: /Tandai Selesai/i }) })
      .first()
    if ((await inProgressCard.count()) === 0) {
      test.skip(true, "tidak ada kartu IN_PROGRESS untuk uji invalid drag")
      return
    }
    const idText = await inProgressCard.textContent()
    const match = idText?.match(/Pesanan #(\S+)/)
    const orderId = match?.[1] ?? ""
    const draggable = page.locator(`[aria-label^="Pesanan #${orderId} "]`).first()
    const grip = draggable.getByRole("button", { name: new RegExp(`Geser pesanan #${orderId}`) })
    const pendingColumn = page.locator("section").filter({ hasText: /^Menunggu/ }).first()
    await expect(pendingColumn).toBeVisible()

    // Scroll INSTAN ke pita tengah viewport (lihat tes 1 untuk alasannya):
    // mouse.move TIDAK menggulir halaman, jadi pegangan di bawah lipatan layar
    // membuat penekanan mendarat di mana saja — kecuali kita membawanya ke sini
    // sendiri tanpa animasi CSS.
    const anchorY = 300
    const boxBefore = await grip.boundingBox()
    if (!boxBefore) {
      test.skip(true, "boundingBox tidak tersedia")
      return
    }
    const gripPageY = boxBefore.y + (await page.evaluate(() => window.scrollY))
    // Bulatkan targetnya: pada viewport perangkat (deviceScaleFactor > 1)
    // boundingBox berpecahan desimal — 78.453 — sementara browser
    // membulatkan offset gulir ke bilangan bulat. Perbandingan ketat
    // `scrollY === target` tidak akan pernah cocok dan waitForFunction
    // menggantung sampai timeout 60 detik. Gulir juga dibatasi ke maksimum
    // dokumen agar tidak menuntut posisi yang tak bisa dicapai.
    const targetScrollY = Math.round(Math.max(0, gripPageY - anchorY))
    await page.evaluate((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo({ top: Math.min(y, max), behavior: "instant" })
    }, targetScrollY)
    await page.waitForFunction((y) => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      return Math.abs(window.scrollY - Math.min(y, max)) <= 1
    }, targetScrollY)

    const box = await grip.boundingBox()
    const targetBox = await pendingColumn.boundingBox()
    if (!box || !targetBox) {
      test.skip(true, "boundingBox unavailable")
      return
    }

    const pressX = box.x + box.width / 2
    const pressY = box.y + box.height / 2

    // Titik jatuh: 120px di bawah kepala kolom, di-clamp ke pita tengah viewport
    // (250–450px). y+40 pola lama mengenai baris kepala kolom — bukan droppable —
    // sehingga over kosong, dragEnd tidak memanggil moveOrder, dan toast
    // 'Transisi tidak diizinkan' tidak pernah muncul.
    const dropX = targetBox.x + targetBox.width / 2
    const dropY = Math.max(250, Math.min(450, targetBox.y + 120))

    // Pada layar sempit (mis. Pixel 5, 393px) kolom kanban menumpuk VERTIKAL
    // di dalam pembungkus yang menggulir dirinya sendiri, jadi window.scrollTo
    // tidak menggeser pegangan: tekanan mendarat di luar viewport dan drag
    // tidak pernah mulai. Titik jatuh pun bisa berada jauh di atas layar —
    // clamp 250–450 mendarat di kolom lain dan toast tidak pernah muncul.
    // Drag hanya diuji bila pegangan dan titik jatuh sama-sama terjangkau.
    const viewportH = page.viewportSize()?.height ?? 720
    const gripInView = box.y >= 0 && box.y + box.height <= viewportH
    const dropUsable =
      dropY >= 0 &&
      dropY <= viewportH &&
      dropY >= targetBox.y &&
      dropY <= targetBox.y + targetBox.height
    if (!gripInView || !dropUsable) {
      test.skip(
        true,
        "pegangan/kolom Menunggu tidak terjangkau (kanban menumpuk vertikal di layar sempit)"
      )
      return
    }

    // Penjaga arah (lihat tes 1): penekanan HARUS mengenai pegangan.
    const pressed = await page.evaluate(
      ([x, y]) =>
        document.elementFromPoint(x, y)?.closest("button")?.getAttribute("aria-label") ?? "",
      [pressX, pressY]
    )
    expect(pressed, "titik tekan harus mengenai pegangan drag").toContain(`Geser pesanan #${orderId}`)

    await page.mouse.move(pressX, pressY)
    await page.mouse.down()
    await page.mouse.move(pressX + 12, pressY, { steps: 6 })
    await page.mouse.move(dropX, dropY, { steps: 10 })
    // beri dua frame bagi rAF dnd-kit menghitung over sebelum drop
    await page.waitForTimeout(150)
    await page.mouse.up()

    // toast error dari canTransition check
    await expect(page.getByText(/Transisi tidak diizinkan/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test.skip("keyboard fallback — tombolTerima membuka IN_PROGRESS (a11y) — manual, skip CI", async () => {
    // Kanban juga punya tombol "Terima & Kerjakan" untuk aksesibilitas.
    // Drag bukan satu-satunya jalur; test ini memverifikasi tombol tetap bekerja tanpa pointer.
  })
})
