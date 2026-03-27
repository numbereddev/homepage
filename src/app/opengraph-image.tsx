import { ImageResponse } from "next/og";
import { OG_COLORS, OG_DOMAIN, TITLE_FONT_SIZE, TITLE_LINE_HEIGHT, EXCERPT_FONT_SIZE, EXCERPT_LINE_HEIGHT } from "@/lib/og";

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
        {/* Content: title + excerpt */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: OG_COLORS.white,
              fontSize: `${TITLE_FONT_SIZE}px`,
              fontWeight: 600,
              lineHeight: TITLE_LINE_HEIGHT,
              maxWidth: "960px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            Numbered Dev
          </div>
          <div
            style={{
              color: OG_COLORS.muted2,
              fontSize: `${EXCERPT_FONT_SIZE}px`,
              fontWeight: 400,
              lineHeight: EXCERPT_LINE_HEIGHT,
              marginTop: "24px",
              maxWidth: "800px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
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
