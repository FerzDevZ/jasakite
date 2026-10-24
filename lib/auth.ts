import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import {
  RATE_LIMITS,
  consumeGlobal,
  isFailureQuotaSpent,
  peekGlobal,
  resetGlobal,
} from "@/lib/rate-limit"
import { isSuperAdminRole } from "@/lib/roles"
import { claimTotpStep, decideMoneyAccess } from "@/lib/totp-guard"
import type { MoneyAccessDecision } from "@/lib/totp-guard"
import { getTotpEncryptionKey } from "@/lib/totp"

// Kode error langkah-kedua. Nilainya ikut muncul di query `?code=` halaman
// login, jadi tidak boleh membocorkan apa pun selain tahap yang sedang gagal —
// dan hanya terlihat setelah password benar.
class TotpChallengeRequired extends CredentialsSignin {
  code = "totp_required"
}

class TotpChallengeInvalid extends CredentialsSignin {
  code = "totp_invalid"
}

class TotpChallengeUnavailable extends CredentialsSignin {
  code = "totp_unavailable"
}

// Rate limit login per email, GLOBAL lewat MongoDB.
//
// Dulu berupa Map per proses: di Vercel, sepuluh percobaan per lambda berarti
// penyerang yang mengenai lima lambda mendapat lima puluh percobaan — batas yang
// tertulis bukan batas yang berlaku. Sekarang hitungannya satu dokumen bersama;
// uji dua-proses di tests/rate-limit-global.test.ts membuktikannya.
//
// `authorize` tidak punya akses ke Request, jadi tidak memakai
// `enforceRateLimit` — yang dipakai adalah mesin yang sama dengan kunci email.
// Hanya percobaan GAGAL yang dihitung: pemeriksaan memakai `peekGlobal` (baca
// tanpa menambah) supaya login yang berhasil tidak menghabiskan kuota, dan
// pencatatan memakai `consumeGlobal`.
const LOGIN_RATE_LIMIT = RATE_LIMITS.login

async function isLoginRateLimited(email: string): Promise<boolean> {
  const result = await peekGlobal("login", email, LOGIN_RATE_LIMIT)
  return isFailureQuotaSpent(result.count, LOGIN_RATE_LIMIT.limit)
}

async function recordLoginAttempt(email: string): Promise<void> {
  const result = await consumeGlobal("login", email, LOGIN_RATE_LIMIT)
  if (!result.ok && result.source === "mongo") {
    console.warn(`[auth] login diblokir sementara untuk ${email}`)
  }
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
      name: "Credentials",        credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Kode 6 digit dari aplikasi authenticator. Hanya diperiksa untuk
        // SUPER_ADMIN yang sudah mengaktifkan 2FA.
        totp: { label: "Kode 2FA", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = String(credentials.email).toLowerCase().trim()

        if (await isLoginRateLimited(email)) {
          console.warn(`[auth] login rate-limited for ${email}`)
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) {
          await recordLoginAttempt(email)
          return null
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValid) {
          await recordLoginAttempt(email)
          return null
        }

        if (isSuperAdminRole(user.role) && user.totpEnabledAt && user.totpSecret) {
          const submittedCode =
            typeof credentials.totp === "string" ? credentials.totp.trim() : ""
          if (!submittedCode) {
            // Password sudah benar; akun ini wajib menyelesaikan langkah kedua.
            throw new TotpChallengeRequired()
          }

          let decision: MoneyAccessDecision
          try {
            decision = decideMoneyAccess({
              account: user,
              submittedCode,
              encryptionKey: getTotpEncryptionKey(),
            })
          } catch (error) {
            console.error("[auth] 2FA tidak dapat diverifikasi:", error)
            throw new TotpChallengeUnavailable()
          }

          if (decision.kind !== "allow") {
            await recordLoginAttempt(email)
            throw new TotpChallengeInvalid()
          }
          // Kode hanya boleh dipakai sekali; kegagalan klaim berarti replay.
          const claimed = await claimTotpStep(user.id, decision.stepStartedAt)
          if (!claimed) {
            await recordLoginAttempt(email)
            throw new TotpChallengeInvalid()
          }
        }

        // sukses: bersihkan hitungan percobaan gagal di jendela ini
        await resetGlobal("login", email, LOGIN_RATE_LIMIT)

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
          ((token.role as "CUSTOMER" | "PROVIDER" | "ADMIN" | "SUPER_ADMIN") ??
            "CUSTOMER")
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
