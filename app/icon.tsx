import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(135deg, #FB7A23 0%, #F59E0B 100%)",
          color: "#0C0A09",
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        {/* Monogram merek: J dari JASAKITE. */}
        J
      </div>
    ),
    size
  )
}
