import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId, sameId } from "@/lib/ids"
import { generateOrderCode } from "@/lib/order-code"
import { notify } from "@/lib/notifications"
import {
  MAX_CART_LINES,
  apportionDiscount,
  clampQty,
  resolveUnitPrice,
} from "@/lib/cart"
import {
  checkVoucher,
  totalAfterDiscount,
  type VoucherType,
} from "@/lib/vouchers"

export const dynamic = "force-dynamic"

/**
 * Satu item yang akan dipesan. Harga TIDAK PERNAH diambil dari body — selalu
 * dibaca ulang dari database, karena apa pun yang dikirim klien bisa diubah
 * (termasuk membeli jasa Rp25 juta dengan harga Rp1).
 */
const orderItemSchema = z.object({
  serviceId: z.union([z.string().min(1), z.coerce.number().int().positive()]),
  packageId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .nullable(),
  qty: z.coerce.number().int().positive().max(20).optional(),
  note: z.string().max(300).optional().nullable(),
})

const createOrderSchema = z.object({
  /**
   * Bentuk baru: keranjang multi-item. Opsional — bentuk lama (satu `serviceId`
   * di root) tetap diterima supaya halaman detail, spec E2E lama, dan klien
   * yang belum diperbarui tidak rusak.
   */
  items: z.array(orderItemSchema).min(1).max(MAX_CART_LINES).optional(),
  serviceId: z.union([z.string().min(1), z.coerce.number().int().positive()]).optional(),
  packageId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .nullable(),
  /** Alamat tersimpan (buku alamat). Prioritas di atas `address`. */
  addressId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .nullable(),
  orderNotes: z.string().max(500).optional().nullable(),
  address: z
    .string()
    .trim()
    .min(5, "Alamat minimal 5 karakter")
    .max(500, "Alamat maksimal 500 karakter")
    .optional(),
  deadline: z
    .coerce
    .date()
    .optional()
    .nullable()
    .refine((d) => !d || d.getTime() > Date.now(), {
      message: "Jadwal harus di masa depan",
    }),
  paymentMethod: z.enum(["transfer", "ewallet", "cod", "saldo"]).optional(),
  voucherCode: z.string().trim().max(32).optional().nullable(),
  /** Hapus keranjang setelah pesanan berhasil dibuat. */
  clearCart: z.boolean().optional(),
})

