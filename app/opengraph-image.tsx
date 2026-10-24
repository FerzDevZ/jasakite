import { ImageResponse } from "next/og"

export const alt = "JASAKITE — Marketplace Jasa Lokal"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0C0A09",
          backgroundImage:
            "radial-gradient(circle at 15% 12%, rgba(251,122,35,0.30) 0%, transparent 55%), radial-gradient(circle at 88% 92%, rgba(245,158,11,0.18) 0%, transparent 50%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background: "linear-gradient(135deg, #FB7A23 0%, #F59E0B 100%)",
              color: "#0C0A09",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            {/* Monogram merek: J dari JASAKITE. */}
            J
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 36,
              fontWeight: 700,
              color: "#FAF7F2",
              letterSpacing: "-0.02em",
            }}
          >
            JASA<span style={{ color: "#FB9A4A" }}>KITE</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Baris dipecah manual agar break jatuh di batas frasa, bukan pada
              kata fungsi — Satori tidak punya text-wrap: balance. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 76,
              fontWeight: 800,
              color: "#FAF7F2",
              lineHeight: 1.08,
              letterSpacing: "-0.035em",
            }}
          >
            <div style={{ display: "flex" }}>Jasa terpercaya,</div>
            <div style={{ display: "flex" }}>di sekitar Anda.</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 32,
              color: "#A8A29E",
              lineHeight: 1.35,
            }}
          >
            <div style={{ display: "flex" }}>
              Antar barang, belanja, bayar tagihan.
            </div>
            <div style={{ display: "flex" }}>
              Dipesan dalam hitungan menit.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 16,
            fontSize: 26,
            color: "#78716C",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: 999,
              border: "1px solid rgba(251,122,35,0.35)",
              color: "#FB9A4A",
              fontWeight: 600,
            }}
          >
            jasakite.id
          </div>
          <div style={{ display: "flex", color: "#A29B94" }}>
Kepulauan Bangka Belitung • 7 kabupaten/kota
          </div>
        </div>
      </div>
    ),
    size
  )
}
