// TOTP (RFC 6238) untuk langkah-kedua SUPER_ADMIN.
//
// Ditulis tanpa dependensi tambahan: hanya HMAC-SHA1 + base32 dari `node:crypto`.
// Kode yang dihasilkan cocok dengan Google Authenticator, Authy, 1Password, dan
// aplikasi OTP lain karena mengikuti parameter default RFC (SHA1, 6 digit,
// periode 30 detik).
//
// Secret TIDAK disimpan sebagai base32 mentah di database. `encryptTotpSecret`
// membungkusnya dengan AES-256-GCM memakai kunci turunan AUTH_SECRET, sehingga
// dump database atau akses baca langsung ke MongoDB tidak cukup untuk
// meniru kode 2FA admin. GCM dipilih (bukan CBC) karena ikut mengautentikasi
// ciphertext: payload yang diubah satu byte akan gagal didekripsi, bukan
// menghasilkan secret acak yang diam-diam dipakai.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export const TOTP_DIGITS = 6
export const TOTP_PERIOD_SECONDS = 30
/** Toleransi satu langkah ke belakang & ke depan (total ±30 detik). */
export const TOTP_WINDOW_STEPS = 1
export const TOTP_SECRET_BYTES = 20

export function base32Encode(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let encoded = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return encoded
}

export function base32Decode(encoded: string): Buffer {
  const normalized = encoded.toUpperCase().replace(/[\s=-]/g, "")
  if (normalized.length === 0) {
    throw new Error("Secret TOTP kosong")
  }

  let bits = 0
  let value = 0
  const decoded = Buffer.alloc(Math.floor((normalized.length * 5) / 8))
  let written = 0

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index === -1) {
      throw new Error("Secret TOTP bukan base32 yang sah")
    }
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      decoded[written] = (value >>> (bits - 8)) & 0xff
      written += 1
      bits -= 8
    }
  }

  return decoded.subarray(0, written)
}

/** Secret acak 160-bit, sudah dalam bentuk base32 siap ditampilkan. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(TOTP_SECRET_BYTES))
}

export type TotpCodeOptions = {
  digits?: number
  periodSeconds?: number
}

/** Kode HOTP untuk satu counter (dipakai TOTP dengan counter = waktu/periode). */
export function hotpCode(
  secret: Buffer,
  counter: number,
  digits: number = TOTP_DIGITS
): string {
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  counterBuffer.writeUInt32BE(counter % 0x100000000, 4)

  const digest = createHmac("sha1", secret).update(counterBuffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]

  return String(binary % 10 ** digits).padStart(digits, "0")
}

export function totpCounter(at: Date, periodSeconds: number = TOTP_PERIOD_SECONDS): number {
  return Math.floor(at.getTime() / 1000 / periodSeconds)
}

/** Kode untuk waktu tertentu — dipakai test dan skrip diagnostik. */
export function totpCodeAt(
  base32Secret: string,
  at: Date,
  options: TotpCodeOptions = {}
): string {
  const digits = options.digits ?? TOTP_DIGITS
  const periodSeconds = options.periodSeconds ?? TOTP_PERIOD_SECONDS
  return hotpCode(base32Decode(base32Secret), totpCounter(at, periodSeconds), digits)
}

export type TotpMatch = {
  /** Awal periode (detik epoch × 1000) tempat kode yang cocok berada. */
  stepStartedAt: Date
  counter: number
}

function matchesCode(expected: string, submitted: string): boolean {
  if (expected.length !== submitted.length) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(submitted))
}

/**
 * Cari langkah waktu yang cocok untuk kode yang dikirim.
 *
 * Mengembalikan `null` bila kode bukan 6 digit atau tidak cocok di jendela
 * toleransi. Perbandingan memakai `timingSafeEqual` pada panjang yang sama,
 * sehingga lama respons tidak membocorkan digit mana yang sudah benar.
 */
export function findTotpMatch(
  base32Secret: string,
  submittedCode: string,
  at: Date = new Date(),
  options: TotpCodeOptions & { windowSteps?: number } = {}
): TotpMatch | null {
  const digits = options.digits ?? TOTP_DIGITS
  const periodSeconds = options.periodSeconds ?? TOTP_PERIOD_SECONDS
  const windowSteps = options.windowSteps ?? TOTP_WINDOW_STEPS

  const normalized = submittedCode.replace(/\s/g, "")
  if (!new RegExp(`^\\d{${digits}}$`).test(normalized)) return null

  let secret: Buffer
  try {
    secret = base32Decode(base32Secret)
  } catch {
    return null
  }

  const currentCounter = totpCounter(at, periodSeconds)
  for (let offset = -windowSteps; offset <= windowSteps; offset += 1) {
    const counter = currentCounter + offset
    if (counter < 0) continue
    // `counter * 1000` bisa melewati batas aman Number pada tahun jauh ke
    // depan, tetapi nilai realistis (≈5×10^7 langkah) masih aman.
    const stepStartedAt = new Date(counter * periodSeconds * 1000)
    if (matchesCode(hotpCode(secret, counter, digits), normalized)) {
      return { stepStartedAt, counter }
    }
  }

  return null
}

/** URI `otpauth://` yang dipindai aplikasi authenticator. */
export function buildTotpUri(params: {
  base32Secret: string
  accountName: string
  issuer?: string
}): string {
  const issuer = params.issuer ?? "JASAKITE"
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(params.accountName)}`
  const query = new URLSearchParams({
    secret: params.base32Secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${query.toString()}`
}

// ── Enkripsi secret dengan kunci turunan AUTH_SECRET ───────────────────────

const TOTP_PAYLOAD_VERSION = "v1"

export function deriveTotpEncryptionKey(secretSeed: string): Buffer {
  return createHash("sha256")
    .update(`jasakite:totp:${TOTP_PAYLOAD_VERSION}:${secretSeed}`)
    .digest()
}

export function encryptTotpSecret(base32Secret: string, encryptionKey: Buffer): string {
  const initializationVector = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, initializationVector)
  const ciphertext = Buffer.concat([
    cipher.update(base32Secret, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return [
    TOTP_PAYLOAD_VERSION,
    initializationVector.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".")
}

export function decryptTotpSecret(payload: string, encryptionKey: Buffer): string {
  const [version, ivBase64, tagBase64, ciphertextBase64] = payload.split(".")
  if (version !== TOTP_PAYLOAD_VERSION || !ivBase64 || !tagBase64 || !ciphertextBase64) {
    throw new Error("Payload secret TOTP tidak dikenali")
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(ivBase64, "base64")
  )
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextBase64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}

/**
 * Kunci enkripsi dari environment.
 *
 * Gagal keras bila tidak ada seed: menjalankan 2FA dengan kunci tetap/hardcoded
 * sama saja dengan menyimpan secret dalam bentuk terbuka. Pesan errornya
 * menyebut variabel yang harus diisi agar operator tahu apa yang kurang.
 */
export function getTotpEncryptionKey(): Buffer {
  const secretSeed = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secretSeed || secretSeed.length < 16) {
    throw new Error(
      "AUTH_SECRET belum diatur (minimal 16 karakter). 2FA tidak bisa diaktifkan tanpa kunci enkripsi."
    )
  }
  return deriveTotpEncryptionKey(secretSeed)
}
