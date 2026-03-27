import { ImageResponse } from "next/og";
import { getProjectBySlug } from "@/lib/content";

export const runtime = "nodejs";

export const alt = "Project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE_FONT_SIZE = 80;
const TITLE_LINE_HEIGHT = 1.1;

const EXCERPT_FONT_SIZE = 28;
const EXCERPT_LINE_HEIGHT = 1.4;

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  const title = project?.title ?? "Project";
  const excerpt = project?.excerpt ?? "";

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
            {title}
          </div>
          {excerpt && (
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
              {excerpt}
            </div>
          )}
        </div>

        {/* Bottom: category + URL */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              color: "#5b9fd6",
              fontSize: "20px",
              fontWeight: 500,
              letterSpacing: "0.01em",
            }}
          >
            Projects
          </span>
          <span style={{ color: "#334155", fontSize: "20px" }}>·</span>
          <span
            style={{
              color: "#637287",
              fontSize: "20px",
              fontWeight: 400,
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
