import {
  EXCERPT_FONT_SIZE,
  EXCERPT_HEIGHT,
  EXCERPT_LINE_HEIGHT,
  OG_COLORS,
  OG_DOMAIN,
  TITLE_FONT_SIZE,
  TITLE_HEIGHT,
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

      {/* Middle: title + excerpt */}
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
            fontSize: `${TITLE_FONT_SIZE}px`,
            fontWeight: 600,
            lineHeight: TITLE_LINE_HEIGHT,
            maxWidth: "960px",
            overflow: "hidden",
            height: `${TITLE_HEIGHT}px`,
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
              overflow: "hidden",
              height: `${EXCERPT_HEIGHT}px`,
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
