import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getPostBySlug, getPostSlugs, getPinnedProjects } from "@/lib/content";
import { getPostStats } from "@/lib/db";
import { formatTimestamp } from "@/lib/utils";
import { t } from "@/lib/tokens";
import { PageShell, SiteNav, PostMeta, TagList, Panel, ProjectRow } from "@/components/ui";
import { AnimatedDiv } from "@/components/animations";
import TextSelectionShare from "@/components/TextSelectionShare";
import PostEngagement, { ReactionBar } from "@/components/PostEngagement";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found",
      description: "The requested post could not be found.",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      siteName: "Numbered Dev",
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: new Date(post.createdAt).toISOString(),
      images: [
        {
          url: `/blog/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          type: "image/png",
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [`/blog/${slug}/opengraph-image`],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const pinnedProjects = getPinnedProjects().slice(0, 3);

  // Fetch initial stats server-side so there's no loading flash
  const initialStats = await getPostStats(post.slug);

  const header = (
    <div className={`group flex flex-col gap-6 ${t.pad.header}`}>
      <SiteNav items={[{ href: "/blog", label: "All posts" }]} />

      {post.cover ? (
        <div className={`relative overflow-hidden border ${t.color.border}`}>
          <div
            className="absolute inset-0 bg-center bg-cover transition duration-500"
            style={{ backgroundImage: `url(${post.cover})` }}
          />
          <div className="absolute inset-0 transition duration-500 bg-black/74" />
          <div className="absolute inset-0 transition duration-500 backdrop-blur-sm" />
          <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-black/75 to-transparent" />
          <div className="relative aspect-3.5/1 w-full" />
        </div>
      ) : null}

      <div className="space-y-4">
        <PostMeta
          date={formatTimestamp(post.createdAt)}
          readingTime={post.readingTime}
          published={post.published}
        />

        <div className="space-y-3">
          <h1
            className={`max-w-4xl ${t.text.pageTitle} text-white ${
              post.cover ? "[text-shadow:0_2px_14px_rgba(0,0,0,0.92)]" : ""
            }`}
          >
            {post.title}
          </h1>
          <p
            className={`max-w-2xl ${t.text.bodyLg} ${
              post.cover
                ? "text-neutral-200 [text-shadow:0_2px_10px_rgba(0,0,0,0.88)]"
                : t.color.body
            }`}
          >
            {post.excerpt}
          </p>
        </div>

        <div className={post.cover ? "[text-shadow:0_2px_8px_rgba(0,0,0,0.8)]" : ""}>
          <TagList tags={post.tags} />
        </div>
      </div>
    </div>
  );

  return (
    <PageShell header={header} footerLeft={`/blog/${post.slug}`} footerRight="Numbered Dev">
      <TextSelectionShare
        postTitle={post.title}
        postUrl={`https://numbered.dev/blog/${post.slug}`}
      />
      <div className="grid lg:grid-cols-[1fr_0.5fr] mb-4">
        {/* ── Article body ── */}
        <article
          className={`relative min-w-0 border-b ${t.color.border} px-6 py-8 pb-20 sm:px-8 sm:py-10 sm:pb-20 lg:border-b-0 lg:border-r overflow-visible`}
        >
          <div data-share-scope>
            <div
              className="prose-flat max-w-none"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          </div>
          <ReactionBar slug={post.slug} initialStats={{ ...initialStats, myReactions: [] }} />
        </article>

        {/* ── Sidebar ── */}
        <div className="space-y-5 px-5 py-6 sm:px-6">
          {/* Views */}
          <AnimatedDiv delay={220} duration={700} distance={18}>
            <Panel label="Engagement">
              <div className={t.pad.panel}>
                <PostEngagement
                  slug={post.slug}
                  initialStats={{ ...initialStats, myReactions: [] }}
                />
              </div>
            </Panel>
          </AnimatedDiv>

          {/* Post metadata */}
          <AnimatedDiv delay={300} duration={700} distance={18}>
            <Panel label="Post">
              <dl className={`space-y-4 ${t.pad.panel} text-sm`}>
                <div>
                  <dt className={`${t.text.meta} ${t.color.muted}`}>Slug</dt>
                  <dd className={`mt-1 break-all ${t.color.bodyStrong}`}>{post.slug}</dd>
                </div>
                <div>
                  <dt className={`${t.text.meta} ${t.color.muted}`}>Published</dt>
                  <dd className={`mt-1 ${t.color.bodyStrong}`}>
                    {formatTimestamp(post.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className={`${t.text.meta} ${t.color.muted}`}>Reading time</dt>
                  <dd className={`mt-1 ${t.color.bodyStrong}`}>{post.readingTime ?? 1} min</dd>
                </div>
              </dl>
            </Panel>
          </AnimatedDiv>

          {/* Pinned Projects */}
          <AnimatedDiv delay={380} duration={700} distance={18}>
            <Panel label="Featured Projects">
              {pinnedProjects.length === 0 ? (
                <p className={`${t.pad.panel} text-sm ${t.color.muted}`}>
                  No featured projects yet.
                </p>
              ) : (
                <div className={`divide-y ${t.color.divider}`}>
                  {pinnedProjects.map((item) => (
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
        </div>
      </div>
    </PageShell>
  );
}
