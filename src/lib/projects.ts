import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderContent, calculateReadingTime } from "./renderer";
import { normalizeSlug } from "./content";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProjectFrontmatter = {
  title: string;
  excerpt: string;
  createdAt: number; // Unix timestamp in milliseconds
  published: boolean;
  tags: string[];
  cover?: string;
  readingTime?: number;
  // Project-specific fields
  gallery: string[]; // Array of image URLs
  sourceUrl: string; // Source code link (e.g. GitHub URL)
  isOpenSource: boolean; // Whether the project is open source
  pinned: boolean; // Whether to show in homepage sidebar
};

export type ProjectMeta = ProjectFrontmatter & {
  slug: string;
};

export type Project = ProjectMeta & {
  content: string;
  html: string;
};

export type ProjectInput = {
  slug: string;
  title: string;
  excerpt: string;
  createdAt?: number;
  published?: boolean;
  tags?: string[];
  cover?: string;
  readingTime?: number;
  content: string;
  gallery?: string[];
  sourceUrl?: string;
  isOpenSource?: boolean;
  pinned?: boolean;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureContentDirectory() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

function isMarkdownFile(fileName: string) {
  return fileName.endsWith(".md");
}

function sortProjectsByDate(projects: ProjectMeta[]) {
  return [...projects].sort((a, b) => {
    // Primary: pinned first
    if (a.pinned !== b.pinned) {
      return Number(b.pinned) - Number(a.pinned);
    }

    // Secondary: newest to oldest
    const dateDifference = b.createdAt - a.createdAt;
    if (dateDifference !== 0) {
      return dateDifference;
    }

    // Tertiary: published first
    if (a.published !== b.published) {
      return Number(b.published) - Number(a.published);
    }

    // Final: alphabetical by title
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

/**
 * Parse legacy date formats to Unix timestamp
 */
function parseDateToTimestamp(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function parseFrontmatter(raw: Record<string, unknown>, slug: string): ProjectFrontmatter {
  const timestamp = raw.createdAt ?? raw.date;

  return {
    title: typeof raw.title === "string" ? raw.title : slug,
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt : "",
    createdAt: parseDateToTimestamp(timestamp),
    published: typeof raw.published === "boolean" ? raw.published : true,
    tags: parseStringArray(raw.tags),
    cover: typeof raw.cover === "string" ? raw.cover : undefined,
    readingTime: typeof raw.readingTime === "number" ? raw.readingTime : undefined,
    gallery: parseStringArray(raw.gallery),
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
    isOpenSource: typeof raw.isOpenSource === "boolean" ? raw.isOpenSource : false,
    pinned: typeof raw.pinned === "boolean" ? raw.pinned : false,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getProjectPath(slug: string) {
  return path.join(CONTENT_DIR, `${normalizeSlug(slug)}.md`);
}

export async function renderProjectContent(content: string): Promise<string> {
  return renderContent(content);
}

export function getAllProjects(includeDrafts = false): ProjectMeta[] {
  ensureContentDirectory();

  const files = fs.readdirSync(CONTENT_DIR).filter(isMarkdownFile);

  const projects = files.map((fileName) => {
    const slug = fileName.replace(/\.md$/, "");
    const fullPath = path.join(CONTENT_DIR, fileName);
    const source = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(source);
    const frontmatter = parseFrontmatter(data, slug);

    return {
      slug,
      ...frontmatter,
    };
  });

  return sortProjectsByDate(
    includeDrafts ? projects : projects.filter((project) => project.published),
  );
}

export function getPinnedProjects(): ProjectMeta[] {
  return getAllProjects(false).filter((project) => project.pinned);
}

export async function getProjectBySlug(
  slug: string,
  options?: { includeDraft?: boolean },
): Promise<Project | null> {
  ensureContentDirectory();

  const normalizedSlug = normalizeSlug(slug);
  const fullPath = getProjectPath(normalizedSlug);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const source = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(source);
  const frontmatter = parseFrontmatter(data, normalizedSlug);

  if (!options?.includeDraft && !frontmatter.published) {
    return null;
  }

  return {
    slug: normalizedSlug,
    ...frontmatter,
    content,
    html: await renderProjectContent(content),
  };
}

export function saveProject(input: ProjectInput) {
  ensureContentDirectory();

  const slug = normalizeSlug(input.slug || input.title);
  const filePath = getProjectPath(slug);

  const readingTime = input.readingTime ?? calculateReadingTime(input.content);
  const createdAt = input.createdAt ?? Date.now();

  const frontmatter: Record<string, unknown> = {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    createdAt,
    published: input.published ?? true,
    tags: input.tags ?? [],
    readingTime,
    gallery: input.gallery ?? [],
    sourceUrl: (input.sourceUrl ?? "").trim(),
    isOpenSource: input.isOpenSource ?? false,
    pinned: input.pinned ?? false,
  };

  if (input.cover) {
    frontmatter.cover = input.cover.trim();
  }

  const file = matter.stringify(input.content.trimEnd() + "\n", frontmatter);
  fs.writeFileSync(filePath, file, "utf8");

  return slug;
}

export function deleteProject(slug: string) {
  ensureContentDirectory();

  const filePath = getProjectPath(slug);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getProjectSlugs(): string[] {
  ensureContentDirectory();

  return fs
    .readdirSync(CONTENT_DIR)
    .filter(isMarkdownFile)
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getEmptyProjectTemplate() {
  return {
    slug: "",
    title: "",
    excerpt: "",
    createdAt: Date.now(),
    published: true,
    tags: [] as string[],
    cover: "",
    readingTime: 1,
    content: `# New Project

Describe your project here.

## Overview

What does this project do and why does it exist?

## Key Features

- Feature one
- Feature two
- Feature three

## Technical Details

Explain the architecture, stack, and interesting engineering decisions.
`,
    gallery: [] as string[],
    sourceUrl: "",
    isOpenSource: false,
    pinned: false,
  };
}
