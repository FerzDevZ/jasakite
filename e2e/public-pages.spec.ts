import { expect, test } from "@playwright/test"

/**
 * Smoke test halaman publik.
 *
 * Sengaja memeriksa hal yang tidak bisa dibuktikan unit test: bahwa server
 * produksi benar-benar merender halaman, judulnya satu dan tepat, dan rute
 * terproteksi mengarahkan ke login alih-alih membocorkan isi.
 */

test.describe("halaman publik", () => {
  test("landing page merender hero beserta bukti sosial", async ({ page }) => {
    await page.goto("/")

    await expect(
      page.getByRole("heading", { level: 1, name: /Jasa terbaik dari/i })
    ).toBeVisible()

    // Kartu statistik hero: angka diambil dari database, bukan hardcode.
    await expect(page.getByText(/Penyedia jasa aktif/i).first()).toBeVisible()
    await expect(page.getByText(/Bergabung bersama/i)).toBeVisible()
  })

  test("tepat satu h1 dan tidak ada lompatan level heading", async ({ page }) => {
    for (const path of ["/", "/services", "/faq", "/login", "/register"]) {
      await page.goto(path)

      const levels = await page.$$eval("h1,h2,h3,h4,h5,h6", (nodes) =>
        nodes.map((n) => Number(n.tagName.slice(1)))
      )

      expect(levels.filter((l) => l === 1), `${path}: jumlah h1`).toHaveLength(1)
      expect(levels[0], `${path}: heading pertama harus h1`).toBe(1)

      const jumps = levels
        .slice(1)
        .map((level, i) => [levels[i], level])
        .filter(([prev, next]) => next - prev > 1)
      expect(jumps, `${path}: lompatan level heading`).toEqual([])
    }
  })

  test("katalog menampilkan jasa dan jumlah totalnya", async ({ page }) => {
    await page.goto("/services")

    await expect(
      page.getByRole("heading", { level: 1, name: "Jelajahi Jasa" })
    ).toBeVisible()
    await expect(page.getByText(/\d+ jasa ditemukan/)).toBeVisible()
  })

  test("slug yang tidak ada menampilkan not-found dan noindex", async ({
    page,
  }) => {
    const response = await page.goto("/service/slug-yang-tidak-pernah-ada")

    // Status di sini 200, BUKAN 404 — dan itu bukan kelalaian test.
    // <Navbar /> adalah async server component di root layout, sehingga Next.js
    // sudah mulai men-stream respons (header terkirim) sebelum notFound() di
    // page.tsx dievaluasi. Status HTTP tidak bisa diubah setelah itu.
    //
    // Yang bisa dan harus dijamin: UI not-found tampil, dan halaman diberi
    // noindex supaya crawler tidak mengindeks soft 404 untuk slug ngawur.
    expect(response?.status()).toBe(200)
    await expect(page.getByText(/tidak ditemukan/i).first()).toBeVisible()
  })

  test("slug tidak ada dikirim dengan meta robots noindex", async ({
    request,
  }) => {
    // Diperiksa pada HTML mentah, bukan DOM: not-found boundary React menukar
    // isi <head> setelah hydration, sehingga tag yang dilihat crawler (yang
    // tidak menjalankan JS) hanya terlihat di respons server.
    const response = await request.get("/service/slug-yang-tidak-pernah-ada")
    const html = await response.text()

    const robotsTags = html.match(/<meta name="robots" content="[^"]*"/g) ?? []
    expect(robotsTags.length).toBeGreaterThan(0)
    for (const tag of robotsTags) {
      expect(tag).toMatch(/noindex/)
    }
  })

  test("rute tak terdaftar menampilkan 404 (hijack fix)", async ({ page }) => {
    // Fix P0 middleware hijack: unknown routes tidak lagi redirect ke /login,
    // biarkan Next render 404 (app/not-found.tsx) — benar untuk SEO & UX.
    await page.goto("/rute-yang-tidak-pernah-ada")
    await expect(page).toHaveURL("/rute-yang-tidak-pernah-ada")
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/404|tidak ditemukan/i)
  })

  test("rute terproteksi mengarahkan ke login", async ({ page }) => {
    for (const path of ["/dashboard", "/checkout", "/orders/1"]) {
      await page.goto(path);
      await expect(page, `${path} harus redirect`).toHaveURL(/\/login/)
    }
  })
})

