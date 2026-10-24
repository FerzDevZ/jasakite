import { expect, type APIResponse, type Page } from "@playwright/test"
import { PrismaClient } from "@prisma/client"

/**
 * Pembantu pengambilan data uji lewat API.
 *
 * Spec sebelumnya mengambil data lewat `page.evaluate(() => fetch("/api/..."))`.
 * Cara itu punya dua cacat yang membuat tes gagal walaupun aplikasinya benar:
 *
 * 1. `page.evaluate` berjalan di konteks halaman. Pada aksi pertama sebuah tes
 *    halaman masih `about:blank`, sehingga URL relatif tidak punya basis dan
 *    fetch melempar "Failed to parse URL from /api/services?take=1". Lima tes
 *    tidak mungkin pernah hijau dalam bentuk itu.
 * 2. Halaman dashboard memanggil `router.refresh()` setelah status sesi selesai
 *    dimuat. Navigasi itu membatalkan konteks eksekusi di tengah evaluasi:
 *    "Execution context was destroyed, most likely because of a navigation".
 *
 * `page.context().request` adalah APIRequestContext yang BERBAGI cookie dengan
 * browser context — jadi sesi login tetap ikut — tetapi tidak bergantung sama
 * sekali pada halaman yang sedang dirender. Kedua cacat hilang sekaligus.
 */

export type ServiceRow = {
  id: string
  slug: string
  title: string
  provider: { id: string; name: string | null }
}

const BORROWED_ADDRESS =
  "Jl. Pesan Uji No.1, Pangkal Pinang, Kepulauan Bangka Belitung"

/**
 * GET dengan SATU percobaan ulang bila SOKET-nya yang gagal.
 *
 * `page.context().request` memakai undici dengan keep-alive. Bila server
 * kebetulan menutup soket yang sedang dipakai ulang, permintaan gagal dengan
 * "read ECONNRESET" — padahal server sehat: tes lain di berkas yang sama lolos
 * sedetik kemudian. Itu flake transport, bukan cacat aplikasi.
 *
 * Yang TIDAK diulang: status HTTP. 401/403/404/500 adalah jawaban sah dari
 * aplikasi dan harus tetap terlihat oleh tes.
 */
export async function apiGet(page: Page, path: string): Promise<APIResponse> {
  try {
    return await page.context().request.get(path)
  } catch {
    return page.context().request.get(path)
  }
}

async function expectOk(res: APIResponse, label: string): Promise<APIResponse> {
  expect(res.ok(), `${label} gagal: HTTP ${res.status()}`).toBeTruthy()
  return res
}

/**
 * Header CSRF.
 *
 * `middleware.ts` menolak setiap POST ke `/api/*` yang bukan route NextAuth
 * bila cookie `csrf-token` tidak diiringi header bernama sama. Aplikasinya
 * memakai `csrfFetch()`; helper ini adalah padanannya untuk tes.
 *
 * Tanpa ini pemeriksaan mengembalikan 403 dan tes menyimpulkan hal yang salah
 * tentang validasi aplikasi — misalnya mengharapkan 400 untuk jadwal masa lalu
 * tetapi menerima 403 dari middleware, lalu menyalahkan validasi tanggal.
 */
export async function csrfHeaders(page: Page): Promise<Record<string, string>> {
  const token = (await page.context().cookies()).find((c) => c.name === "csrf-token")?.value
  return token ? { "x-csrf-token": token } : {}
}

export async function postJson(
  page: Page,
  path: string,
  data: unknown
): Promise<APIResponse> {
  return page.context().request.post(path, {
    data,
    headers: { ...(await csrfHeaders(page)), "Content-Type": "application/json" },
  })
}

/** Padanan `postJson` untuk PATCH — dipakai uji transisi status dari sisi API. */
export async function patchJson(
  page: Page,
  path: string,
  data: unknown
): Promise<APIResponse> {
  return page.context().request.patch(path, {
    data,
    headers: { ...(await csrfHeaders(page)), "Content-Type": "application/json" },
  })
}

/** `/api/services` selalu memfilter status ACTIVE, jadi seluruh baris aktif. */
export async function listServices(page: Page): Promise<ServiceRow[]> {
  const res = await expectOk(await apiGet(page, "/api/services?take=12"), "GET /api/services")
  const body = (await res.json()) as { services?: ServiceRow[] }
  return body.services ?? []
}

/** Jasa aktif pertama yang TIDAK dimiliki provider bernama `excludeProvider`. */
export async function serviceNotOwnedBy(
  page: Page,
  excludeProvider: string
): Promise<ServiceRow> {
  const rows = await listServices(page)
  const row = rows.find((s) => s.provider?.name !== excludeProvider) ?? rows[0]
  expect(row, "butuh minimal satu jasa aktif").toBeTruthy()
  return row
}

/**
 * Jasa aktif milik provider bernama `providerName`.
 * `/api/services?search=` mencocokkan nama provider DAN status ACTIVE, jadi satu
 * permintaan menyelesaikan keduanya — jasa pertama di katalog bisa milik orang
 * lain, dan jasa milik provider bisa berstatus DRAFT.
 */
