/**
 * Format a Unix timestamp (ms) into a human-readable date string.
 * Used across all public-facing pages.
 */
export function formatTimestamp(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}

/**
 * Lightweight class-name joiner. Filters out falsy values.
 * Avoids pulling in `clsx` for a project this size.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
