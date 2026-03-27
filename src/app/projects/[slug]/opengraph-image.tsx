import { ImageResponse } from "next/og";
import { getProjectBySlug } from "@/lib/content";
import { OgImageLayout } from "@/lib/og-image-layout";

export const runtime = "nodejs";

export const alt = "Project";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  const title = project?.title ?? "Project";
  const excerpt = project?.excerpt ?? "";

  return new ImageResponse(
    <OgImageLayout title={title} excerpt={excerpt} category="Projects" />,
    { width: 1200, height: 630 },
  );
}
