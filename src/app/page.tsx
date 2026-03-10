import Link from "next/link";
import { cookies } from "next/headers";
import { getAllPosts, getPinnedProjects } from "@/lib/content";
import { getAllLinks, getAdminSession } from "@/lib/db";
import { formatTimestamp } from "@/lib/utils";
import { t } from "@/lib/tokens";
import { AnimatedDiv, AnimatedSection, PageTransition, StaggerIn } from "@/components/animations";
import {
  PageShell,
  SiteNav,
  SectionHeading,
  PostCard,
  ProjectRow,
  EmptyState,
} from "@/components/ui";

const WORK_ITEMS = [
  {
    id: "01",
    title: "Product Engineering",
    description: "I build interfaces and systems that stay clear under real-world complexity.",
  },
  {
    id: "02",
    title: "Backend development",
    description:
      "Scalable backend systems, APIs, and infrastructure that keep products reliable as they grow.",
  },
  {
    id: "03",
    title: "Frontend Systems",
    description:
      "Design systems, application architecture, and clean experiences with strong structure.",
  },
  {
    id: "04",
    title: "Technical Writing",
    description: "I write to make architecture, tradeoffs, and implementation details legible.",
  },
];

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME?.trim() || "numbered-dev-admin-session";

export default async function HomePage() {
  const latestPosts = getAllPosts(false).slice(0, 4);
  const pinnedProjects = getPinnedProjects().slice(0, 3);
  const links = await getAllLinks();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const adminSession = sessionToken ? await getAdminSession(sessionToken) : null;

  const header = (
    <PageTransition>
      <div className="grid gap-px bg-neutral-800 lg:grid-cols-[1.3fr_0.7fr]">
        {/* ── Left: hero copy ── */}
        <div className={`${t.color.base} p-6 sm:p-8 lg:p-10`}>
          <AnimatedDiv className="mb-8" delay={40}>
            <SiteNav />
          </AnimatedDiv>

          <AnimatedDiv className="max-w-3xl space-y-5" delay={120}>
            <p className={`${t.text.meta} ${t.color.muted}`}>
              Software Engineer · UI Designer · Entrepeneur
            </p>

            <h1 className={`${t.text.hero} text-white`}>
              Modern software,
              <br />
              sharp interfaces,
              <br />
              clear thinking.
            </h1>

            <p className={`max-w-2xl ${t.text.bodyLg} ${t.color.body}`}>
              I am Engin Ü. (aka Numbered Dev) and I have been doing software development ever since
              I was 10 years old. I got into Figma at around 15 years and have had my first IT
              internship at 16 years old at ALMiG.
            </p>
          </AnimatedDiv>

          <AnimatedDiv className="mt-10 flex flex-wrap gap-3" delay={220}>
            <Link href="/blog" className={t.btn.primary}>
              Read Posts
            </Link>
            <Link href="/projects" className={t.btn.ghost}>
              My Projects
            </Link>
            <a href="#work" className={t.btn.ghost}>
              View Focus
            </a>
            {adminSession ? (
              <Link href="/admin" className={t.btn.ghost}>
                Go to Admin
              </Link>
            ) : null}
          </AnimatedDiv>
        </div>

        {/* ── Right: latest posts + linktree + style note ── */}
        <div className="grid gap-px bg-neutral-800">
          {/* Featured Projects */}
          <AnimatedDiv className={`${t.color.base} p-6`} delay={160}>
            <p className={`mb-4 ${t.text.meta} ${t.color.muted}`}>Featured Projects</p>

            {pinnedProjects.length > 0 ? (
              <StaggerIn className="space-y-2" initialDelay={220} stagger={90} distance={18}>
                {pinnedProjects.slice(0, 2).map((project) => (
                  <ProjectRow
                    key={project.slug}
                    slug={project.slug}
                    title={project.title}
                    excerpt={project.excerpt}
                    date={formatTimestamp(project.createdAt)}
                    isOpenSource={project.isOpenSource}
                  />
                ))}
              </StaggerIn>
            ) : (
              <p className={`border ${t.color.border} p-4 ${t.text.body} ${t.color.muted}`}>
                No pinned projects yet.
              </p>
            )}
          </AnimatedDiv>

          {/* Style note */}
          <AnimatedDiv className={`${t.color.base} p-6`} delay={260}>
            <p className={`${t.text.meta} ${t.color.muted}`}>My Stack</p>
            <StaggerIn
              className={`mt-3 flex flex-wrap gap-3 ${t.text.body} ${t.color.body}`}
              initialDelay={320}
              stagger={70}
              distance={14}
            >
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                TypeScript
              </div>
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                JavaScript
              </div>
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                Rust
              </div>
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                Golang
              </div>
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                Figma
              </div>
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                Next.JS
              </div>
              <div
                className={`group flex items-center justify-between border ${t.color.border} px-3 py-1`}
              >
                SvelteKit
              </div>
            </StaggerIn>
          </AnimatedDiv>
        </div>
      </div>
    </PageTransition>
  );

  return (
    <PageShell header={header} footerRight="Software Engineer · UI Designer · Entrepeneur">
      {/* ── Latest posts grid ── */}
      <AnimatedSection className={`border-b ${t.color.border} ${t.pad.section}`} delay={120}>
        <SectionHeading
          eyebrow="Posts"
          title="Latest posts"
          action={
            <Link href="/blog" className={`${t.text.cta} ${t.link.muted}`}>
              View all →
            </Link>
          }
        />

        {latestPosts.length > 0 ? (
          <StaggerIn className="grid gap-5 lg:grid-cols-2" initialDelay={180} stagger={110}>
            {latestPosts.map((post) => (
              <PostCard
                key={post.slug}
                slug={post.slug}
                title={post.title}
                excerpt={post.excerpt}
                date={formatTimestamp(post.createdAt)}
                tags={post.tags}
                readingTime={post.readingTime}
                cover={post.cover}
              />
            ))}
          </StaggerIn>
        ) : (
          <EmptyState
            title="Nothing published yet."
            body="Add your first post in the admin panel and it will appear here automatically."
            action={
              <Link href="/admin" className={`${t.text.cta} ${t.link.accent}`}>
                Go to admin →
              </Link>
            }
          />
        )}
      </AnimatedSection>

      {/* ── Work focus items ── */}
      <AnimatedSection
        id="work"
        className={`border-b ${t.color.border} ${t.pad.section} bg-white/1`}
        delay={180}
      >
        <StaggerIn
          className={`grid gap-px border ${t.color.border} bg-neutral-800`}
          initialDelay={220}
          stagger={100}
          distance={20}
        >
          {WORK_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}
            >
              <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>
                {item.id}
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                  {item.title}
                </h2>
                <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </StaggerIn>
      </AnimatedSection>

      <AnimatedSection className={`border-b ${t.color.border} ${t.pad.section}`} delay={240}>
        <SectionHeading eyebrow="Career" title="How it's been going" />

        <div className={`grid gap-px border ${t.color.border} bg-neutral-800 md:grid-cols-2`}>
          <div className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}>
            <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>2018</div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">Began coding</h2>
              <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                This was the start of my journey in software development and the foundation for
                everything I build today.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}>
            <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>
              2020-2021
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                First game hosting platform
              </h2>
              <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                I started my first game hosting platform, gaining early experience in product
                building, infrastructure, and running software for real users.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}>
            <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>2022</div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Discovered Figma
              </h2>
              <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                I discovered and learned Figma, which deepened my understanding of interface design,
                systems thinking, and how product design supports engineering.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}>
            <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>2023</div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                IT internship at ALMiG
              </h2>
              <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                I completed a one-week internship in IT at ALMiG, gaining early hands-on experience
                working in a professional technical environment.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}>
            <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>
              2024-2026
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Building rebxd cloud platform
              </h2>
              <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                I started building{" "}
                <a
                  href="https://rebxd.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={t.link.accent}
                >
                  rebxd cloud platform
                </a>
                , focusing on scalable systems, product development, and platform architecture.
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${t.color.base} ${t.pad.card} lg:grid-cols-[100px_1fr]`}>
            <div className={`text-sm font-semibold tracking-[0.2em] ${t.color.accent}`}>
              July 2027
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white">Graduation</h2>
              <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>
                Projected High-School graduation at my Gymnasium in Germany.
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>

      <section className={`${t.pad.section} bg-white/1`}>
        <SectionHeading eyebrow="Linktree" title="Where you can find me" />

        {links.length > 0 && (
          <div className={`${t.color.base}`}>
            <div className="grid gap-5 lg:grid-cols-3 md:grid-cols-2">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center justify-between border ${t.color.border} px-4 py-3 transition-colors ${t.color.hoverBorderAccentDim} ${t.color.hoverAccent}`}
                >
                  <span className={`${t.text.body} font-medium ${t.color.bodyStrong}`}>
                    {link.label}
                  </span>
                  <span
                    className={`${t.color.faint} transition-colors ${t.color.groupHoverAccentBase}`}
                  >
                    →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
