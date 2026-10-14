import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { cityFromLocation } from "@/lib/location"

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").regex(/^(?=.*[a-z])(?=.*\d).{8,}$/, "Harus ada huruf dan angka"),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
})

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "register", RATE_LIMITS.register)
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = registerSchema.parse(body)

    if (validated.role === "PROVIDER" && !validated.location) {
      return NextResponse.json(
        { error: "Kota/daerah wajib diisi untuk penyedia jasa" },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    })
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(validated.password, 10)

    // `city` diturunkan saat penulisan, bukan dihitung saat membaca: filter
    // katalog mencocokkan kolom ini, jadi penyedia baru harus langsung bisa
    // ditemukan tanpa menunggu backfill dijalankan lagi.
    const location = validated.location ?? null
    const parsedCity = cityFromLocation(location)

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone ?? null,
        location,
        city: parsedCity ? parsedCity.toLowerCase() : null,
        passwordHash,
        role: validated.role,
      },
    })

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      { status: 201 }
    )
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
