export const OG_DOMAIN = "numbered.dev";

export const OG_COLORS = {
  background: "#0e0f0f",
  white: "#ffffff",
  accent: "#5b9fd6",
  muted: "#91a0b3",
  muted2: "#637287",
  separator: "#334155",
} as const;

// Title: fontSize 68 × lineHeight 1.1 × 2 lines ≈ 150px
export const TITLE_FONT_SIZE = 68;
export const TITLE_LINE_HEIGHT = 1.1;
export const TITLE_MAX_LINES = 2;
export const TITLE_HEIGHT = Math.ceil(
  TITLE_FONT_SIZE * TITLE_LINE_HEIGHT * TITLE_MAX_LINES,
);

// Excerpt: fontSize 26 × lineHeight 1.4 × 2 lines ≈ 73px
export const EXCERPT_FONT_SIZE = 26;
export const EXCERPT_LINE_HEIGHT = 1.4;
export const EXCERPT_MAX_LINES = 2;
export const EXCERPT_HEIGHT = Math.ceil(
  EXCERPT_FONT_SIZE * EXCERPT_LINE_HEIGHT * EXCERPT_MAX_LINES,
);
