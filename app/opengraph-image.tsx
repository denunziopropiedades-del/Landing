import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0b0f0d 0%, #0a2318 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#d4af37", letterSpacing: 4, textTransform: "uppercase" }}>
          Etapa 2 · Guernica, Buenos Aires
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, marginTop: 24, maxWidth: 900 }}>
          Ayres de Guernica
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 24, maxWidth: 850, color: "rgba(255,255,255,0.85)" }}>
          Lotes con escritura garantizada en el sur del Gran Buenos Aires
        </div>
      </div>
    ),
    { ...size }
  );
}