export async function serviceOwnedBy(
  page: Page,
  providerName: string
): Promise<ServiceRow> {
  const res = await expectOk(
    await apiGet(page, `/api/services?search=${encodeURIComponent(providerName)}`),
    `GET /api/services?search=${providerName}`
  )
  const body = (await res.json()) as { services?: ServiceRow[] }
  const row = body.services?.[0]
  if (!row) {
    // Melempar (bukan hanya expect) juga mempersempit tipe untuk pemanggil —
    // sekaligus menggagalkan tes dengan pesan yang menyebut penyebabnya.
    throw new Error(`provider "${providerName}" harus punya jasa aktif`)
  }
  return row
}

/** Semua pesanan milik user yang sedang login. */
export async function listOrders(
  page: Page
): Promise<{ id: string; status: string; service?: { provider?: { id: string } } }[]> {
  const res = await apiGet(page, "/api/orders")
  if (!res.ok()) return []
  return (await res.json()) as {
    id: string
    status: string
    service?: { provider?: { id: string } }
  }[]
}

export async function orderStatus(page: Page, orderId: string): Promise<string | null> {
  const res = await apiGet(page, `/api/orders/${orderId}`)
  if (!res.ok()) return null
  return ((await res.json()) as { status?: string }).status ?? null
}

/**
 * Pastikan ada satu pesanan antara customer yang sedang login dan provider uji.
 *
 * Mencari yang sudah ada lebih dulu — memakai pesanan pertama customer apa
 * adanya tidak cukup, karena pesanan itu bisa milik provider lain sehingga
 * provider uji tidak akan pernah melihatnya.
 */
export async function ensureOrderWithProvider(
  page: Page,
  providerName: string
): Promise<string> {
  const service = await serviceOwnedBy(page, providerName)

  const existing = (await listOrders(page)).find(
    (o) => String(o.service?.provider?.id) === String(service.provider.id)
  )
  if (existing) return String(existing.id)

  const res = await postJson(page, "/api/orders", {
    serviceId: service.id,
    address: BORROWED_ADDRESS,
    orderNotes: "Pesanan uji otomatis E2E",
  })
  await expectOk(res, "POST /api/orders")
  return String(((await res.json()) as { id: string }).id)
}

let fixtureDb: PrismaClient | null = null

function db(): PrismaClient {
  fixtureDb ??= new PrismaClient()
  return fixtureDb
}

/**
 * Tandai pembayaran pesanan uji sudah diverifikasi SUPER_ADMIN.
 *
 * Penyedia hanya boleh memulai kerja setelah `paymentStatus = PAID`
 * (`canProviderStart` di lib/payments.ts), dan satu-satunya jalur aplikasi ke
 * status itu adalah unggah bukti QRIS + verifikasi admin ber-TOTP. Aturan itu
 * sudah diuji unit di tests/payments.test.ts, jadi spec E2E yang subjeknya
 * mesin status pesanan (kanban, notifikasi, siklus hidup) tidak perlu memutar
 * ulang alur verifikasi manual; mereka mulai dari keadaan "sudah dibayar".
 *
 * Ini fixture data, bukan jalan pintas produksi: tidak ada kode aplikasi yang
 * menulis `PAID` tanpa verifikasi.
 */
export async function markOrderPaid(orderId: string): Promise<void> {
  await db().order.update({
    where: { id: orderId },
    data: { paymentStatus: "PAID" },
  })
}

/**
 * Selalu MEMBUAT pesanan baru (bukan memakai yang ada) — untuk tes yang butuh
 * status awal PENDING yang pasti.
 */
export async function createOrderWithProvider(
  page: Page,
  providerName: string
): Promise<string | null> {
  const service = await serviceOwnedBy(page, providerName)
  const res = await postJson(page, "/api/orders", {
    serviceId: service.id,
    address: BORROWED_ADDRESS,
    orderNotes: "Pesanan uji kanban",
  })
  if (!res.ok()) return null
  const orderId = String(((await res.json()) as { id: string }).id)
  await markOrderPaid(orderId)
  return orderId
}

/** Slug jasa yang disimpan user yang sedang login. */
export async function savedSlugs(page: Page): Promise<string[]> {
  const res = await apiGet(page, "/api/saved")
  if (!res.ok()) return []
  return ((await res.json()) as { slug: string }[]).map((s) => s.slug)
}

/** Buang jasa dari simpanan bila sudah tersimpan, agar toggle benar-benar berganti. */
export async function unsaveIfSaved(page: Page, serviceId: string): Promise<void> {
  const res = await apiGet(page, `/api/saved?id=${serviceId}`)
  const body = (await res.json().catch(() => ({ saved: false }))) as { saved?: boolean }
  if (body.saved) await postJson(page, "/api/saved", { serviceId })
}

/** Jasa DRAFT pertama (khusus ADMIN) untuk uji moderasi. */
export async function firstDraftService(
  page: Page
): Promise<{ id: string; title: string; slug: string } | null> {
  const res = await apiGet(page, "/api/admin/stats")
  if (!res.ok()) return null
  const body = (await res.json()) as { draftServices?: { id: string; title: string; slug: string }[] }
  return body.draftServices?.[0] ?? null
}
