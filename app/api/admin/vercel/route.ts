import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole } from "@/lib/roles"
import { readBuildGateConfiguration } from "@/lib/vercel-build-gate"
import {
  fetchVercelDeployments,
  resolveVercelCredentials,
  type DeploymentSummary,
} from "@/lib/vercel-deployments"

export const dynamic = "force-dynamic"

/**
 * Status gerbang build + deployment terakhir.
 *
 * Endpoint ini hanya meneruskan apa yang dikatakan Vercel. Ia tidak menebak
 * apakah sebuah deployment "dilewati oleh Ignored Build Step": API Vercel
 * memakai status `CANCELED` untuk pembatalan manual juga, jadi UI menyebutnya
 * apa adanya.
 */
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
    "admin-vercel",
    RATE_LIMITS.adminRead,
    session.user.id
  )
  if (limited) return limited

  const gate = readBuildGateConfiguration()
  const credentials = resolveVercelCredentials(process.env)

  if (!credentials.configured || !credentials.token || !credentials.projectId) {
    return NextResponse.json({
      gate,
      vercel: {
        configured: false,
        missingEnvVars: credentials.missingEnvVars,
        deployments: [] satisfies DeploymentSummary[],
        error: null,
      },
    })
  }

  try {
    const deployments = await fetchVercelDeployments({
      token: credentials.token,
      projectId: credentials.projectId,
      teamId: credentials.teamId,
      limit: 12,
    })

    return NextResponse.json({
      gate,
      vercel: {
        configured: true,
        missingEnvVars: [],
        deployments,
        error: null,
      },
    })
  } catch (error) {
    // Status 200 disengaja: halaman tetap harus bisa menampilkan konfigurasi
    // gerbang walau Vercel sedang tidak bisa dihubungi.
    return NextResponse.json({
      gate,
      vercel: {
        configured: true,
        missingEnvVars: [],
        deployments: [] satisfies DeploymentSummary[],
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghubungi Vercel API.",
      },
    })
  }
}
