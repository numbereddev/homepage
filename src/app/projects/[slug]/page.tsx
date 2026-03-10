import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getAllProjects, getProjectBySlug, getProjectSlugs } from "@/lib/content";
import { getPostStats } from "@/lib/db";
import { formatTimestamp } from "@/lib/utils";
import { t } from "@/lib/tokens";
import { PageShell, SiteNav, PostMeta, TagList, Panel, ProjectRow } from "@/components/ui";
import { AnimatedDiv } from "@/components/animations";
import TextSelectionShare from "@/components/TextSelectionShare";
import PostEngagement, { ReactionBar } from "@/components/PostEngagement";
import ProjectGallery from "./ProjectGallery";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type AssetKind = "image" | "video";

type GalleryMedia = {
  url: string;
  kind: AssetKind;
};

export async function generateStaticParams() {
  return getProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project not found",
      description: "The requested project could not be found.",
    };
  }

  return {
    title: project.title,
    description: project.excerpt,
    openGraph: {
      title: project.title,
      description: project.excerpt,
      type: "article",
      publishedTime: new Date(project.createdAt).toISOString(),
      images: project.cover ? [{ url: project.cover, alt: project.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.excerpt,
      images: project.cover ? [project.cover] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) notFound();

  const otherProjects = getAllProjects(false)
    .filter((p) => p.slug !== slug)
    .slice(0, 3);

  const initialStats = await getPostStats(project.slug);

  const galleryItems = project.gallery.map((item, idx) => {
    const media: GalleryMedia =
      typeof item === "string" ? { url: item, kind: "image" } : { url: item.url, kind: item.kind };

    return {
      id: `${project.slug}-gallery-${idx}`,
      url: media.url,
      kind: media.kind,
      alt: `${project.title} gallery item ${idx + 1}`,
    };
  });

  const imageCount = galleryItems.filter((item) => item.kind === "image").length;
  const videoCount = galleryItems.filter((item) => item.kind === "video").length;

  const header = (
    <div className={`group flex flex-col gap-6 ${t.pad.header}`}>
      <SiteNav items={[{ href: "/projects", label: "All projects" }]} />

      {project.cover ? (
        <div className={`relative overflow-hidden border ${t.color.border}`}>
          <div
            className="absolute inset-0 bg-center bg-cover transition duration-500"
            style={{ backgroundImage: `url(${project.cover})` }}
          />
          <div className="absolute inset-0 transition duration-500 bg-black/74" />
          <div className="absolute inset-0 transition duration-500 backdrop-blur-sm" />
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/75 to-transparent" />
          <div className="relative aspect-3.5/1 w-full" />
        </div>
      ) : null}

      <div className="space-y-4">
        <PostMeta date={formatTimestamp(project.createdAt)} published={project.published} />

        <div className="space-y-3">
          <h1
            className={`max-w-4xl ${t.text.pageTitle} text-white ${
              project.cover ? "[text-shadow:0_2px_14px_rgba(0,0,0,0.92)]" : ""
            }`}
          >
            {project.title}
          </h1>
          <p
            className={`max-w-2xl ${t.text.bodyLg} ${
              project.cover
                ? "text-neutral-200 [text-shadow:0_2px_10px_rgba(0,0,0,0.88)]"
                : t.color.body
            }`}
          >
            {project.excerpt}
          </p>
        </div>

        <div
          className={`flex flex-wrap items-center gap-3 ${project.cover ? "[text-shadow:0_2px_8px_rgba(0,0,0,0.8)]" : ""}`}
        >
          <TagList tags={project.tags} />
          {project.isOpenSource && (
            <span
              className={`border border-emerald-700 bg-emerald-950/50 px-2 py-1 ${t.text.micro} text-emerald-400`}
            >
              Open Source
            </span>
          )}
          {project.pinned && (
            <span
              className={`border border-sky-700 bg-sky-950/50 px-2 py-1 ${t.text.micro} text-sky-400`}
            >
              Featured
            </span>
          )}
        </div>

        {project.isOpenSource && project.sourceUrl && (
          <div className={project.cover ? "[text-shadow:0_2px_8px_rgba(0,0,0,0.8)]" : ""}>
            <a
              href={project.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 border ${t.color.border} px-4 py-2 text-sm font-medium transition-colors ${t.color.hoverBorderAccentDim} ${t.color.hoverAccent} text-emerald-400`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              View Source Code →
            </a>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PageShell header={header} footerLeft={`/projects/${project.slug}`} footerRight="Numbered Dev">
      <TextSelectionShare
        postTitle={project.title}
        postUrl={`https://numbered.dev/projects/${project.slug}`}
      />
      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px] mb-4">
        {/* ── Article body ── */}
        <article
          className={`relative min-w-0 border-b ${t.color.border} px-6 py-8 pb-20 sm:px-8 sm:py-10 sm:pb-20 lg:border-b-0 lg:border-r overflow-visible`}
        >
          {/* ── Gallery ── */}
          {galleryItems.length > 0 && (
            <AnimatedDiv delay={200} duration={800} distance={20}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className={`${t.text.kicker} ${t.color.accent}`}>Gallery</p>
                <p className={`text-xs ${t.color.muted}`}>
                  Click any item to open it. Supports images and video.
                </p>
              </div>

              <ProjectGallery title={project.title} items={galleryItems} />
            </AnimatedDiv>
          )}

          <div className={`mt-12 border-t ${t.color.border} pt-8`}>
            <div data-share-scope>
              <AnimatedDiv delay={140} duration={900} distance={20}>
                <div
                  className="prose-flat max-w-none"
                  dangerouslySetInnerHTML={{ __html: project.html }}
                />
              </AnimatedDiv>
            </div>
          </div>

          <ReactionBar slug={project.slug} initialStats={{ ...initialStats, myReactions: [] }} />
        </article>

        {/* ── Sidebar ── */}
        <AnimatedDiv
          delay={160}
          duration={780}
          distance={24}
          className="space-y-5 px-5 py-6 sm:px-6"
        >
          {/* Engagement */}
          <AnimatedDiv delay={220} duration={700} distance={18}>
            <Panel label="Engagement">
              <div className={t.pad.panel}>
                <PostEngagement
                  slug={project.slug}
                  initialStats={{ ...initialStats, myReactions: [] }}
                />
              </div>
            </Panel>
          </AnimatedDiv>

          {/* Project metadata */}
          <AnimatedDiv delay={300} duration={700} distance={18}>
            <Panel label="Project">
              <dl className={`space-y-4 ${t.pad.panel} text-sm`}>
                <div>
                  <dt className={`${t.text.meta} ${t.color.muted}`}>Slug</dt>
                  <dd className={`mt-1 break-all ${t.color.bodyStrong}`}>{project.slug}</dd>
                </div>
                <div>
                  <dt className={`${t.text.meta} ${t.color.muted}`}>Published</dt>
                  <dd className={`mt-1 ${t.color.bodyStrong}`}>
                    {formatTimestamp(project.createdAt)}
                  </dd>
                </div>

                {project.isOpenSource && (
                  <div>
                    <dt className={`${t.text.meta} ${t.color.muted}`}>Source</dt>
                    <dd className={`mt-1 ${t.color.bodyStrong}`}>
                      {project.sourceUrl ? (
                        <a
                          href={project.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${t.link.accent} break-all`}
                        >
                          View source →
                        </a>
                      ) : (
                        <span className="text-emerald-400">Open Source</span>
                      )}
                    </dd>
                  </div>
                )}

                {galleryItems.length > 0 && (
                  <div>
                    <dt className={`${t.text.meta} ${t.color.muted}`}>Gallery</dt>
                    <dd className={`mt-1 ${t.color.bodyStrong}`}>
                      {galleryItems.length} item{galleryItems.length !== 1 ? "s" : ""}
                      {imageCount > 0 ? ` · ${imageCount} image${imageCount !== 1 ? "s" : ""}` : ""}
                      {videoCount > 0 ? ` · ${videoCount} video${videoCount !== 1 ? "s" : ""}` : ""}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>
          </AnimatedDiv>

          {/* More projects */}
          <AnimatedDiv delay={380} duration={700} distance={18}>
            <Panel label="More projects">
              {otherProjects.length === 0 ? (
                <p className={`${t.pad.panel} text-sm ${t.color.muted}`}>
                  No additional projects yet.
                </p>
              ) : (
                <div className={`divide-y ${t.color.divider}`}>
                  {otherProjects.map((item) => (
                    <ProjectRow
                      key={item.slug}
                      slug={item.slug}
                      title={item.title}
                      excerpt={item.excerpt}
                      date={formatTimestamp(item.createdAt)}
                      isOpenSource={item.isOpenSource}
                      variant="flush"
                    />
                  ))}
                </div>
              )}
            </Panel>
          </AnimatedDiv>
        </AnimatedDiv>
      </div>
    </PageShell>
  );
}
