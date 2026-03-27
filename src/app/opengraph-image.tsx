import { ImageResponse } from "next/og";
import { OG_COLORS, OG_DOMAIN } from "@/lib/og";

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
          backgroundColor: OG_COLORS.background,
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
              backgroundColor: OG_COLORS.accent,
            }}
          />
          <span
            style={{
              color: OG_COLORS.muted,
              fontSize: "22px",
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            {OG_DOMAIN}
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
              color: OG_COLORS.white,
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
              color: OG_COLORS.muted2,
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
              color: OG_COLORS.accent,
              fontSize: "20px",
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            {OG_DOMAIN}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
