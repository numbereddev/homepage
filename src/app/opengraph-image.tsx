import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Numbered Dev";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE_FONT_SIZE = 84;
const TITLE_LINE_HEIGHT = 1.1;

const EXCERPT_FONT_SIZE = 30;
const EXCERPT_LINE_HEIGHT = 1.4;

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
        {/* Content: title + excerpt */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#ffffff",
              fontSize: `${TITLE_FONT_SIZE}px`,
              fontWeight: 600,
              lineHeight: TITLE_LINE_HEIGHT,
              maxWidth: "960px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
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
