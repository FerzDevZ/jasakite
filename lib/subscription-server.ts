/**
 * Operasi database langganan penyedia.
 *
 * Semua perubahan saldo di sini memakai pola yang sama dengan penarikan saldo
 * (app/api/wallet/withdraw): debit kondisional `balance >= amount` di dalam
 * transaksi, lalu penulisan ledger. Tidak ada tempat lain yang boleh menulis
 * `User.subscriptionUntil` selain fungsi di file ini, supaya catatan
 * ProviderSubscription, ledger dompet, dan tanggal aktif tidak pernah
 * berbeda cerita.
 */

import prisma from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import { notify } from "@/lib/notifications"
import {
  MONTHLY_PRICE_SETTING_KEY,
  DEFAULT_MONTHLY_PRICE,
  canChargeSubscription,
  isDueForRenewal,
  parseMonthlyPrice,
  planCharge,
  RENEWAL_WINDOW_DAYS,
  describeSubscription,
  formatRupiah,
} from "@/lib/subscription"

export async function getMonthlyPrice(): Promise<number> {
  const setting = await prisma.platformSetting.findUnique({
    where: { key: MONTHLY_PRICE_SETTING_KEY },
    select: { value: true },
  })
  if (!setting) return DEFAULT_MONTHLY_PRICE
  const parsed = parseMonthlyPrice(setting.value)
  // Nilai rusak di database tidak boleh membuat seluruh alur pendaftaran
  // penyedia gagal; kembali ke harga bawaan dan biarkan admin memperbaikinya.
  return parsed.ok ? parsed.price : DEFAULT_MONTHLY_PRICE
}

export async function setMonthlyPrice(
  rawPrice: unknown,
  updatedById: string
): Promise<{ ok: true; price: number } | { ok: false; error: string }> {
  const parsed = parseMonthlyPrice(rawPrice)
  if (!parsed.ok) return parsed

  await prisma.platformSetting.upsert({
    where: { key: MONTHLY_PRICE_SETTING_KEY },
    create: {
      key: MONTHLY_PRICE_SETTING_KEY,
      value: String(parsed.price),
      updatedById: prismaId(updatedById),
    },
    update: {
      value: String(parsed.price),
      updatedById: prismaId(updatedById),
    },
  })

  return { ok: true, price: parsed.price }
}

export type ChargeOutcome =
  | {
      status: "CHARGED"
      amount: number
      periodEnd: Date
      balanceAfter: number
    }
  | { status: "INSUFFICIENT"; required: number; balance: number }
  | { status: "NOT_PROVIDER" }

/**
 * Potong saldo penyedia untuk satu periode langganan.
 *
 * `providerId` boleh berupa id mentah maupun id ter-encode; `prismaId`
 * menormalkannya. Pemanggil bertanggung jawab atas otorisasi (pemilik akun
 * atau cron), bukan fungsi ini.
 */
export async function chargeProviderSubscription(
  providerId: string,
  options: { source?: "AUTO_DEBIT" | "ADMIN_GRANT"; actorId?: string | null } = {}
): Promise<ChargeOutcome> {
  const userId = prismaId(providerId)
  const price = options.source === "ADMIN_GRANT" ? 0 : await getMonthlyPrice()

  const provider = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, balance: true, subscriptionUntil: true },
  })
  if (!provider || provider.role !== "PROVIDER") return { status: "NOT_PROVIDER" }

  if (
    options.source !== "ADMIN_GRANT" &&
    !canChargeSubscription(provider.balance, price)
  ) {
    return { status: "INSUFFICIENT", required: price, balance: provider.balance }
  }

  const { periodStart, periodEnd } = planCharge(
    provider.subscriptionUntil,
    price
  )

  const result = await prisma.$transaction(async (tx) => {
    let balanceAfter = provider.balance
    let walletTransactionId: string | null = null

    if (price > 0) {
      const debited = await tx.user.updateMany({
        where: { id: userId, balance: { gte: price } },
        data: { balance: { decrement: price } },
      })
      if (debited.count === 0) {
        throw Object.assign(new Error("Saldo tidak mencukupi"), {
          code: "INSUFFICIENT",
        })
      }
      const refreshed = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      })
      if (!refreshed) throw new Error("Pengguna hilang setelah debit")
      balanceAfter = refreshed.balance

      const ledger = await tx.walletTransaction.create({
        data: {
          userId,
          type: "SUBSCRIPTION",
          status: "VERIFIED",
          amount: price,
          balanceAfter,
        },
      })
      walletTransactionId = ledger.id
    }

    await tx.user.update({
      where: { id: userId },
      data: { subscriptionUntil: periodEnd },
    })

    await tx.providerSubscription.create({
      data: {
        providerId: userId,
        amount: price,
        periodStart,
        periodEnd,
        status: "ACTIVE",
        source: options.source ?? "AUTO_DEBIT",
        walletTransactionId,
        createdById: options.actorId ? prismaId(options.actorId) : null,
      },
    })

    return { balanceAfter }
  })

  await notify({
    userId,
    type: "SYSTEM",
    title: "Langganan penyedia diperpanjang",
    body:
      price > 0
        ? `${formatRupiah(price)} dipotong dari saldo. Aktif sampai ${periodEnd.toLocaleDateString(
            "id-ID",
            { day: "numeric", month: "long", year: "numeric" }
          )}.`
        : `Masa aktif gratis sampai ${periodEnd.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}.`,
    href: "/dashboard/provider/langganan",
  })

  return {
    status: "CHARGED",
    amount: price,
    periodEnd,
    balanceAfter: result.balanceAfter,
  }
}

