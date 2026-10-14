import { expect, test } from "@playwright/test"
import { ACCOUNTS, login } from "./helpers/auth"
import {
  apiGet,
  listServices,
  postJson,
  serviceNotOwnedBy,
  serviceOwnedBy,
} from "./helpers/api"

/**
 * Uji perilaku marketplace yang ditambahkan saat perombakan UI/UX:
 *
 * 1. sort=popular — sebelumnya diam-diam jatuh ke "newest" karena SORT_MAP
 *    tidak punya entry itu (menu Terlaris tidak pernah bekerja).
 * 2. Paket tier — selector di halaman detail membawa paket & harga ke
 *    checkout; API menolak paket milik jasa lain (anti manipulasi harga).
 * 3. Chat lepas-pesanan — kirim dari halaman detail, inbox menyatukan
 *    percakapan, dan badge unread penerima naik lalu turun setelah dibaca.
 * 4. Bottom-nav (mobile) & mega-menu kategori (desktop) tampil sesuai
 *    lebar viewport.
 *
 * Serial: tes chat membangun data (pesan) yang dibaca tes berikutnya, dan
 * dua sesi login berjalan dalam satu tes.
 */

test.describe.configure({ mode: "serial" })

type ServicePackage = {
  id: string
  name: string
  price: number
  deliveryTimeDays: number
  features: string[]
}

/** Digit ribuan id-ID — dipakai sebagai substring pencocok harga. */
function digits(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n)
}

async function fetchPackages(
  page: import("@playwright/test").Page,
  slug: string
): Promise<ServicePackage[]> {
  const res = await apiGet(page, `/api/services?slug=${slug}`)
  expect(res.ok(), `GET /api/services?slug=${slug}`).toBeTruthy()
  const body = (await res.json()) as {
    services?: { packages?: ServicePackage[] }[]
  }
  return body.services?.[0]?.packages ?? []
}

test("sort=popular mengembalikan urutan berdasarkan jumlah pesanan", async ({
  request,
}) => {
  const res = await request.get("/api/services?sort=popular")
  expect(res.ok()).toBeTruthy()
  const { services } = (await res.json()) as {
    services: { _count?: { orders: number } }[]
  }
  expect(services.length, "katalog harus berisi jasa").toBeGreaterThan(1)

  const counts = services.map((s) => s._count?.orders ?? -1)
  // orderBy { orders: _count: desc } — non-naik. Sebelum entry `popular`
  // ditambahkan, parameter ini diabaikan dan urutannya sama dengan "newest".
  for (let i = 1; i < counts.length; i++) {
    expect(
      counts[i - 1],
      `urutan popular tidak menurun di indeks ${i}: ${counts.join(", ")}`
    ).toBeGreaterThanOrEqual(counts[i])
  }
})

test("memilih paket di detail membawa paket & harga ke checkout", async ({
  page,
}) => {
  await login(page, "customer", "/services")
  const svc = await serviceNotOwnedBy(page, ACCOUNTS.customer.name)
  const pkgs = await fetchPackages(page, svc.slug)
  test.skip(
    pkgs.length < 2,
    "jasa seed tanpa paket tier (bukan ACTIVE / belum di-seed)"
  )

  await page.goto(`/service/${svc.slug}`)

  // Pemilih paket: radio per tier. Query role menyaring elemen tersembunyi
  // (kotak mobile & desktop sama-sama dirender, satu selalu display:none).
  const standard = pkgs.find((p) => p.name === "Standard")
  expect(standard, "seed harus membuat paket Standard").toBeTruthy()
  const standardRadio = page.getByRole("radio", { name: /Standard/ })
  await expect(standardRadio).toBeVisible()
  await standardRadio.click()
  await expect(standardRadio).toHaveAttribute("aria-checked", "true")

  // Navigasi ke checkout membawa id paket terpilih.
  await page.getByRole("link", { name: "Pesan Sekarang" }).click()
  await expect(page).toHaveURL(new RegExp(`package=${standard!.id}`))
  await expect(
    page.getByRole("heading", { name: /Detail Pesanan/i })
  ).toBeVisible()

  // Ringkasan menyebut paketnya…
  await expect(page.getByText("Paket Standard")).toBeVisible()
  // …dan harga yang ditampilkan adalah harga paket, bukan harga dasar jasa.
  await expect(page.getByText(digits(standard!.price)).first()).toBeVisible()
})

