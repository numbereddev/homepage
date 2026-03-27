import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/content";
import { OgImageLayout } from "@/lib/og-image-layout";

export const runtime = "nodejs";

export const alt = "Blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  const title = post?.title ?? "Blog Post";
  const excerpt = post?.excerpt ?? "";

  return new ImageResponse(
    <OgImageLayout title={title} excerpt={excerpt} category="Blog" />,
    size,
  );
}