export type RenewalSummary = {
  checked: number
  charged: number
  insufficient: number
  totalCollected: number
}

/**
 * Perpanjangan otomatis untuk semua penyedia yang jatuh tempo.
 *
 * Dipanggil cron harian Vercel (`/api/cron/subscription`). Idempoten: penyedia
 * yang saldonya tidak cukup ditandai EXPIRED dan diberi satu notifikasi —
 * bukan dicoba berulang setiap kali cron berjalan tanpa jejak.
 */
export async function renewDueSubscriptions(
  now: Date = new Date()
): Promise<RenewalSummary> {
  const dueProviders = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      // Dokumen tanpa `subscriptionUntil` tidak cocok dengan perbandingan
      // tanggal, jadi akun yang belum pernah berlangganan tidak ikut ditagih.
      subscriptionUntil: {
        lte: new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true, subscriptionUntil: true },
    take: 500,
  })

  const due = dueProviders.filter((provider) =>
    isDueForRenewal(provider.subscriptionUntil, now)
  )

  let charged = 0
  let insufficient = 0
  let totalCollected = 0

  for (const provider of due) {
    const outcome = await chargeProviderSubscription(provider.id)
    if (outcome.status === "CHARGED") {
      charged += 1
      totalCollected += outcome.amount
      continue
    }
    if (outcome.status === "INSUFFICIENT") {
      insufficient += 1
      await markSubscriptionExpired(provider.id)
    }
  }

  return { checked: due.length, charged, insufficient, totalCollected }
}

/**
 * Tandai langganan terakhir sebagai EXPIRED dan beri tahu penyedia.
 * Pengulangan aman: hanya mengirim notifikasi saat status benar-benar berubah.
 */
export async function markSubscriptionExpired(
  providerId: string
): Promise<boolean> {
  const userId = prismaId(providerId)
  const latest = await prisma.providerSubscription.findFirst({
    where: { providerId: userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  })
  if (!latest || latest.status === "EXPIRED") return false

  await prisma.providerSubscription.update({
    where: { id: latest.id },
    data: { status: "EXPIRED" },
  })

  const price = await getMonthlyPrice()
  await notify({
    userId,
    type: "SYSTEM",
    title: "Langganan penyedia berakhir",
    body: `Saldo dompet tidak cukup untuk ${formatRupiah(
      price
    )} bulan ini, jadi jasa Anda disembunyikan dari katalog. Isi saldo untuk menayangkannya lagi.`,
    href: "/dashboard/wallet",
  })
  return true
}

export type ProviderSubscriptionView = {
  state: ReturnType<typeof describeSubscription>["state"]
  label: string
  until: string | null
  daysLeft: number
  canPublish: boolean
  monthlyPrice: number
  balance: number
  history: {
    id: string
    amount: number
    periodStart: string
    periodEnd: string
    status: string
    source: string
    createdAt: string
  }[]
}

/** Ringkasan langganan untuk halaman penyedia — satu query per tabel. */
export async function getProviderSubscriptionView(
  providerId: string,
  now: Date = new Date()
): Promise<ProviderSubscriptionView | null> {
  const userId = prismaId(providerId)
  const [user, monthlyPrice, history] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, subscriptionUntil: true, role: true },
    }),
    getMonthlyPrice(),
    prisma.providerSubscription.findMany({
      where: { providerId: userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ])
  if (!user) return null

  const snapshot = describeSubscription(user.subscriptionUntil, now)

  return {
    state: snapshot.state,
    label:
      snapshot.state === "ACTIVE" && user.subscriptionUntil
        ? `Aktif sampai ${user.subscriptionUntil.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}`
        : snapshot.state === "EXPIRED" && user.subscriptionUntil
          ? `Berakhir ${user.subscriptionUntil.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`
          : "Belum berlangganan",
    until: user.subscriptionUntil ? user.subscriptionUntil.toISOString() : null,
    daysLeft: snapshot.daysLeft,
    canPublish: snapshot.canPublish,
    monthlyPrice,
    balance: user.balance,
    history: history.map((row) => ({
      id: row.id,
      amount: row.amount,
      periodStart: row.periodStart.toISOString(),
      periodEnd: row.periodEnd.toISOString(),
      status: row.status,
      source: row.source,
      createdAt: row.createdAt.toISOString(),
    })),
  }
}