test("API orders memakai harga paket & menolak paket jasa lain", async ({
  page,
}) => {
  await login(page, "customer", "/services")

  const s1 = await serviceNotOwnedBy(page, ACCOUNTS.customer.name)
  const rows = await listServices(page)
  // Jasa kedua untuk kasus negatif — harus berbeda milik & bukan milik
  // customer (milik sendiri ditolak lebih dulu dengan 400, bukan 404).
  const s2 =
    rows.find(
      (r) =>
        r.id !== s1.id &&
        r.provider?.name !== ACCOUNTS.customer.name &&
        r.provider?.name !== s1.provider?.name
    ) ?? rows.find((r) => r.id !== s1.id)
  expect(s2, "butuh jasa aktif kedua untuk uji negatif").toBeTruthy()

  const pkg1 = (await fetchPackages(page, s1!.slug))[0]
  const pkg2 = (await fetchPackages(page, s2!.slug))[0]
  test.skip(
    !pkg1 || !pkg2,
    "kedua jasa uji harus punya paket tier (hasil seed jasa ACTIVE)"
  )

  const address =
    "Jl. Uji Paket No.9, Tanjung Pandan, Kabupaten Belitung, Kepulauan Bangka Belitung"

  // Happy: pesanan dengan paket memakai HARGA PAKET, bukan harga dasar.
  const ok = await postJson(page, "/api/orders", {
    serviceId: s1!.id,
    packageId: pkg1!.id,
    address,
  })
  expect(ok.status(), "POST /api/orders dengan paket valid").toBe(201)
  const order = (await ok.json()) as { totalPrice: number }
  expect(order.totalPrice).toBe(pkg1!.price)

  // Negatif 1: paket milik jasa LAIN tidak bisa dipakai untuk membeli
  // jasa ini (mencegah harga dipalsukan lintas katalog).
  const cross = await postJson(page, "/api/orders", {
    serviceId: s2!.id,
    packageId: pkg1!.id,
    address,
  })
  expect(cross.status()).toBe(404)
  expect((await cross.json()).error).toMatch(/Paket/i)

  // Negatif 2: format id paket salah → ditolak zod sebelum menyentuh DB.
  const malformed = await postJson(page, "/api/orders", {
    serviceId: s1!.id,
    packageId: "bukan-objectid",
    address,
  })
  expect(malformed.status()).toBe(400)
})

