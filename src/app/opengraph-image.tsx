import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Numbered Dev";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Title: fontSize 76 × lineHeight 1.1 × 2 lines + 16px for descenders
const TITLE_FONT_SIZE = 76;
const TITLE_LINE_HEIGHT = 1.1;
const TITLE_MAX_LINES = 2;
const TITLE_HEIGHT = Math.ceil(TITLE_FONT_SIZE * TITLE_LINE_HEIGHT * TITLE_MAX_LINES) + 16;

// Excerpt: fontSize 28 × lineHeight 1.4 × 2 lines + 8px for descenders
const EXCERPT_FONT_SIZE = 28;
const EXCERPT_LINE_HEIGHT = 1.4;
const EXCERPT_MAX_LINES = 2;
const EXCERPT_HEIGHT = Math.ceil(EXCERPT_FONT_SIZE * EXCERPT_LINE_HEIGHT * EXCERPT_MAX_LINES) + 8;

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
              fontSize: `${TITLE_FONT_SIZE}px`,
              fontWeight: 600,
              lineHeight: TITLE_LINE_HEIGHT,
              maxWidth: "960px",
              overflow: "hidden",
              height: `${TITLE_HEIGHT}px`,
            }}
          >
            Numbered Dev
          </div>
          <div
            style={{
              color: "#637287",
              fontSize: `${EXCERPT_FONT_SIZE}px`,
              fontWeight: 400,
              lineHeight: EXCERPT_LINE_HEIGHT,
              marginTop: "24px",
              maxWidth: "800px",
              overflow: "hidden",
              height: `${EXCERPT_HEIGHT}px`,
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
