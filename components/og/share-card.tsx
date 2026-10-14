/**
 * Kartu Open Graph 1200×630 yang dipakai bersama oleh `/service/[slug]` dan
 * `/provider/[id]`.
 *
 * Satu komponen untuk dua kartu: kalau gaya share dibuat dua kali, keduanya
 * pasti berbeda cepat atau lambat — dan yang terlihat di WhatsApp adalah versi
 * yang sedang dipakai crawler, bukan yang terakhir dirapikan.
 *
 * Nama field di sini sengaja generik (`badge`, `highlight`, `footer`) karena
 * isinya berbeda per entitas: harga jasa vs jumlah jasa aktif penyedia.
 */

import {
  SHARE_CARD_QR_PLATE_PADDING,
  SHARE_CARD_QR_RENDER_SIZE,
} from "@/lib/og-card"
import { buildQrMatrix, qrPathData } from "@/lib/qr-matrix"

export interface ShareCardContent {
  title: string
  titleFontSize: number
  badgeLabel: string
  /** Pill angka/penawaran utama; null = tidak dirender. */
  highlightLabel: string | null
  /** Baris bintang + rating; null = tidak dirender. */
  ratingLabel: string | null
  /**
   * Sinyal kepercayaan (mis. "12 pesanan selesai"); null = tidak dirender.
   *
   * Hanya diisi dari angka yang benar-benar ada di basis data: badge "terverifikasi"
   * yang tidak punya sumber datanya adalah klaim, bukan informasi.
   */
  trustLabel: string | null
  /** Teks kecil di baris bawah, di samping pill domain; null = tidak dirender. */
  footerLabel: string | null
  /** Inisial di panel foto saat `imageSrc` null. */
  monogram: string
  imageSrc: string | null
  /**
   * Nilai yang dikodekan menjadi QR di sudut panel; null = tanpa QR.
   *
   * Gambar yang dipindai menghasilkan kunjungan; gambar yang cuma dipandang
   * tidak. Yang dikodekan selalu URL halaman yang kartunya sedang dibagikan.
   */
  qrValue: string | null
  /** Keterangan kecil di bawah QR; null = QR tanpa keterangan. */
  qrLabel: string | null
}

export const SHARE_CARD_SIZE = { width: 1200, height: 630 }

/**
 * Geometri dalam kartu yang sekaligus jadi dasar crop pengukuran piksel di
 * `tests/helpers/og-card-panel.ts`: panel foto adalah sisa lebar setelah kolom
 * teks sebesar 640px (sisa 1072px area dalam kartu dipakai foto setinggi
 * penuh), bukan angka tetap. Diekspor supaya crop tidak pernah diketik ulang di
 * test — kalau tata letak kartu berubah, crop pengukuran ikut berubah sendiri,
 * bukan jadi angka usang yang membuat test mengukur area lain tanpa gagal.
 */
export const SHARE_CARD_PADDING = 60
export const SHARE_CARD_TEXT_COLUMN_WIDTH = 640

/**
 * Latar merek kartu share. Diekspor karena kartu lain (mis. kartu halaman
 * daftar di `components/og/listing-card.tsx`) harus memakai latar yang sama
 * persis: dua definisi gradien merek akan berbeda cepat atau lambat, dan yang
 * terlihat orang adalah versi yang sedang dipakai crawler.
 */
export const SHARE_CARD_BACKGROUND = {
  background: "#0C0A09",
  backgroundImage:
    "radial-gradient(circle at 12% 10%, rgba(251,122,35,0.32) 0%, transparent 55%), radial-gradient(circle at 90% 88%, rgba(245,158,11,0.18) 0%, transparent 52%)",
}

