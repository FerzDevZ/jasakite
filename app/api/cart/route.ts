import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId, sameId } from "@/lib/ids"
import { MAX_CART_LINES, cartSubtotal, clampQty, resolveUnitPrice } from "@/lib/cart"

export const dynamic = "force-dynamic"

/**
 * Keranjang pelanggan.
 *
 * Harga TIDAK disalin ke baris keranjang. Menyalin harga saat menambahkan item
 * berarti harga di layar bisa berbeda dengan harga yang ditagih saat pesanan
 * dibuat (penyedia menaikkan harga di antaranya) — pengguna lalu merasa
 * ditipu. Karena itu harga selalu dibaca ulang dari `Service`/`ServicePackage`
 * pada setiap pembacaan keranjang, dan `POST /api/orders` membacanya sekali
 * lagi saat menagih.
 */
type CartLinePayload = {
  id: string
  qty: number
  note: string | null
  packageId: string | null
  packageName: string | null
  unitPrice: number
  available: boolean
  service: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    price: number
    deliveryTimeDays: number
    status: string
    provider: { id: string; name: string | null; city: string | null }
    category: { name: string; slug: string }
  }
}

async function loadCart(userId: string) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  if (items.length === 0) {
    return { items: [] as CartLinePayload[], subtotal: 0, unavailableCount: 0 }
  }

  const serviceIds = [...new Set(items.map((i) => i.serviceId))]
  const packageIds = items
    .map((i) => i.packageId)
    .filter((id): id is string => Boolean(id))

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    include: {
      provider: { select: { id: true, name: true, city: true } },
      category: { select: { name: true, slug: true } },
    },
  })
  const packages = packageIds.length
    ? await prisma.servicePackage.findMany({ where: { id: { in: packageIds } } })
    : []

  const serviceById = new Map(services.map((s) => [s.id, s]))
  const packageById = new Map(packages.map((p) => [p.id, p]))

  const lines: CartLinePayload[] = []
  for (const item of items) {
    const service = serviceById.get(item.serviceId)
    // Jasa yang dihapus penyedia: baris tetap dikembalikan agar pengguna bisa
    // melihat dan menghapusnya sendiri, bukan menghilang tanpa penjelasan.
    if (!service) {
      lines.push({
        id: item.id,
        qty: item.qty,
        note: item.note,
        packageId: item.packageId,
        packageName: null,
        unitPrice: 0,
        available: false,
        service: {
          id: item.serviceId,
          title: "Jasa tidak lagi tersedia",
          slug: "",
          imageUrl: null,
          price: 0,
          deliveryTimeDays: 0,
          status: "ARCHIVED",
          provider: { id: "", name: null, city: null },
          category: { name: "-", slug: "tidak-ada" },
        },
      })
      continue
    }

    const pkg = item.packageId ? packageById.get(item.packageId) : undefined
    // Paket yang sudah tidak ada / bukan milik jasa ini: jatuh ke harga dasar
    // jasa, dan paketnya dianggap tidak dipilih.
    const packageValid = pkg && sameId(pkg.serviceId, service.id)
    if (item.packageId && !packageValid) {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { packageId: null },
      })
    }

    lines.push({
      id: item.id,
      qty: item.qty,
      note: item.note,
      packageId: packageValid ? item.packageId : null,
      packageName: packageValid ? pkg.name : null,
      unitPrice: resolveUnitPrice(service.price, packageValid ? pkg.price : null),
      available: service.status === "ACTIVE",
      service: {
        id: service.id,
        title: service.title,
        slug: service.slug,
        imageUrl: service.imageUrl,
        price: service.price,
        deliveryTimeDays: service.deliveryTimeDays,
        status: service.status,
        provider: service.provider,
        category: service.category,
      },
    })
  }

  return {
    items: lines,
    subtotal: cartSubtotal(
      lines.filter((l) => l.available).map((l) => ({ unitPrice: l.unitPrice, qty: l.qty }))
    ),
    unavailableCount: lines.filter((l) => !l.available).length,
  }
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = enforceRateLimit(request, "cart-read", RATE_LIMITS.read, session.user.id)
  if (limited) return limited

  try {
    const cart = await loadCart(prismaId(session.user.id))
    return NextResponse.json(cart)
  } catch (error) {
    console.error("[cart] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

const addSchema = z.object({
  serviceId: z.union([z.string().min(1), z.coerce.number().int().positive()]),
  packageId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .nullable(),
  qty: z.coerce.number().int().positive().max(20).optional(),
  note: z.string().max(300).optional().nullable(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = enforceRateLimit(request, "cart-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = addSchema.parse(body)
    const userId = prismaId(session.user.id)
    const serviceId = prismaId(String(validated.serviceId))

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, status: true, providerId: true },
    })
    if (!service || service.status !== "ACTIVE") {
      return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 })
    }
    if (sameId(service.providerId, userId)) {
      return NextResponse.json(
        { error: "Tidak dapat menambahkan jasa sendiri" },
        { status: 400 }
      )
    }

    if (validated.packageId) {
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: prismaId(validated.packageId) },
        select: { serviceId: true },
      })
      if (!pkg || !sameId(pkg.serviceId, service.id)) {
        return NextResponse.json(
          { error: "Paket tidak ditemukan untuk jasa ini" },
          { status: 404 }
        )
      }
    }

    const existing = await prisma.cartItem.findUnique({
      where: { userId_serviceId: { userId, serviceId } },
      select: { id: true },
    })

    if (!existing) {
      const lineCount = await prisma.cartItem.count({ where: { userId } })
      if (lineCount >= MAX_CART_LINES) {
        return NextResponse.json(
          { error: `Keranjang maksimal ${MAX_CART_LINES} jasa. Selesaikan yang ada dulu.` },
          { status: 400 }
        )
      }
    }

    // Satu baris per jasa: menambahkan ulang jasa yang sama menambah qty
    // (perilaku yang diharapkan dari keranjang), bukan membuat baris kedua.
    await prisma.cartItem.upsert({
      where: { userId_serviceId: { userId, serviceId } },
      create: {
        userId,
        serviceId,
        packageId: validated.packageId ? prismaId(validated.packageId) : null,
        qty: clampQty(validated.qty ?? 1),
        note: validated.note ?? null,
      },
      update: {
        ...(validated.packageId !== undefined
          ? { packageId: validated.packageId ? prismaId(validated.packageId) : null }
          : {}),
        ...(validated.qty !== undefined ? { qty: clampQty(validated.qty) } : {}),
        ...(validated.note !== undefined ? { note: validated.note } : {}),
      },
    })

    const cart = await loadCart(userId)
    return NextResponse.json(cart, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[cart] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

/** Kosongkan keranjang — dipakai setelah checkout berhasil. */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = enforceRateLimit(request, "cart-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    await prisma.cartItem.deleteMany({ where: { userId: prismaId(session.user.id) } })
    return NextResponse.json({ items: [], subtotal: 0, unavailableCount: 0 })
  } catch (error) {
    console.error("[cart] DELETE error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
