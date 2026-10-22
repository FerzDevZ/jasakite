/**
 * Peran pengguna JASAKITE.
 *
 * `SUPER_ADMIN` adalah peran tertinggi dan **mewarisi seluruh akses ADMIN**,
 * dengan satu tambahan yang tidak dimiliki ADMIN: keputusan uang (verifikasi
 * top-up, penarikan, dan pembayaran pesanan). Pemisahan ini disengaja —
 * operator yang mengurus katalog dan pengguna tidak otomatis bisa memindahkan
 * saldo orang lain.
 *
 * Jangan membandingkan role dengan string literal di route/UI; gunakan
 * helper di bawah agar peran baru tidak diam-diam kehilangan akses.
 */

export const USER_ROLES = [
  "CUSTOMER",
  "PROVIDER",
  "ADMIN",
  "SUPER_ADMIN",
] as const

export type UserRole = (typeof USER_ROLES)[number]

/** Peran yang boleh membuka area admin (termasuk SUPER_ADMIN). */
export const ADMIN_ROLES: readonly string[] = ["ADMIN", "SUPER_ADMIN"]

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && ADMIN_ROLES.includes(role)
}

/**
 * Peran yang boleh memutuskan perpindahan uang. Hanya SUPER_ADMIN: verifikasi
 * manual adalah satu-satunya pengaman pada QRIS statis yang tidak bisa
 * mencocokkan mutasi secara otomatis.
 */
export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === "SUPER_ADMIN"
}
