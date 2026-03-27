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
  category?: string;
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
            lineClamp: 2,
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
              marginTop: "32px",
              maxWidth: "800px",
              lineClamp: 3,
              overflow: "hidden",
            }}
          >
            {excerpt}
          </div>
        )}
      </div>

      {/* Bottom: category + URL */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {category && (
          <>
            <span
              style={{
                color: OG_COLORS.accent,
                fontSize: "32px",
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              {category}
            </span>
            <span style={{ color: OG_COLORS.separator, fontSize: "32px" }}>·</span>
          </>
        )}
        <span
          style={{
            color: category ? OG_COLORS.muted2 : OG_COLORS.accent,
            fontSize: "32px",
            fontWeight: category ? 400 : 500,
            letterSpacing: "0.01em",
          }}
        >
          {OG_DOMAIN}
        </span>
      </div>
    </div>
  );
}
