import Link from "next/link";
import type { Metadata } from "next";

import { getAllProjects } from "@/lib/content";
import { formatTimestamp } from "@/lib/utils";
import { t } from "@/lib/tokens";
import { PageShell, SiteNav, EmptyState, PostMeta, TagList } from "@/components/ui";
import { AnimatedDiv, PageTransition, StaggerIn } from "@/components/animations";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "All published projects from Numbered Dev — software engineering work, open source contributions, and technical explorations.",
};

export default function ProjectsIndexPage() {
  const projects = getAllProjects(false);

  const header = (
    <PageTransition>
      <div className={`flex flex-col gap-6 ${t.pad.header}`}>
        <AnimatedDiv delay={40} distance={18}>
          <SiteNav items={[{ href: "/blog", label: "Blog" }]} />
        </AnimatedDiv>

        <AnimatedDiv className="space-y-4" delay={120} duration={760} distance={28}>
          <p className={`${t.text.kicker} ${t.color.accent}`}>Projects</p>
          <h1 className={`${t.text.pageTitle} text-white`}>
            Things I&apos;ve built,
            <br />
            shipped, and open-sourced.
          </h1>
        </AnimatedDiv>
      </div>
    </PageTransition>
  );

  return (
    <PageShell header={header} footerRight="All published projects.">
      <PageTransition className={t.pad.header}>
        {projects.length === 0 ? (
          <AnimatedDiv delay={120} distance={20}>
            <EmptyState
              title="No projects published yet."
              body="Publish your first project from the admin area and it will show up here automatically."
              action={
                <Link href="/admin" className={`${t.text.cta} ${t.link.accent}`}>
                  Go to admin →
                </Link>
              }
            />
          </AnimatedDiv>
        ) : (
          <>
            <AnimatedDiv
              className={`mb-6 flex items-center justify-between border-b ${t.color.border} pb-4`}
              delay={100}
              distance={16}
            >
              <p className={`${t.text.kicker} ${t.color.muted}`}>Projects</p>
              <span className={`${t.text.meta} ${t.color.faint}`}>{projects.length} total</span>
            </AnimatedDiv>

            <StaggerIn className="grid gap-4" stagger={90} initialDelay={140} distance={22}>
              {projects.map((project, index) => (
                <article
                  key={project.slug}
                  className={`group relative overflow-hidden border ${t.color.border} ${t.color.base} transition-colors ${t.color.hoverBorderAccentDim}`}
                >
                  {project.cover ? (
                    <>
                      <div
                        className="absolute inset-0 bg-center bg-cover grayscale transition duration-500 group-hover:scale-[1.02] group-hover:grayscale-0"
                        style={{ backgroundImage: `url(${project.cover})` }}
                      />
                      <div className="absolute inset-0 bg-black/88 transition duration-500 group-hover:bg-black/72" />
                      <div className="absolute inset-0 backdrop-blur-md transition duration-500 group-hover:backdrop-blur-sm" />
                      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/65 to-transparent" />
                    </>
                  ) : null}

                  <Link
                    href={`/projects/${project.slug}`}
                    className={`relative grid gap-6 ${t.pad.card} lg:grid-cols-[64px_minmax(0,1fr)_220px]`}
                  >
                    {/* Index number */}
                    <div className="flex items-start lg:block">
                      <span className={`text-sm font-semibold tracking-[0.22em] ${t.color.accent}`}>
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="min-w-0 space-y-3">
                      <div className="[text-shadow:0_2px_10px_rgba(0,0,0,0.85)]">
                        <div
                          className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${t.text.meta} ${t.color.muted}`}
                        >
                          <span>{formatTimestamp(project.createdAt)}</span>

                          {project.isOpenSource && (
                            <>
                              <span
                                className="inline-block h-px w-6 translate-y-[-0.1em] bg-neutral-700"
                                aria-hidden
                              />
                              <span className="text-emerald-400">Open Source</span>
                            </>
                          )}
                          {project.pinned && (
                            <>
                              <span
                                className="inline-block h-px w-6 translate-y-[-0.1em] bg-neutral-700"
                                aria-hidden
                              />
                              <span className="text-sky-400">Featured</span>
                            </>
                          )}
                        </div>
                        <h2
                          className={`text-2xl font-semibold tracking-[-0.04em] text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.9)] transition-colors ${t.color.groupHoverAccent} sm:text-3xl`}
                        >
                          {project.title}
                        </h2>
                        <p
                          className={`max-w-3xl ${t.text.body} text-neutral-200 [text-shadow:0_2px_10px_rgba(0,0,0,0.85)]`}
                        >
                          {project.excerpt}
                        </p>
                      </div>
                      <div className="[text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                        <TagList tags={project.tags} />
                      </div>
                    </div>

                    {/* View link */}
                    <div className="flex items-end justify-end">
                      <span
                        className={`inline-flex items-center gap-2 ${t.text.cta} ${t.color.accent} [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]`}
                      >
                        View project <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </StaggerIn>
          </>
        )}
      </PageTransition>
    </PageShell>
  );
}
