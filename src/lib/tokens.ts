/**
 * Design tokens for the public site.
 *
 * Every colour, typography variant, and spacing pattern used in public-facing
 * components lives here. Import these instead of hard-coding Tailwind classes
 * directly in component files so that a single change propagates everywhere.
 *
 * These are plain string constants — no runtime overhead, Tailwind scans them
 * just like any other string via the content glob.
 *
 * Convention:
 *   t.color.*   — text colours
 *   t.bg.*      — background colours
 *   t.border.*  — border colours + widths
 *   t.text.*    — font-size / tracking / weight combos
 *   t.surface.* — complete surface class sets (bg + border)
 *   t.link.*    — full interactive link class sets
 *   t.btn.*     — full button class sets
 */

// ---------------------------------------------------------------------------
// Colour primitives (Tailwind utility classes)
// ---------------------------------------------------------------------------

const color = {
  // Text
  heading: "text-white",
  body: "text-neutral-400",
  bodyStrong: "text-neutral-300",
  muted: "text-neutral-500",
  faint: "text-neutral-600",
  accent: "text-sky-500",
  accentHover: "text-sky-400",

  // Hover text (static so Tailwind includes them)
  hoverAccent: "hover:text-sky-400",
  hoverBodyStrong: "hover:text-neutral-300",

  // Group-hover text (static so Tailwind includes them)
  groupHoverAccent: "group-hover:text-sky-400",
  groupHoverAccentBase: "group-hover:text-sky-500",

  // Backgrounds
  base: "bg-neutral-950",
  panel: "bg-neutral-900",

  // Borders
  border: "border-neutral-800",
  borderStrong: "border-neutral-700",
  borderAccent: "border-sky-600",
  borderAccentDim: "border-sky-700",
  divider: "divide-neutral-800",

  // Hover borders (static so Tailwind includes them)
  hoverBorderAccent: "hover:border-sky-600",
  hoverBorderAccentDim: "hover:border-sky-700",

  // Hover background (static so Tailwind includes them)
  hoverBgTransparent: "hover:bg-transparent",
} as const;

// ---------------------------------------------------------------------------
// Typography scale (font-size + letter-spacing combos used repeatedly)
// ---------------------------------------------------------------------------

const text = {
  /** Mono-style kicker / eyebrow / label above a heading */
  kicker: "text-[11px] font-semibold uppercase tracking-[0.32em]",
  /** Inline meta row: date, reading time, tags */
  meta: "text-[11px] uppercase tracking-[0.22em]",
  /** Even smaller: tag pills, status badges */
  micro: "text-[10px] uppercase tracking-[0.22em]",
  /** Standard "Read post →" CTA label */
  cta: "text-[11px] font-semibold uppercase tracking-[0.2em]",
  /** Small nav / button label */
  label: "text-[11px] font-medium uppercase tracking-[0.2em]",
  /** Body copy — used in cards, excerpts */
  body: "text-sm leading-7",
  /** Slightly larger body used in prose areas */
  bodyLg: "text-sm leading-7 sm:text-base",
  /** Section/card headings */
  cardTitle: "text-xl font-semibold tracking-[-0.04em] sm:text-2xl",
  /** Page-level h1 */
  pageTitle: "text-4xl font-semibold tracking-[-0.04em] sm:text-5xl",
  /** Hero h1 on homepage */
  hero: "text-4xl font-semibold tracking-[-0.03em] sm:text-6xl",
} as const;

// ---------------------------------------------------------------------------
// Surface combos  (border + background — the most repeated pattern)
// ---------------------------------------------------------------------------

const surface = {
  /** Default card: subtle border, near-black bg */
  card: `border ${color.border} ${color.base}`,
  /** Hover state for interactive cards */
  cardHover: color.hoverBorderAccentDim,
  /** Divider line between stacked items */
  divide: color.divider,
  /** Panel header row (e.g. sidebar section headers) */
  panelHeader: `border-b ${color.border} px-4 py-3`,
} as const;

// ---------------------------------------------------------------------------
// Interactive link / button class sets
// ---------------------------------------------------------------------------

const link = {
  /** Accent-coloured inline text link */
  accent: `${color.accent} transition-colors ${color.hoverAccent}`,
  /** Muted nav-style link that brightens on hover */
  muted: `${color.muted} transition-colors ${color.hoverAccent}`,
  /** Full block item: border flashes accent on hover */
  blockItem: `block border ${color.border} transition-colors ${color.hoverBorderAccentDim}`,
} as const;

const btn = {
  /** Primary filled button (accent background) */
  primary: `border ${color.borderAccent} bg-sky-600 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-950 transition hover:bg-transparent ${color.hoverAccent}`,
  /** Ghost button: visible border, no fill */
  ghost: `border ${color.border} px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] ${color.bodyStrong} transition ${color.hoverBorderAccentDim} ${color.hoverAccent}`,
  /** Nav pill used in SiteNav for secondary links */
  nav: `border ${color.border} px-3 py-2 ${text.label} ${color.bodyStrong} transition-colors ${color.hoverBorderAccent} ${color.hoverAccent}`,
  /** Logo / wordmark pill */
  logo: `border ${color.borderAccent} px-3 py-1 ${text.kicker} ${color.accent} transition-colors hover:bg-sky-600 hover:text-neutral-950`,
} as const;

// ---------------------------------------------------------------------------
// Padding / spacing patterns used across page sections
// ---------------------------------------------------------------------------

const pad = {
  /** Standard section padding inside a page card */
  section: "p-5 sm:p-8 lg:p-10",
  /** Standard card inner padding */
  card: "p-5 sm:p-6",
  /** Compact panel padding (sidebar sections, mini cards) */
  panel: "px-4 py-4",
  /** Header padding (inside the top <header> card) */
  header: "p-6 sm:p-8",
} as const;

// ---------------------------------------------------------------------------
// Export as a single namespace `t`
// ---------------------------------------------------------------------------

export const t = {
  color,
  text,
  surface,
  link,
  btn,
  pad,
} as const;

// Named re-exports so callers can destructure selectively:
//   import { t } from "@/lib/tokens";
//   import { color, text } from "@/lib/tokens";
export { color, text, surface, link, btn, pad };
