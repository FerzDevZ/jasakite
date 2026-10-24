import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId, sameId } from "@/lib/ids"
import { canonicalArea } from "@/lib/provinces"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  label: z.string().trim().min(1).max(30).optional(),
  recipient: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Nomor telepon hanya boleh angka dan tanda + - ( )")
    .optional(),
  street: z.string().trim().min(5).max(300).optional(),
  city: z.string().trim().min(3).optional(),
  note: z.string().trim().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(request, "address-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    const { id } = await params
    const body = await request.json()
    const validated = patchSchema.parse(body)
    const userId = prismaId(session.user.id)

    const existing = await prisma.address.findUnique({ where: { id: prismaId(id) } })
    if (!existing || !sameId(existing.userId, userId)) {
      return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 })
    }

    let city: string | undefined
    if (validated.city !== undefined) {
      const canonical = canonicalArea(validated.city)
      if (!canonical) {
        return NextResponse.json(
          {
            error:
              "Kabupaten/kota harus salah satu dari 7 daerah di Provinsi Kepulauan Bangka Belitung",
          },
          { status: 400 }
        )
      }
      city = canonical.toLowerCase()
    }

    // Menjadikan alamat ini default berarti mencabut status default yang lain.
    // Tanpa langkah ini bisa ada dua alamat default dan checkout memilih salah
    // satunya secara acak berdasarkan urutan kueri.
    if (validated.isDefault === true) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, NOT: { id: existing.id } },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.update({
      where: { id: existing.id },
      data: {
        ...(validated.label !== undefined ? { label: validated.label } : {}),
        ...(validated.recipient !== undefined ? { recipient: validated.recipient } : {}),
        ...(validated.phone !== undefined ? { phone: validated.phone } : {}),
        ...(validated.street !== undefined ? { street: validated.street } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(validated.note !== undefined ? { note: validated.note } : {}),
        ...(validated.isDefault !== undefined ? { isDefault: validated.isDefault } : {}),
      },
    })

    return NextResponse.json(address)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[addresses/:id] PATCH error:", error)
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
  const limited = await enforceRateLimit(request, "address-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    const { id } = await params
    const userId = prismaId(session.user.id)

    const existing = await prisma.address.findUnique({ where: { id: prismaId(id) } })
    if (!existing || !sameId(existing.userId, userId)) {
      return NextResponse.json({ error: "Alamat tidak ditemukan" }, { status: 404 })
    }

    await prisma.address.delete({ where: { id: existing.id } })

    // Kalau yang dihapus adalah alamat default, alamat tersisa yang terbaru
    // dipromosikan supaya checkout tidak kehilangan pilihan default.
    if (existing.isDefault) {
      const next = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
      if (next) {
        await prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[addresses/:id] DELETE error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