test.describe("filter lokasi katalog", () => {
  /**
   * Regresi yang diperbaiki kolom `city`: filter dulu memakai
   * `provider.location contains <query>` sehingga potongan alamat seperti "Jl"
   * mencocokkan seluruh katalog. Test ini membandingkan jumlah hasil lewat API
   * agar tidak bergantung pada paginasi UI.
   */
  test("penggal alamat tidak lagi mengembalikan seluruh katalog", async ({
    request,
  }) => {
    const all = await request.get("/api/services")
    expect(all.ok()).toBeTruthy()
    const total = (await all.json()).total as number
    expect(total).toBeGreaterThan(0)

    for (const query of ["Jl", "No"]) {
      const res = await request.get(`/api/services?location=${query}`)
      expect(res.ok()).toBeTruthy()
      const filtered = (await res.json()).total as number
      expect(filtered, `location=${query} tidak boleh mengembalikan semua`).toBeLessThan(
        total
      )
    }
  })

  test("nama daerah cocok tanpa peduli huruf besar-kecil", async ({ request }) => {
    const counts: number[] = []

    for (const query of ["pangkal pinang", "Pangkal Pinang", "PANGKAL PINANG"]) {
      const res = await request.get(
        `/api/services?location=${encodeURIComponent(query)}`
      )
      expect(res.ok()).toBeTruthy()
      counts.push((await res.json()).total as number)
    }

    expect(counts[0]).toBeGreaterThan(0)
    // Ketiganya harus identik. Sebelum normalisasi, ini akan pecah karena
    // kolom `city` tidak dibandingkan case-insensitive.
    expect(new Set(counts).size, `hasil beda per kapitalisasi: ${counts}`).toBe(1)
  })

  test("kabupaten berawalan sama tidak ikut terbawa (pencocokan eksak)", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/services?location=${encodeURIComponent("Kabupaten Bangka")}`
    )
    expect(res.ok()).toBeTruthy()
    const body = (await res.json()) as {
      total: number
      services?: { provider?: { city?: string | null } }[]
    }
    expect(body.total).toBeGreaterThan(0)
    // `contains "kabupaten bangka"` juga cocok dengan Bangka Barat/Tengah/
    // Selatan — semuanya harus tersaring keluar oleh mode eksak.
    for (const service of body.services ?? []) {
      expect(service.provider?.city, "hanya Kabupaten Bangka").toBe(
        "kabupaten bangka"
      )
    }
  })

  test("nama provinsi melepas filter lokasi, bukan mengembalikan nol", async ({
    request,
  }) => {
    const all = await request.get("/api/services")
    const total = (await all.json()).total as number
    expect(total).toBeGreaterThan(0)

    const res = await request.get(
      `/api/services?location=${encodeURIComponent("Kepulauan Bangka Belitung")}`
    )
    expect(res.ok()).toBeTruthy()
    expect((await res.json()).total as number).toBe(total)
  })

  test("nama ibu kota sama hasilnya dengan nama kabupatennya", async ({
    request,
  }) => {
    const pairs: [capital: string, regency: string][] = [
      ["Sungailiat", "Kabupaten Bangka"],
      ["Muntok", "Kabupaten Bangka Barat"],
      ["Koba", "Kabupaten Bangka Tengah"],
      ["Toboali", "Kabupaten Bangka Selatan"],
      ["Tanjung Pandan", "Kabupaten Belitung"],
      ["Manggar", "Kabupaten Belitung Timur"],
    ]

    for (const [capital, regency] of pairs) {
      const byCapital = await request.get(
        `/api/services?location=${encodeURIComponent(capital)}`
      )
      const byRegency = await request.get(
        `/api/services?location=${encodeURIComponent(regency)}`
      )
      expect(byCapital.ok()).toBeTruthy()

      const capitalTotal = (await byCapital.json()).total as number
      const regencyTotal = (await byRegency.json()).total as number

      // Sebelum ibu kota dipetakan ke kabupatennya, `Sungailiat` dikirim utuh
      // sebagai pencarian `contains` sementara kolom `city` berisi
      // "kabupaten bangka" — hasilnya NOL sementara chip berlabel sama
      // menampilkan enam jasa.
      expect(capitalTotal, `location=${capital} mengembalikan nol`).toBeGreaterThan(0)
      expect(
        capitalTotal,
        `${capital} dan ${regency} harus menunjuk himpunan yang sama`
      ).toBe(regencyTotal)
    }
  })

  test("judul jasa menyebut daerah penyedianya, bukan daerah lain", async ({
    request,
  }) => {
    // Penjaga penyimpangan data: filter lokasi memakai `provider.city`, judul
    // jasa diturunkan dari slug. Bila keduanya berbeda, menyaring satu
    // kabupaten menampilkan jasa berjudul kabupaten lain — dan totalnya tetap
    // benar, jadi tidak ada angka yang mencurigakan untuk disadari.
    const tokens: Record<string, string> = {
      "pangkal-pinang": "pangkal pinang",
      sungailiat: "kabupaten bangka",
      muntok: "kabupaten bangka barat",
      koba: "kabupaten bangka tengah",
      toboali: "kabupaten bangka selatan",
      "tanjung-pandan": "kabupaten belitung",
      manggar: "kabupaten belitung timur",
    }

    const services: { slug: string; provider?: { city?: string | null } }[] = []
    let page = 1
    let totalPages = 1
    do {
      const res = await request.get(`/api/services?page=${page}`)
      expect(res.ok()).toBeTruthy()
      const body = (await res.json()) as {
        services: typeof services
        totalPages: number
      }
      services.push(...body.services)
      totalPages = body.totalPages
      page++
    } while (page <= totalPages)

    expect(services.length).toBeGreaterThan(0)

    const offenders: string[] = []
    let checked = 0
    for (const service of services) {
      const named = [
        ...new Set(
          Object.entries(tokens)
            .filter(([token]) => service.slug.includes(token))
            .map(([, city]) => city)
        ),
      ]
      if (named.length === 0) continue
      checked++
      const city = service.provider?.city
      if (named.length > 1 || city !== named[0]) {
        offenders.push(`${service.slug} menyebut ${named.join(" &")} — city "${city}"`)
      }
    }

    expect(checked, "tidak ada jasa yang menyebut nama daerah").toBeGreaterThan(0)
    expect(offenders).toEqual([])
  })

  test("empty state lokasi menawarkan jalan keluar ke seluruh provinsi", async ({
    page,
  }) => {
    // "Lihat semua daerah" menggantikan tautan luar provinsi yang dulu ada di
    // sini ("Lihat Kepulauan Riau") — sisa cakupan nasional, dan bagi pengguna
    // ia melempar keluar dari wilayah layanan.
    await page.goto("/services?location=Bandung")
    await expect(page.getByText(/Tidak ada jasa yang cocok/i)).toBeVisible()

    await page.getByRole("button", { name: "Lihat semua daerah" }).click()

    await expect(page).toHaveURL((url) => !url.searchParams.has("location"))
    await expect(page.getByText(/\d+ jasa ditemukan/)).toBeVisible()
  })
})
