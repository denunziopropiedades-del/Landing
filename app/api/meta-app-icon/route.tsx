import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0b0f0d 0%, #154a2e 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 220,
            fontWeight: 700,
            color: "#d4af37",
            fontFamily: "sans-serif",
          }}
        >
          ML
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  );
}
