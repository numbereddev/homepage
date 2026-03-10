/**
 * Shared public-site UI components.
 *
 * All colours, typography, and spacing pull from the design token system
 * in @/lib/tokens rather than being hard-coded inline. Admin components are
 * intentionally kept separate and are unaffected by changes here.
 */

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { t } from "@/lib/tokens";

const PAGE_TRANSITION_PROPS = {
  style: {
    viewTransitionName: "page",
  } as React.CSSProperties,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NavItem = {
  href: string;
  label: string;
};

// ---------------------------------------------------------------------------
// SiteNav
// ---------------------------------------------------------------------------

const DEFAULT_NAV: NavItem[] = [{ href: "/blog", label: "Blog" }];

/**
 * Horizontal nav bar rendered in every page header.
 * Logo is always shown; extra nav items are optional.
 */
export function SiteNav({
  items = DEFAULT_NAV,
  logoHref = "/",
}: {
  items?: NavItem[];
  logoHref?: string;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href={logoHref} className={t.btn.logo} {...PAGE_TRANSITION_PROPS}>
        Numbered Dev
      </Link>

      <span className={`hidden h-px flex-1 sm:block ${t.color.border} bg-neutral-800`} />

      {items.map((item) => (
        <Link
          key={item.href + item.label}
          href={item.href}
          className={t.btn.nav}
          {...PAGE_TRANSITION_PROPS}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// SiteFooter
// ---------------------------------------------------------------------------

export function SiteFooter({ left, right }: { left?: string; right?: string }) {
  return (
    <footer className={`mt-4 border ${t.color.border} ${t.color.base} px-6 py-4 sm:px-8`}>
      <div
        className={`flex flex-col gap-2 ${t.text.meta} ${t.color.faint} sm:flex-row sm:items-center sm:justify-between`}
      >
        <span>{left ?? "Numbered Dev"}</span>
        {right ? <span>{right}</span> : null}
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// PageShell
// ---------------------------------------------------------------------------

/**
 * Full-page wrapper: outer grid background, centred column, header card,
 * main content card, footer. The outer div is transparent so the body's
 * grid pattern shows through the gutters around the cards.
 */
export function PageShell({
  header,
  children,
  footerLeft,
  footerRight,
  narrow = false,
}: {
  header: ReactNode;
  children: ReactNode;
  footerLeft?: string;
  footerRight?: string;
  narrow?: boolean;
}) {
  const maxW = narrow ? "max-w-5xl" : "max-w-6xl";

  return (
    <div className="min-h-screen text-neutral-100">
      <div
        className={`mx-auto flex min-h-screen w-full ${maxW} flex-col px-4 py-4 sm:px-6 sm:py-6`}
      >
        <header className={`border ${t.color.border} ${t.color.base}`}>{header}</header>

        <main
          className={`mt-4 flex-1 border ${t.color.border} ${t.color.base}`}
          {...PAGE_TRANSITION_PROPS}
        >
          {children}
        </main>

        <SiteFooter left={footerLeft} right={footerRight} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel  (bordered card with a labelled header row)
// ---------------------------------------------------------------------------

/**
 * A bordered card with a consistent header label row and slotted body.
 * Used for sidebar sections, info boxes, etc.
 */
export function Panel({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border ${t.color.border} ${className}`}>
      <div className={t.surface.panelHeader}>
        <p className={`${t.text.kicker} ${t.color.accent}`}>{label}</p>
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// TagList
// ---------------------------------------------------------------------------

/** Row of tag pills. Renders nothing when the list is empty. */
export function TagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`border ${t.color.border} bg-white/8 px-2 py-1 ${t.text.micro} ${t.color.muted}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostMeta  (date · reading-time · status row)
// ---------------------------------------------------------------------------

/** Compact metadata row shown above a post title. */
export function PostMeta({
  date,
  readingTime,
  published,
}: {
  date: string;
  readingTime?: number;
  published?: boolean;
}) {
  const sep = (
    <span className="inline-block h-px w-6 translate-y-[-0.1em] bg-neutral-700" aria-hidden />
  );

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${t.text.meta} ${t.color.muted}`}>
      <span>{date}</span>
      {readingTime != null && (
        <>
          {sep}
          <span>{readingTime} min read</span>
        </>
      )}
      {published != null && (
        <>
          {sep}
          <span>{published ? "Published" : "Draft"}</span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionHeading
// ---------------------------------------------------------------------------

export function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={`mb-6 flex flex-col gap-3 border-b ${t.color.border} pb-5 sm:flex-row sm:items-end sm:justify-between`}
    >
      <div>
        <p className={`mb-2 ${t.text.kicker} ${t.color.accent}`}>{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white sm:text-3xl">
          {title}
        </h2>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PostRow  (compact fully-clickable post item — sidebar + mini lists)
// ---------------------------------------------------------------------------

/**
 * A single-line clickable post entry used in:
 *   - the "Latest" sidebar column on the homepage
 *   - the "More posts" sidebar on the post detail page
 *
 * The entire surface is the click target so there's no dead zone.
 */
export function PostRow({
  slug,
  title,
  excerpt,
  date,
  readingTime,
  variant = "card",
}: {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime?: number;
  /**
   * "card"  — standalone item with its own visible border (e.g. homepage Latest list).
   * "flush" — no outer border; relies on a parent divide-y for separation (e.g. sidebar).
   */
  variant?: "card" | "flush";
}) {
  const base =
    variant === "flush"
      ? `group block p-4 transition-colors hover:bg-neutral-900`
      : `group block border ${t.color.border} p-4 transition-colors ${t.color.hoverBorderAccentDim}`;

  return (
    <Link href={`/blog/${slug}`} className={base} {...PAGE_TRANSITION_PROPS}>
      <p className={`${t.text.meta} ${t.color.muted}`}>
        {date}
        {readingTime ? ` · ${readingTime} min` : ""}
      </p>
      <h2
        className={`mt-2 text-base font-semibold tracking-[-0.03em] text-white transition-colors ${t.color.groupHoverAccent}`}
      >
        {title}
      </h2>
      <p className={`mt-1 line-clamp-2 ${t.text.body} ${t.color.body}`}>{excerpt}</p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// PostCard  (full card — homepage grid + any future grid use)
// ---------------------------------------------------------------------------

export type PostCardProps = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tags?: string[];
  readingTime?: number;
  cover?: string;
};

/**
 * Full-height card used in grid layouts.
 * The entire card surface is clickable via an absolute overlay link.
 * The visible title link sits above it for right-click / middle-click support.
 */
export function PostCard({
  slug,
  title,
  excerpt,
  date,
  tags = [],
  readingTime,
  cover,
}: PostCardProps) {
  return (
    <Link
      href={`/blog/${slug}`}
      className={`group relative flex h-full flex-col justify-between overflow-hidden border ${t.color.border} ${t.color.base} transition-colors ${t.color.hoverBorderAccentDim}`}
      {...PAGE_TRANSITION_PROPS}
    >
      {cover ? (
        <>
          <div className="absolute inset-0">
            <Image
              src={cover}
              alt={title}
              fill
              unoptimized
              className="object-cover grayscale transition duration-500 group-hover:scale-[1.02] group-hover:grayscale-0"
            />
          </div>
          <div className="absolute inset-0 bg-black/88 transition duration-500 group-hover:bg-black/72" />
          <div className="absolute inset-0 backdrop-blur-md transition duration-500 group-hover:backdrop-blur-sm" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
        </>
      ) : null}

      <div className={`relative space-y-4 ${t.pad.card}`}>
        <PostMeta date={date} readingTime={readingTime} />

        <div className="max-w-2xl space-y-2">
          <h3
            className={`${t.text.cardTitle} text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] transition-colors ${t.color.groupHoverAccent}`}
          >
            {title}
          </h3>
          <p className={`${t.text.body} text-neutral-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]`}>
            {excerpt}
          </p>
        </div>

        <div className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
          <TagList tags={tags} />
        </div>
      </div>

      <div className={`relative border-t ${t.color.border} bg-black/25 px-5 py-3 sm:px-6`}>
        <span
          aria-hidden="true"
          className={`inline-flex items-center gap-2 ${t.text.cta} ${t.color.accent} drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]`}
        >
          Read post <span>→</span>
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className={`border ${t.color.border} ${t.pad.header}`}>
      <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</h2>
      <p className={`mt-3 max-w-2xl ${t.text.body} ${t.color.body}`}>{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
