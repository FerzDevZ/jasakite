import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId, sameId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole } from "@/lib/roles"

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const serviceId = prismaId(id)
  if (!String(serviceId).trim()) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 })
  }

  const limited = enforceRateLimit(
    request,
    "service-write",
    RATE_LIMITS.serviceWrite,
    session.user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const { status } = statusSchema.parse(body)

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    })
    if (!service) {
      return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 })
    }

    // Pemilik jasa boleh mengubah statusnya sendiri; ADMIN juga, karena
    // halaman moderasi mengaktifkan jasa draft milik provider lain.
    const userId = prismaId(session.user.id)
    const isOwner = sameId(service.providerId, userId)
    const isAdmin = isAdminRole(session.user.role)

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: bukan pemilik jasa" },
        { status: 403 }
      )
    }

    const updated = await prisma.service.update({
      where: { id: serviceId },
      data: { status },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    )
  }
}
