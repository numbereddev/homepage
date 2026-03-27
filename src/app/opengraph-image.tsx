import { ImageResponse } from "next/og";
import { OgImageLayout } from "@/lib/og-image-layout";

export const runtime = "nodejs";

export const alt = "Numbered Dev";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    <OgImageLayout
      title="Numbered Dev"
      excerpt="Software engineer, designer and app experience developer."
    />,
    size,
  );
}
