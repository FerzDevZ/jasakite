import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId, sameId } from "@/lib/ids"
import { clampQty } from "@/lib/cart"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  qty: z.coerce.number().int().positive().max(20).optional(),
  note: z.string().max(300).optional().nullable(),
  packageId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .nullable(),
})

/** Ubah satu baris keranjang: jumlah, catatan, atau paket yang dipilih. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(request, "cart-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    const { id } = await params
    const body = await request.json()
    const validated = patchSchema.parse(body)
    const userId = prismaId(session.user.id)

    const line = await prisma.cartItem.findUnique({ where: { id: prismaId(id) } })
    // Kepemilikan diperiksa sebelum apa pun: tanpa ini, pengguna yang tahu id
    // baris milik orang lain bisa mengubah isi keranjang mereka (IDOR).
    if (!line || !sameId(line.userId, userId)) {
      return NextResponse.json({ error: "Item keranjang tidak ditemukan" }, { status: 404 })
    }

    if (validated.packageId) {
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: prismaId(validated.packageId) },
        select: { serviceId: true },
      })
      if (!pkg || !sameId(pkg.serviceId, line.serviceId)) {
        return NextResponse.json(
          { error: "Paket tidak ditemukan untuk jasa ini" },
          { status: 404 }
        )
      }
    }

    const updated = await prisma.cartItem.update({
      where: { id: line.id },
      data: {
        ...(validated.qty !== undefined ? { qty: clampQty(validated.qty) } : {}),
        ...(validated.note !== undefined ? { note: validated.note } : {}),
        ...(validated.packageId !== undefined
          ? { packageId: validated.packageId ? prismaId(validated.packageId) : null }
          : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[cart/:id] PATCH error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(request, "cart-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    const { id } = await params
    const userId = prismaId(session.user.id)
    const line = await prisma.cartItem.findUnique({ where: { id: prismaId(id) } })
    if (!line || !sameId(line.userId, userId)) {
      return NextResponse.json({ error: "Item keranjang tidak ditemukan" }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: line.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[cart/:id] DELETE error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
