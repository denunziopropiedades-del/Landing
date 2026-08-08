import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sizeParam = Number(searchParams.get("size"));
  const size = Number.isFinite(sizeParam) && sizeParam > 0 && sizeParam <= 1024 ? sizeParam : 512;

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
            fontSize: size * 0.43,
            fontWeight: 700,
            color: "#d4af37",
            fontFamily: "sans-serif",
          }}
        >
          ML
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