test("chat lepas-pesanan: kirim dari detail, badge unread penerima naik & turun", async ({
  browser,
}) => {
  // ── Sesi pelanggan ──────────────────────────────────────────────────
  const ctx1 = await browser.newContext()
  const customer = await ctx1.newPage()
  await login(customer, "customer", "/services")

  // Wajib jasa milik AKUN provider uji (Budi): sesi kedua login sebagai dia,
  // dan inbox-nya baru berisi percakapan dari customer bila pesan ditujukan
  // kepadanya — jasa provider lain membuat tes membaca inbox orang salah.
  const svc = await serviceOwnedBy(customer, ACCOUNTS.provider.name)
  const providerId = svc.provider.id

  // Negatif 1: DM ke diri sendiri → 400.
  const sessionRes = await apiGet(customer, "/api/auth/session")
  const session = (await sessionRes.json()) as { user?: { id?: string } }
  const myId = session.user?.id
  expect(myId, "sesi customer harus punya user.id").toBeTruthy()
  const selfDm = await postJson(customer, "/api/messages", {
    recipientId: myId,
    content: "halo diri sendiri",
  })
  expect(selfDm.status()).toBe(400)

  // Negatif 2: konten kosong (hanya spasi) →400, tidak menyimpan pesan.
  const empty = await postJson(customer, "/api/messages", {
    recipientId: providerId,
    content: "   ",
  })
  expect(empty.status()).toBe(400)

  // Happy: kirim lewat UI — tombol Chat Penyedia di halaman detail.
  await customer.goto(`/service/${svc.slug}`)
  await customer.getByRole("link", { name: /Chat Penyedia/ }).click()
  await expect(customer).toHaveURL(new RegExp(`/messages\\?peer=${providerId}`))
  await expect(
    customer.getByRole("heading", { name: /Komunikasi dengan/ })
  ).toBeVisible()

  const text = "Halo, masih menerima jasa minggu ini?"
  await customer.getByLabel(/Tulis pesan ke/).fill(text)
  await customer.getByLabel(/Tulis pesan ke/).press("Enter")
  await expect(customer.getByText(text).last()).toBeVisible()

  // ── Sesi penyedia: badge unread naik, turun setelah thread dibuka ───
  const ctx2 = await browser.newContext()
  const provider = await ctx2.newPage()
  await login(provider, "provider", "/messages")

  const inboxRes = await apiGet(provider, "/api/messages/inbox")
  expect(inboxRes.ok()).toBeTruthy()
  const inbox = (await inboxRes.json()) as {
    unreadTotal: number
    conversations: {
      type: "direct" | "order"
      id: string
      unread: number
      lastContent: string | null
    }[]
  }
  const conv = inbox.conversations.find(
    (c) => c.type === "direct" && c.id === myId
  )
  expect(conv, "percakapan direct customer harus muncul di inbox").toBeTruthy()
  expect(conv!.unread).toBeGreaterThanOrEqual(1)
  expect(conv!.lastContent).toBe(text)

  // Badge navbar menampilkan jumlah yang sama (aria-label berbunyi
  // "N pesan belum dibaca" hanya saat count > 0).
  await expect(
    provider.locator('a[href="/messages"][aria-label*="pesan belum dibaca"]')
  ).toBeVisible()

  // Membuka thread menandai pesan sudah dibaca di server — percakapan INI
  // (bukan total global, yang bisa memuat pesan pesanan lama) jadi 0.
  await provider.goto(`/messages?peer=${myId}`)
  await expect(
    provider.getByRole("heading", { name: /Komunikasi dengan/ })
  ).toBeVisible()

  await expect
    .poll(
      async () => {
        const res = await apiGet(provider, "/api/messages/inbox")
        const data = (await res.json()) as {
          conversations: { type: string; id: string; unread: number }[]
        }
        return (
          data.conversations.find(
            (c) => c.type === "direct" && c.id === myId
          )?.unread ?? -1
        )
      },
      { timeout: 10_000, message: "thread yang dibuka harus jadi sudah dibaca" }
    )
    .toBe(0)

  await ctx1.close()
  await ctx2.close()
})

test("bottom-nav tampil di mobile, mega-menu kategori tampil di desktop", async ({
  page,
}) => {
  await page.goto("/")
  const width = page.viewportSize()?.width ?? 1280
  const bottomNav = page.getByRole("navigation", { name: "Navigasi utama" })

  if (width >= 1024) {
    await expect(bottomNav).toBeHidden()

    const trigger = page.getByRole("button", { name: /^Kategori/ })
    await expect(trigger).toBeVisible()
    await trigger.click()
    const menu = page.getByRole("menu", { name: /Kategori jasa/ })
    await expect(menu).toBeVisible()
    await expect(
      menu.getByRole("menuitem", { name: /Semua kategori/ })
    ).toBeVisible()

    // Escape menutup menu dan mengembalikan fokus ke pemicu.
    await page.keyboard.press("Escape")
    await expect(menu).toBeHidden()
  } else {
    await expect(bottomNav).toBeVisible()
    // Tab bawah kini lima: Beranda, Kategori, Pesanan, Pesan, Akun. Pola
    // /Pesan/ cocok dua tab sekaligus (Pesanan + Pesan) dan melanggar aturan
    // strict — jadi kedua tab dicocokkan secara eksak satu per satu.
    await expect(
      bottomNav.getByRole("link", { name: "Pesanan", exact: true })
    ).toBeVisible()
    await expect(
      bottomNav.getByRole("link", { name: "Pesan", exact: true })
    ).toBeVisible()
    // Mega-menu desktop disembunyikan di mobile.
    await expect(page.getByRole("button", { name: /^Kategori/ })).toBeHidden()
  }
})
