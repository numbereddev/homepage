import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Numbered Dev";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0a",
          padding: "72px 88px",
        }}
      >
        {/* Top: site brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#5b9fd6",
            }}
          />
          <span
            style={{
              color: "#91a0b3",
              fontSize: "22px",
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            numbered.dev
          </span>
        </div>

        {/* Middle: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            paddingTop: "40px",
            paddingBottom: "40px",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: "76px",
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: "960px",
              overflow: "hidden",
              height: "168px",
            }}
          >
            Numbered Dev
          </div>
          <div
            style={{
              color: "#637287",
              fontSize: "28px",
              fontWeight: 400,
              lineHeight: 1.4,
              marginTop: "24px",
              maxWidth: "800px",
              overflow: "hidden",
              height: "80px",
            }}
          >
            Software engineer, designer and app experience developer.
          </div>
        </div>

        {/* Bottom: URL */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              color: "#5b9fd6",
              fontSize: "20px",
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            numbered.dev
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
