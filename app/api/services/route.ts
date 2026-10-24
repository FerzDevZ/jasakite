import { NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { prismaId } from '@/lib/ids'
import {
  parseServicesQuery,
  hasInvalidPriceRange,
  fetchServicesPage,
} from '@/lib/services-query'
import { RATE_LIMITS, enforceRateLimit } from '@/lib/api-guard'
import { isAdminRole } from '@/lib/roles'
import { isSubscriptionActive } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, 'services-list', RATE_LIMITS.read)
  if (limited) return limited

  try {
    const q = parseServicesQuery(new URL(request.url).searchParams)
    if (hasInvalidPriceRange(q)) {
      return NextResponse.json(
        { error: 'Harga minimum tidak boleh lebih besar dari maksimum' },
        { status: 400 }
      )
    }

    const payload = await fetchServicesPage(q)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('[services] GET error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

const createServiceSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  deliveryTimeDays: z.coerce.number().int().positive(),
  categoryId: z.string().min(1).refine((v) => /^[0-9a-fA-F]{24}$/.test(v) || /^\d+$/.test(v), 'categoryId tidak valid'),
  // Hanya URL https:// whitelist; tolak data:image untuk cegah bloat (max 300KB)
  imageUrl: z.string().max(300_000, 'Gambar >300KB').optional().or(z.literal('')).refine(
    (v) => {
      if (!v) return true
      if (v.startsWith('data:image/')) return false
      try {
        const u = new URL(v); if (!['http:', 'https:'].includes(u.protocol)) return false
        const allowed = ['images.unsplash.com', 'i.pravatar.cc', 'res.cloudinary.com', 'cdn.jasakite.id']
        return allowed.some((h) => u.hostname === h || u.hostname.endsWith('.' + h))
      } catch {
        return false
      }
    },
    { message: 'Gambar >300KB atau URL gambar tidak valid atau host tidak diizinkan' }
  ),
})

export async function POST(request: Request) {
  const session = await auth()

  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id ?? '' },
    select: { id: true, role: true, subscriptionUntil: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'PROVIDER' && !isAdminRole(user.role)) {
    return NextResponse.json(
      { error: 'Hanya PROVIDER atau admin yang dapat membuat jasa' },
      { status: 403 }
    )
  }

  // Gerbang langganan: menayangkan jasa adalah layanan berbayar Rp10.000/bulan
  // (harga diatur SUPER_ADMIN). Diperiksa di server, bukan hanya di tombol UI —
  // POST bisa dipanggil langsung tanpa melewati halaman. Admin dikecualikan
  // karena akun admin tidak berlangganan.
  if (
    user.role === 'PROVIDER' &&
    !isSubscriptionActive(user.subscriptionUntil)
  ) {
    return NextResponse.json(
      {
        error:
          'Langganan penyedia belum aktif. Aktifkan dulu di Dashboard → Langganan untuk dapat menayangkan jasa.',
        code: 'SUBSCRIPTION_REQUIRED',
      },
      { status: 402 }
    )
  }

  const limited = await enforceRateLimit(
    request,
    'service-write',
    RATE_LIMITS.serviceWrite,
    user.id
  )
  if (limited) return limited

  try {
    const body = await request.json()
    const validated = createServiceSchema.parse(body)

    const slugBase = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const service = await prisma.service.create({
      data: {
        title: validated.title,
        slug: `${slugBase}-${Date.now()}`,
        description: validated.description,
        price: validated.price,
        deliveryTimeDays: validated.deliveryTimeDays,
        imageUrl: validated.imageUrl || null,
        categoryId: prismaId(validated.categoryId),
        providerId: prismaId(String(user.id)),
        status: 'ACTIVE',
      },
    })

    return NextResponse.json(service, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message ?? 'Data tidak valid' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