/** Alamat teks dari buku alamat, dengan kota sebagai segmen TERAKHIR. */
function addressSnapshot(street: string, city: string): string {
  const display = city
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
  return `${street}, ${display}`
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "order-create",
    RATE_LIMITS.orderCreate,
    session.user.id
  )
  if (limited) return limited

  const customerId = prismaId(session.user.id)
  const createdOrderIds: string[] = []
  let claimedVoucherCode: string | null = null
  let groupId: string | null = null

  try {
    const body = await request.json()
    const validated = createOrderSchema.parse(body)

    // ── 1. Susun daftar item (bentuk baru atau lama) ──────────────────────
    const rawItems =
      validated.items ??
      (validated.serviceId
        ? [{ serviceId: validated.serviceId, packageId: validated.packageId ?? null, qty: 1 }]
        : [])

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada jasa yang dipesan" },
        { status: 400 }
      )
    }

    // ── 2. Validasi SEMUA item sebelum satu pun pesanan dibuat ───────────
    // Inilah pengganti transaksi: MongoDB tanpa replica set tidak mendukung
    // transaksi multi-dokumen, jadi kesalahan yang bisa dideteksi di depan
    // (jasa tidak aktif, paket bukan milik jasa itu, memesan jasa sendiri)
    // harus ditolak SEBELUM ada tulis apa pun. Baru setelah ini penulisan
    // berurutan dilakukan, dengan kompensasi bila di tengah gagal.
    const prepared: {
      serviceId: string
      providerId: string
      serviceTitle: string
      packageId: string | null
      packageName: string | null
      unitPrice: number
      qty: number
      note: string | null
    }[] = []

    for (const item of rawItems) {
      const serviceId = prismaId(String(item.serviceId))
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          title: true,
          price: true,
          status: true,
          providerId: true,
        },
      })
      if (!service || service.status !== "ACTIVE") {
        return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 })
      }
      if (sameId(service.providerId, customerId)) {
        return NextResponse.json(
          { error: "Tidak dapat memesan jasa sendiri" },
          { status: 400 }
        )
      }

      let packageName: string | null = null
      let packagePrice: number | null = null
      if (item.packageId) {
        const pkg = await prisma.servicePackage.findUnique({
          where: { id: prismaId(item.packageId) },
          select: { id: true, name: true, price: true, serviceId: true },
        })
        if (!pkg || !sameId(pkg.serviceId, service.id)) {
          return NextResponse.json(
            { error: "Paket tidak ditemukan untuk jasa ini" },
            { status: 404 }
          )
        }
        packageName = pkg.name
        packagePrice = pkg.price
      }

      prepared.push({
        serviceId: service.id,
        providerId: service.providerId,
        serviceTitle: service.title,
        packageId: item.packageId ? prismaId(item.packageId) : null,
        packageName,
        unitPrice: resolveUnitPrice(service.price, packagePrice),
        qty: clampQty(item.qty ?? 1),
        note: item.note ?? null,
      })
    }

    // ── 3. Alamat: buku alamat menang atas teks bebas ─────────────────────
    let addressText = validated.address ?? null
    let addressId: string | null = null
    let addressCity: string | null = null

    if (validated.addressId) {
      const address = await prisma.address.findUnique({
        where: { id: prismaId(validated.addressId) },
      })
      if (!address || !sameId(address.userId, customerId)) {
        return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 })
      }
      addressText = addressSnapshot(address.street, address.city)
      addressId = address.id
      addressCity = address.city
    } else if (addressText) {
      const lastSegment = addressText.split(",").pop()?.trim().toLowerCase() ?? null
      addressCity = lastSegment
    }

    if (!addressText) {
      return NextResponse.json(
        { error: "Alamat lengkap wajib diisi" },
        { status: 400 }
      )
    }

    // ── 4. Harga & voucher dihitung dari data server ──────────────────────
    const lineSubtotals = prepared.map((item) => item.unitPrice * item.qty)
    const subtotal = lineSubtotals.reduce((sum, value) => sum + value, 0)

    let discount = 0
    let voucherCode: string | null = null
    if (validated.voucherCode) {
      const voucher = await prisma.voucher.findUnique({
        where: { code: validated.voucherCode.trim().toUpperCase() },
      })
      if (!voucher) {
        return NextResponse.json({ error: "Kode voucher tidak dikenal" }, { status: 400 })
      }
      const redemptions = await prisma.voucherRedemption.count({
        where: { voucherCode: voucher.code, userId: customerId },
      })
      const check = checkVoucher(
        {
          code: voucher.code,
          type: voucher.type as VoucherType,
          value: voucher.value,
          minSpend: voucher.minSpend,
          maxDiscount: voucher.maxDiscount,
          scopeCity: voucher.scopeCity,
          isActive: voucher.isActive,
          startsAt: voucher.startsAt,
          endsAt: voucher.endsAt,
          quota: voucher.quota,
          usedCount: voucher.usedCount,
          perUser: voucher.perUser,
          userRedemptions: redemptions,
        },
        subtotal,
        addressCity
      )
      if (!check.ok) {
        return NextResponse.json({ error: check.reason }, { status: 400 })
      }
      discount = check.discount
      voucherCode = voucher.code
    }

    const shares = apportionDiscount(lineSubtotals, discount)
    groupId = `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`

    // ── 4b. Cek saldo awal untuk pembayaran dompet ────────────────────────
    // Pemeriksaan cepat SEBELUM pesanan dibuat supaya pengguna dengan saldo
    // kurang tidak menjalani seluruh penulisan lalu di-rollback. Pemeriksaan
    // FINAL tetap berupa debit atomik di langkah 6b — cek ini hanya jalur
    // cepat, bukan pengaman.
    const payableTotal = totalAfterDiscount(subtotal, discount)
    if (validated.paymentMethod === "saldo") {
      const walletUser = await prisma.user.findUnique({
        where: { id: customerId },
        select: { balance: true },
      })
      if (!walletUser || walletUser.balance < payableTotal) {
        return NextResponse.json(
          { error: "Saldo tidak mencukupi — isi saldo dulu di Dashboard › Dompet" },
          { status: 400 }
        )
      }
    }

    // ── 5. Tulis pesanan satu per satu ────────────────────────────────────
    // Dipisah per jasa karena satu pesanan hanya boleh punya satu penyedia:
    // itu yang membuat kanban penyedia dan FSM status tetap sederhana.
    for (let i = 0; i < prepared.length; i++) {
      const item = prepared[i]
      const lineSubtotal = lineSubtotals[i]
      const lineDiscount = shares[i]
      const code = await generateOrderCode()

      const order = await prisma.order.create({
        data: {
          code,
          groupId,
          customerId,
          serviceId: item.serviceId,
          packageId: item.packageId,
          packageName: item.packageName,
          unitPrice: item.unitPrice,
          qty: item.qty,
          subtotal: lineSubtotal,
          discountAmount: lineDiscount,
          voucherCode,
          totalPrice: totalAfterDiscount(lineSubtotal, lineDiscount),
          status: "PENDING",
          paymentMethod: validated.paymentMethod ?? null,
          orderNotes: item.note ?? validated.orderNotes ?? null,
          address: addressText,
          addressId,
          deadline: validated.deadline ?? null,
        },
      })
      createdOrderIds.push(order.id)

      await notify({
        userId: item.providerId,
        type: "ORDER",
        title: `Pesanan baru ${code}`,
        body: `${item.serviceTitle} — menunggu konfirmasi Anda`,
        href: `/orders/${order.id}`,
      })
    }

    // ── 6. Klaim voucher setelah pesanan ada ──────────────────────────────
    // Kuota diklaim dengan compare-and-swap pada satu dokumen: klaim sah hanya
    // bila `usedCount` masih sama dengan nilai yang dibaca tadi, sehingga dua
    // checkout bersamaan tidak bisa melewati kuota. Prisma tidak bisa
    // membandingkan dua kolom (`usedCount < quota`), jadi perbandingannya
    // dilakukan di sini dan pengamanannya pada operasi tulis.
    if (voucherCode) {
      const claim = await claimVoucherQuota(voucherCode)
      if (!claim.ok) {
        await rollback(createdOrderIds)
        return NextResponse.json({ error: claim.reason }, { status: 409 })
      }
      claimedVoucherCode = voucherCode

      try {
        await prisma.voucherRedemption.create({
          data: {
            voucherCode,
            userId: customerId,
            groupId,
            discount,
          },
        })
      } catch {
        // Kombinasi (voucher, pengguna) sudah ada → batas per pengguna.
        await rollback(createdOrderIds)
        await releaseVoucherClaim(voucherCode)
        return NextResponse.json(
          { error: "Voucher ini hanya bisa dipakai sekali" },
          { status: 409 }
        )
      }
    }

    // ── 6b. Debit saldo dompet (pembayaran "saldo") ────────────────────
    // Dilakukan SETELAH pesanan sah & voucher terklaim. Debit atomik per
    // pesanan (`balance >= linePayable`) di dalam satu transaksi — dua
    // checkout bersamaan tidak bisa membuat saldo minus. Bila salah satu
    // debit gagal, SELURUH penyelesaian batal dan pesanan di-rollback:
    // tidak ada pesanan terbayar sebagian.
    if (validated.paymentMethod === "saldo") {
      try {
        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < createdOrderIds.length; i++) {
            const linePayable = totalAfterDiscount(lineSubtotals[i], shares[i])
            const debited = await tx.user.updateMany({
              where: { id: customerId, balance: { gte: linePayable } },
              data: { balance: { decrement: linePayable } },
            })
            if (debited.count === 0) {
              throw Object.assign(new Error("Saldo tidak mencukupi"), {
                code: "INSUFFICIENT",
              })
            }
            const walletUser = await tx.user.findUnique({
              where: { id: customerId },
              select: { balance: true },
            })
            if (!walletUser) {
              throw new Error("Pengguna tidak ditemukan setelah debit saldo")
            }
            await tx.walletTransaction.create({
              data: {
                userId: customerId,
                type: "PAYMENT",
                status: "VERIFIED",
                amount: linePayable,
                balanceAfter: walletUser.balance,
                orderId: createdOrderIds[i],
              },
            })
          }
        })
      } catch (settlementError) {
        if (
          (settlementError as unknown as { code?: string })?.code === "INSUFFICIENT"
        ) {
          await rollback(createdOrderIds)
          if (claimedVoucherCode) await releaseVoucherClaim(claimedVoucherCode)
          return NextResponse.json(
            { error: "Saldo tidak mencukupi — isi saldo lalu coba lagi" },
            { status: 409 }
          )
        }
        throw settlementError
      }
    }

    // ── 7. Bersihkan keranjang bila diminta ───────────────────────────────
    if (validated.clearCart) {
      await prisma.cartItem.deleteMany({ where: { userId: customerId } })
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: createdOrderIds } },
      include: {
        service: {
          include: {
            provider: { select: { id: true, name: true, avatarUrl: true } },
            category: true,
          },
        },
      },
    })

    // Bentuk respons lama (satu objek pesanan) dipertahankan untuk pemanggil
    // yang hanya mengirim `serviceId`: spec E2E dan halaman detail membacanya
    // sebagai objek, bukan sebagai `{ orders: [...] }`.
    if (!validated.items) {
      return NextResponse.json(orders[0] ?? null, { status: 201 })
    }

    return NextResponse.json(
      {
        groupId,
        orders,
        subtotal,
        discountAmount: discount,
        total: totalAfterDiscount(subtotal, discount),
      },
      { status: 201 }
    )
  } catch (error) {
    // Kompensasi: apa pun yang gagal setelah penulisan pertama harus
    // membersihkan pesanan yang sudah terlanjur dibuat, supaya pengguna tidak
    // mendapat pesanan "hantu" tanpa pembayaran.
    if (createdOrderIds.length > 0) await rollback(createdOrderIds)
    if (claimedVoucherCode) await releaseVoucherClaim(claimedVoucherCode)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[orders] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

/** Hapus pesanan yang baru dibuat saat pembuatan gagal di tengah jalan. */
async function rollback(orderIds: string[]): Promise<void> {
  try {
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } })
  } catch (error) {
    console.error("[orders] gagal rollback pesanan:", orderIds, error)
  }
}