export function ShareCard({ content }: { content: ShareCardContent }) {
  // Matriks dihitung di sini, bukan disimpan di view-model: nilainya satu-satunya
  // masukan, dan hasilnya deterministik — sementara view-model tetap bebas dari
  // detail gambar. Nilai yang tidak bisa di-encode menghasilkan null, dan kartu
  // tetap dirender tanpa QR.
  const qrMatrix = content.qrValue ? buildQrMatrix(content.qrValue) : null

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        padding: SHARE_CARD_PADDING,
        fontFamily: "sans-serif",
        ...SHARE_CARD_BACKGROUND,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: SHARE_CARD_TEXT_COLUMN_WIDTH,
          paddingRight: 48,
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Baris merek */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "linear-gradient(135deg, #FB7A23 0%, #F59E0B 100%)",
              color: "#0C0A09",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            J
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 700,
              color: "#FAF7F2",
              letterSpacing: "-0.02em",
            }}
          >
            JASA<span style={{ color: "#FB9A4A" }}>KITE</span>
          </div>
        </div>

        {/* Blok utama: badge → judul → pill utama → rating */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(251,122,35,0.45)",
              color: "#FB9A4A",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            {content.badgeLabel}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: content.titleFontSize,
              fontWeight: 800,
              color: "#FAF7F2",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            {content.title}
          </div>

          {content.highlightLabel ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "12px 28px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #FB7A23 0%, #F59E0B 100%)",
                color: "#0C0A09",
                fontSize: 40,
                fontWeight: 800,
              }}
            >
              {content.highlightLabel}
            </div>
          ) : null}

          {content.ratingLabel || content.trustLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 26,
                color: "#A8A29E",
              }}
            >
              {content.ratingLabel ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#F59E0B">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <div style={{ display: "flex" }}>{content.ratingLabel}</div>
                </div>
              ) : null}

              {content.trustLabel ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "6px 18px 6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(74,222,128,0.35)",
                    background: "rgba(74,222,128,0.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: "#4ADE80",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0C0A09">
                      <path d="M9.6 17.3 4.3 12l1.4-1.4 3.9 3.9 8-8L19 7.9z" />
                    </svg>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      color: "#86EFAC",
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    {content.trustLabel}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Baris bawah: domain + label konteks (penyedia/alamat) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(251,122,35,0.35)",
              color: "#FB9A4A",
              fontWeight: 600,
            }}
          >
            jasakite.id
          </div>
          {content.footerLabel ? (
            <div style={{ display: "flex", color: "#78716C" }}>
              {content.footerLabel}
            </div>
          ) : null}
        </div>
      </div>

      {/* Panel foto: tinggi penuh, crop cover. Fallback: monogram. */}
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 32,
          overflow: "hidden",
          border: "2px solid rgba(251,122,35,0.35)",
          background: "#1C1917",
        }}
      >
        {content.imageSrc ? (
          <img
            src={content.imageSrc}
            width={SHARE_CARD_TEXT_COLUMN_WIDTH}
            height={512}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 800,
              color: "rgba(251,154,74,0.35)",
            }}
          >
            {content.monogram}
          </div>
        )}

        {/* QR di atas foto, di piring terang: modul gelap di latar terang adalah
            polaritas yang dikenali semua pemindai, sementara QR terang di atas
            foto gelap sering gagal. Quiet zone-nya sudah ada di dalam matriks
            (`@/lib/qr-matrix`), jadi padding piring ini murni soal tampilan. */}
        {qrMatrix ? (
          <div
            style={{
              position: "absolute",
              right: 18,
              bottom: 18,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: SHARE_CARD_QR_PLATE_PADDING,
              borderRadius: 22,
              background: "#FAF7F2",
            }}
          >
            <svg
              width={SHARE_CARD_QR_RENDER_SIZE}
              height={SHARE_CARD_QR_RENDER_SIZE}
              viewBox={`0 0 ${qrMatrix.size} ${qrMatrix.size}`}
              fill="#0C0A09"
            >
              <path d={qrPathData(qrMatrix)} />
            </svg>
            {content.qrLabel ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#0C0A09",
                  letterSpacing: "0.02em",
                }}
              >
                {content.qrLabel}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
