import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole } from "@/lib/roles"

export const dynamic = "force-dynamic"

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value)
  // Cegah formula injection saat CSV dibuka di Excel/Sheets: sel yang dimulai
  // dengan = + - @ tab atau CR dieksekusi sebagai formula. Angka murni
  // (termasuk negatif) dikecualikan agar kolom harga tetap numerik.
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(s)
  const neutralized =
    !isPlainNumber && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`
  }
  return neutralized
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { role: true },
  })
  if (!isAdminRole(user?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const limited = enforceRateLimit(
    request,
    "admin-export",
    RATE_LIMITS.adminExport,
    session.user.id
  )
  if (limited) return limited

  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: { select: { name: true, email: true } },
        service: {
          include: {
            provider: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const header = [
      "ID",
      "Jasa",
      "Kategori",
      "Customer",
      "Email Customer",
      "Provider",
      "Status",
      "Total",
      "Metode Bayar",
      "Dibuat",
      "Selesai",
    ]

    const rows = orders.map((o) => [
      o.id,
      o.service.title,
      o.service.category.name,
      o.customer.name ?? "-",
      o.customer.email,
      o.service.provider.name ?? "-",
      o.status,
      o.totalPrice,
      o.paymentMethod ?? "-",
      o.createdAt.toISOString(),
      o.completedAt ? o.completedAt.toISOString() : "-",
    ])

    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n")

    const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[admin/export] GET error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
