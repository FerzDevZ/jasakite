import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// In-memory rate limit untuk login per email: 10 attempts per 15 menit (longgar untuk demo).
// authorize tidak punya akses ke Request, jadi tidak bisa pakai enforceRateLimit.
// Map<email, number[]> menyimpan timestamp attempts yang gagal.
const LOGIN_RATE_LIMIT_MAX = 10
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const loginAttempts = new Map<string, number[]>()

function isLoginRateLimited(email: string): boolean {
  const now = Date.now()
  const attempts = loginAttempts.get(email) ?? []
  const recent = attempts.filter((ts) => now - ts < LOGIN_RATE_LIMIT_WINDOW_MS)
  // bersihkan entry kadaluarsa
  if (recent.length !== attempts.length) {
    if (recent.length === 0) loginAttempts.delete(email)
    else loginAttempts.set(email, recent)
  }
  return recent.length >= LOGIN_RATE_LIMIT_MAX
}

function recordLoginAttempt(email: string): void {
  const now = Date.now()
  const attempts = loginAttempts.get(email) ?? []
  const recent = attempts.filter((ts) => now - ts < LOGIN_RATE_LIMIT_WINDOW_MS)
  recent.push(now)
  loginAttempts.set(email, recent)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Jangan spam log untuk salah password — CredentialsSignin adalah flow normal
  logger: {
    error(error) {
      const msg = String((error as unknown as { message?: string })?.message ?? error)
      if (msg.includes("CredentialsSignin")) return
      console.error("[auth][error]", error)
    },
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = String(credentials.email).toLowerCase().trim()

        if (isLoginRateLimited(email)) {
          console.warn(`[auth] login rate-limited for ${email}`)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) {
          recordLoginAttempt(email)
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          recordLoginAttempt(email)
          return null
        }

        // sukses: bersihkan hitungan
        loginAttempts.delete(email)

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatarUrl ?? undefined,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.picture = (user as { image?: string }).image ?? token.picture
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? ""
        session.user.role =
          ((token.role as "CUSTOMER" | "PROVIDER" | "ADMIN") ?? "CUSTOMER")
        if (token.picture) session.user.image = token.picture as string
        if (token.impersonatorId) {
          session.user.impersonatedBy = token.impersonatorId as string
        }
      }
      return session
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
})
