/**
 * Kartu Open Graph halaman daftar jasa (`/services`).
 *
 * Kartu ini tidak memakai panel foto seperti kartu jasa/penyedia: yang dibawa
 * halaman daftar bukan satu entitas, melainkan angka dan kategori. Karena itu
 * tata letaknya asimetris dengan sengaja — satu metrik raksasa di kiri, dan di
 * kanan kolom petak yang bobotnya berbeda-beda (kategori teratas paling besar,
 * kategori ketiga paling kecil, lalu QR). Tiga petak berukuran sama akan
 * menyamakan hal yang tidak sama pentingnya, dan kartu seperti itu tidak
 * memberi tahu apa pun tentang isi halaman.
 *
 * Latar dan geometri QR dipakai bersama kartu share lewat `@/lib/og-card` dan
 * `@/components/og/share-card`, jadi perubahan merek tidak bisa menyentuh satu
 * kartu tanpa yang lain.
 */

import {
  SHARE_CARD_QR_PLATE_PADDING,
  SHARE_CARD_QR_RENDER_SIZE,
} from "@/lib/og-card"
import { buildQrMatrix, qrPathData } from "@/lib/qr-matrix"
import type { ServicesOgViewModel } from "@/lib/services-og"
import {
  SHARE_CARD_BACKGROUND,
  SHARE_CARD_PADDING,
  SHARE_CARD_TEXT_COLUMN_WIDTH,
} from "@/components/og/share-card"

/** Tinggi baris QR di kolom kanan; sisanya dibagi petak kategori. */
const QR_ROW_HEIGHT = SHARE_CARD_QR_RENDER_SIZE + SHARE_CARD_QR_PLATE_PADDING * 2 + 26

const CATEGORY_TILE_STYLE = {
  display: "flex" as const,
  flexDirection: "column" as const,
  justifyContent: "center" as const,
  gap: 6,
  padding: "22px 26px",
  borderRadius: 26,
  background: "rgba(251,122,35,0.12)",
  border: "2px solid rgba(251,122,35,0.38)",
}

const QUIET_TILE_STYLE = {
  display: "flex" as const,
  flexDirection: "column" as const,
  justifyContent: "center" as const,
  gap: 6,
  padding: "22px 26px",
  borderRadius: 26,
  background: "#1C1917",
  border: "1px solid rgba(251,122,35,0.22)",
}

function CategoryTile({
  name,
  countLabel,
  emphasis,
}: {
  name: string
  countLabel: string
  emphasis: "lead" | "quiet"
}) {
  return (
    <div style={emphasis === "lead" ? CATEGORY_TILE_STYLE : QUIET_TILE_STYLE}>
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 800,
          color: "#FAF7F2",
          letterSpacing: "-0.01em",
        }}
      >
        {name}
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#FB9A4A", fontWeight: 600 }}>
        {countLabel}
      </div>
    </div>
  )
}

function NoteTile({ note }: { note: string }) {
  return (
    <div style={QUIET_TILE_STYLE}>
      <div
        style={{
          display: "flex",
          fontSize: 24,
          color: "#A8A29E",
          lineHeight: 1.3,
        }}
      >
        {note}
      </div>
    </div>
  )
}

export function ListingCard({ content }: { content: ServicesOgViewModel }) {
  const qrMatrix = buildQrMatrix(content.qrValue)
  const [leadChip, secondChip, thirdChip] = content.chips
  // Katalog masih kosong: satu petak catatan besar, bukan tiga salinan
  // kalimat yang sama. Versi sebelumnya menaruh `placeholderNote` di setiap
  // petak yang kosong, sehingga kartu yang dibagikan ke grup WhatsApp berisi
  // kalimat identik terpotong tiga kali — terbaca seperti render rusak.
  const hasCategoryChips = content.chips.length > 0

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

          {content.metricLabel && content.metricCaption ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 138,
                  fontWeight: 800,
                  color: "#FAF7F2",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                }}
              >
                {content.metricLabel}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  fontWeight: 700,
                  color: "#FB9A4A",
                }}
              >
                {content.metricCaption}
              </div>
            </div>
          ) : (
            // Tanpa angka, kartu tidak boleh menampilkan \"0\" seolah-olah data:
            // kalimat merek lebih jujur daripada nol yang menyesatkan.
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 62,
                fontWeight: 800,
                color: "#FAF7F2",
                lineHeight: 1.12,
                letterSpacing: "-0.03em",
              }}
            >
              <div style={{ display: "flex" }}>Jasa terpercaya,</div>
              <div style={{ display: "flex" }}>di sekitar Anda.</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 20px",
              borderRadius: 999,
              border: "1px solid rgba(251,122,35,0.35)",
              color: "#FB9A4A",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            jasakite.id
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#78716C" }}>
            {content.supportLabel}
          </div>
        </div>
      </div>

      {/* Kolom kanan: petak kategori dengan bobot berbeda + QR. */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16 }}>
        {hasCategoryChips ? (
          <div style={{ display: "flex", flexGrow: 1.5, flexBasis: 0 }}>
            <div style={{ display: "flex", flex: 1 }}>
              <CategoryTile
                name={leadChip.label}
                countLabel={leadChip.countLabel}
                emphasis="lead"
              />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexGrow: 2.5, flexBasis: 0 }}>
            <NoteTile note={content.placeholderNote} />
          </div>
        )}

        {hasCategoryChips ? (
          <div style={{ display: "flex", flexGrow: 1, flexBasis: 0, gap: 16 }}>
            <div style={{ display: "flex", flex: 1.35 }}>
              <CategoryTile
                name={secondChip.label}
                countLabel={secondChip.countLabel}
                emphasis="quiet"
              />
            </div>
            <div style={{ display: "flex", flex: 1 }}>
              <CategoryTile
                name={thirdChip.label}
                countLabel={thirdChip.countLabel}
                emphasis="quiet"
              />
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", height: QR_ROW_HEIGHT, gap: 16 }}>
          {qrMatrix ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
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
            </div>
          ) : null}

          <div style={{ display: "flex", flex: 1 }}>
            <NoteTile
              note={
                content.moreLabel
                  ? `${content.moreLabel} — semuanya ada di halaman ini.`
                  : "Daftar lengkap kategori dan jasa ada di halaman ini."
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}