/**
 * Klaim satu kuota voucher dengan compare-and-swap.
 *
 * Percobaan diulang beberapa kali karena kegagalan CAS bisa berarti "kuota
 * habis" ATAU "ada checkout lain yang menang balapan". Tanpa percobaan ulang,
 * pelanggan yang sah bisa ditolak hanya karena kebetulan bersamaan.
 */
async function claimVoucherQuota(
  code: string,
  attempts = 3
): Promise<{ ok: true } | { ok: false; reason: string }> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const voucher = await prisma.voucher.findUnique({
      where: { code },
      select: { usedCount: true, quota: true },
    })
    if (!voucher) return { ok: false, reason: "Kode voucher tidak dikenal" }
    if (voucher.quota !== null && voucher.usedCount >= voucher.quota) {
      return { ok: false, reason: "Kuota voucher sudah habis" }
    }

    const claimed = await prisma.voucher.updateMany({
      where: { code, usedCount: voucher.usedCount },
      data: { usedCount: { increment: 1 } },
    })
    if (claimed.count === 1) return { ok: true }
  }
  return { ok: false, reason: "Voucher sedang dipakai orang lain. Coba lagi." }
}

/** Kembalikan kuota voucher yang terlanjur diklaim. */
async function releaseVoucherClaim(code: string): Promise<void> {
  try {
    await prisma.voucher.updateMany({
      where: { code, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    })
  } catch (error) {
    console.error("[orders] gagal mengembalikan kuota voucher:", code, error)
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limited = enforceRateLimit(
    request,
    "orders-list",
    RATE_LIMITS.read,
    session.user.id
  )
  if (limited) return limited

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const customerId = prismaId(session.user.id)
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        ...(status && status !== "ALL" ? { status } : {}),
      },
      include: {
        service: {
          include: {
            provider: {
              select: { id: true, name: true, avatarUrl: true },
            },
            category: true,
          },
        },
        reviews: { select: { id: true, rating: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[orders] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
