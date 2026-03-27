import {
  EXCERPT_FONT_SIZE,
  EXCERPT_LINE_HEIGHT,
  OG_COLORS,
  OG_DOMAIN,
  TITLE_FONT_SIZE,
  TITLE_LINE_HEIGHT,
} from "@/lib/og";

type OgImageLayoutProps = {
  title: string;
  excerpt: string;
  category: string;
};

export function OgImageLayout({ title, excerpt, category }: OgImageLayoutProps) {
  return (
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
          {title}
        </div>
        {excerpt && (
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
            {excerpt}
          </div>
        )}
      </div>

      {/* Bottom: category + URL */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span
          style={{
            color: OG_COLORS.accent,
            fontSize: "20px",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          {category}
        </span>
        <span style={{ color: OG_COLORS.separator, fontSize: "20px" }}>·</span>
        <span
          style={{
            color: OG_COLORS.muted2,
            fontSize: "20px",
            fontWeight: 400,
          }}
        >
          {OG_DOMAIN}
        </span>
      </div>
    </div>
  );
}
