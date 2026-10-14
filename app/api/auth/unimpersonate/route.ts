import { NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"

export const dynamic = "force-dynamic"

// Nama cookie sesi ditentukan dari protokol request — sama persis dengan aturan
// Auth.js: `useSecureCookies ?? url.protocol === "https:"` (lihat @auth/core/lib/init.js)
// https → __Secure-authjs.session-token, http → authjs.session-token
function sessionCookieName(requestUrl: string) {
  return requestUrl.startsWith("https://")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id || !session.user.impersonatedBy) {
    return NextResponse.json({ error: "Tidak sedang impersonate" }, { status: 400 })
  }

  const originalId = prismaId(session.user.impersonatedBy!)

  const limited = enforceRateLimit(
    request,
    "impersonate",
    RATE_LIMITS.impersonate,
    originalId
  )
  if (limited) return limited

  let original
  try {
    original = await prisma.user.findUnique({ where: { id: originalId } })
  } catch (error) {
    console.error("[unimpersonate] DB error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
  if (!original) {
    return NextResponse.json({ error: "Akun admin asli tidak ditemukan" }, { status: 404 })
  }

  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "AUTH_SECRET belum diatur" },
      { status: 500 }
    )
  }

  const cookieName = sessionCookieName(request.url)

  let token: string
  try {
    token = await encode({
      secret,
      salt: cookieName,
      token: {
        sub: String(original.id),
        id: String(original.id),
        role: original.role,
        name: original.name,
        email: original.email,
      },
    })
  } catch (error) {
    console.error("[unimpersonate] encode error:", error)
    return NextResponse.json({ error: "Gagal memulihkan sesi admin" }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true })
  console.warn({
    audit: "impersonate.end",
    adminId: String(originalId),
    targetId: String(session.user.id),
    ip: request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    ua: request.headers.get("user-agent")?.slice(0, 120) ?? null,
    ts: new Date().toISOString(),
  })
  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieName.startsWith("__Secure-"),
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  })

  // Hapus nama cookie lawan agar tidak ada sesi ganda yang tertinggal
  const otherName = cookieName.startsWith("__Secure-")
    ? "authjs.session-token"
    : "__Secure-authjs.session-token"
  res.cookies.set(otherName, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: otherName.startsWith("__Secure-"),
    path: "/",
    maxAge: 0,
  })

  return res
}
