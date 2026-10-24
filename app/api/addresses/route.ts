import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { prismaId } from "@/lib/ids"
import { canonicalArea, PROVINCE } from "@/lib/provinces"

export const dynamic = "force-dynamic"

/**
 * Buku alamat pelanggan.
 *
 * Kota wajib salah satu dari 7 kabupaten/kota Provinsi Kepulauan Bangka
 * Belitung, dan disimpan lowercase supaya sama persis dengan `User.city` yang
 * dipakai filter katalog. Tanpa normalisasi ini, alamat "Kota Pangkal Pinang"
 * akan tersimpan apa adanya dan jasa penyedia di "pangkal pinang" tidak pernah
 * cocok — kelas bug yang sudah pernah terjadi di proyek ini pada kolom `city`.
 */
const addressSchema = z.object({
  label: z.string().trim().min(1, "Nama alamat wajib diisi").max(30),
  recipient: z.string().trim().min(2, "Nama penerima wajib diisi").max(80),
  phone: z
    .string()
    .trim()
    .min(8, "Nomor telepon minimal 8 digit")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Nomor telepon hanya boleh angka dan tanda + - ( )"),
  street: z.string().trim().min(5, "Alamat minimal 5 karakter").max(300),
  city: z.string().trim().min(3, "Kabupaten/kota wajib diisi"),
  note: z.string().trim().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
})

function normalizeCity(input: string): string | null {
  const canonical = canonicalArea(input)
  if (!canonical) return null
  return canonical.toLowerCase()
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(request, "address-read", RATE_LIMITS.read, session.user.id)
  if (limited) return limited

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: prismaId(session.user.id) },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    })
    return NextResponse.json({ addresses, province: PROVINCE })
  } catch (error) {
    console.error("[addresses] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const limited = await enforceRateLimit(request, "address-write", RATE_LIMITS.cart, session.user.id)
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = addressSchema.parse(body)
    const userId = prismaId(session.user.id)

    const city = normalizeCity(validated.city)
    if (!city) {
      return NextResponse.json(
        {
          error:
            "Kabupaten/kota harus salah satu dari 7 daerah di Provinsi Kepulauan Bangka Belitung",
        },
        { status: 400 }
      )
    }

    const existingCount = await prisma.address.count({ where: { userId } })
    // Alamat pertama otomatis menjadi default: tanpa ini pengguna baru punya
    // alamat tetapi checkout tetap meminta memilih, dan tidak ada yang tersorot.
    const isDefault = validated.isDefault ?? existingCount === 0

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const address = await prisma.address.create({
      data: {
        userId,
        label: validated.label,
        recipient: validated.recipient,
        phone: validated.phone,
        street: validated.street,
        city,
        note: validated.note ?? null,
        isDefault,
      },
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? "Data tidak valid" },
        { status: 400 }
      )
    }
    console.error("[addresses] POST error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
