import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { renderContent, calculateReadingTime } from "./renderer";

// ---------------------------------------------------------------------------
// Post types
// ---------------------------------------------------------------------------

export type PostFrontmatter = {
  title: string;
  excerpt: string;
  createdAt: number; // Unix timestamp in milliseconds
  published: boolean;
  tags: string[];
  cover?: string;
  readingTime?: number;
};

export type PostMeta = PostFrontmatter & {
  slug: string;
};

export type Post = PostMeta & {
  content: string;
  html: string;
};

export type PostInput = {
  slug: string;
  title: string;
  excerpt: string;
  createdAt?: number; // Unix timestamp in milliseconds
  published?: boolean;
  tags?: string[];
  cover?: string;
  readingTime?: number;
  content: string;
};

// ---------------------------------------------------------------------------
// Project types
// ---------------------------------------------------------------------------

export type ProjectFrontmatter = {
  title: string;
  excerpt: string;
  createdAt: number; // Unix timestamp in milliseconds
  published: boolean;
  pinned: boolean;
  tags: string[];
  cover?: string;
  gallery: string[]; // Array of image URLs
  isOpenSource: boolean;
  sourceUrl?: string; // Source code link (only relevant when isOpenSource is true)
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
  createdAt?: number; // Unix timestamp in milliseconds
  published?: boolean;
  pinned?: boolean;
  tags?: string[];
  cover?: string;
  gallery?: string[];
  isOpenSource?: boolean;
  sourceUrl?: string;
  content: string;
};

// ---------------------------------------------------------------------------
// Directories
// ---------------------------------------------------------------------------

const CONTENT_DIR = path.join(process.cwd(), "content", "posts");
const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");

function ensureContentDirectory() {
  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
}

function ensureProjectsDirectory() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

function isMarkdownFile(fileName: string) {
  return fileName.endsWith(".md");
}

export function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function slugFromTitle(title: string) {
  return normalizeSlug(title);
}

export function getPostPath(slug: string) {
  return path.join(CONTENT_DIR, `${normalizeSlug(slug)}.md`);
}

export function getProjectPath(slug: string) {
  return path.join(PROJECTS_DIR, `${normalizeSlug(slug)}.md`);
}

function sortPostsByDate(posts: PostMeta[]) {
  return [...posts].sort((a, b) => {
    // Primary sort: newest to oldest by createdAt timestamp
    const dateDifference = b.createdAt - a.createdAt;

    if (dateDifference !== 0) {
      return dateDifference;
    }

    // Secondary sort: published posts first
    if (a.published !== b.published) {
      return Number(b.published) - Number(a.published);
    }

    // Tertiary sort: alphabetical by title
    const titleComparison = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

    if (titleComparison !== 0) {
      return titleComparison;
    }

    // Final sort: alphabetical by slug
    return a.slug.localeCompare(b.slug, undefined, { sensitivity: "base" });
  });
}

/**
 * Parse legacy date formats to Unix timestamp
 * Supports: Unix timestamp (number), ISO string, YYYY-MM-DD string
 */
function parseDateToTimestamp(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return Date.now();
}

function parseFrontmatter(raw: Record<string, unknown>, slug: string): PostFrontmatter {
  // Support both legacy 'date' field and new 'createdAt' field
  const timestamp = raw.createdAt ?? raw.date;

  return {
    title: typeof raw.title === "string" ? raw.title : slug,
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt : "",
    createdAt: parseDateToTimestamp(timestamp),
    published: typeof raw.published === "boolean" ? raw.published : true,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    cover: typeof raw.cover === "string" ? raw.cover : undefined,
    readingTime: typeof raw.readingTime === "number" ? raw.readingTime : undefined,
  };
}

function parseProjectFrontmatter(raw: Record<string, unknown>, slug: string): ProjectFrontmatter {
  const timestamp = raw.createdAt ?? raw.date;

  return {
    title: typeof raw.title === "string" ? raw.title : slug,
    excerpt: typeof raw.excerpt === "string" ? raw.excerpt : "",
    createdAt: parseDateToTimestamp(timestamp),
    published: typeof raw.published === "boolean" ? raw.published : true,
    pinned: typeof raw.pinned === "boolean" ? raw.pinned : false,
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    cover: typeof raw.cover === "string" ? raw.cover : undefined,
    gallery: Array.isArray(raw.gallery)
      ? raw.gallery.filter((item): item is string => typeof item === "string")
      : [],
    isOpenSource: typeof raw.isOpenSource === "boolean" ? raw.isOpenSource : false,
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : undefined,
  };
}

export async function renderPostContent(content: string): Promise<string> {
  return renderContent(content);
}

export function getAllPosts(includeDrafts = false): PostMeta[] {
  ensureContentDirectory();

  const files = fs.readdirSync(CONTENT_DIR).filter(isMarkdownFile);

  const posts = files.map((fileName) => {
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

  return sortPostsByDate(includeDrafts ? posts : posts.filter((post) => post.published));
}

export async function getPostBySlug(
  slug: string,
  options?: { includeDraft?: boolean },
): Promise<Post | null> {
  ensureContentDirectory();

  const normalizedSlug = normalizeSlug(slug);
  const fullPath = getPostPath(normalizedSlug);

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
    html: await renderPostContent(content),
  };
}

export function savePost(input: PostInput) {
  ensureContentDirectory();

  const slug = normalizeSlug(input.slug || input.title);
  const filePath = getPostPath(slug);

  // Calculate reading time if not provided
  const readingTime = input.readingTime ?? calculateReadingTime(input.content);

  // Use provided timestamp or current time for new posts
  const createdAt = input.createdAt ?? Date.now();

  const frontmatter: Record<string, unknown> = {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    createdAt,
    published: input.published ?? true,
    tags: input.tags ?? [],
    readingTime,
  };

  if (input.cover) {
    frontmatter.cover = input.cover.trim();
  }

  const file = matter.stringify(input.content.trimEnd() + "\n", frontmatter);
  fs.writeFileSync(filePath, file, "utf8");

  return slug;
}

export function deletePost(slug: string) {
  ensureContentDirectory();

  const filePath = getPostPath(slug);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getPostSlugs(): string[] {
  ensureContentDirectory();

  return fs
    .readdirSync(CONTENT_DIR)
    .filter(isMarkdownFile)
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export function getEmptyPostTemplate() {
  return {
    slug: "",
    title: "",
    excerpt: "",
    createdAt: Date.now(),
    published: true,
    tags: [] as string[],
    cover: "",
    readingTime: 1,
    content: `# New Post

Write something sharp, useful, and technical.

## Highlights

- Clean architecture
- Practical lessons
- Clear examples

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

<div class="demo-box">
  <strong>Rich HTML block</strong>
  <p>You can mix Markdown with safe HTML for richer visuals.</p>
</div>

<style>

  .demo-box {
    border: 1px solid #334155;
    padding: 1rem;
    margin-top: 1rem;
    background: #0f172a;
    color: #e2e8f0;
  }
</style>
`,
  };
}

// ---------------------------------------------------------------------------
// Projects — CRUD
// ---------------------------------------------------------------------------

export function getAllProjects(includeDrafts = false): ProjectMeta[] {
  ensureProjectsDirectory();

  const files = fs.readdirSync(PROJECTS_DIR).filter(isMarkdownFile);

  const projects = files.map((fileName) => {
    const slug = fileName.replace(/\.md$/, "");
    const fullPath = path.join(PROJECTS_DIR, fileName);
    const source = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(source);
    const frontmatter = parseProjectFrontmatter(data, slug);

    return {
      slug,
      ...frontmatter,
    };
  });

  const filtered = includeDrafts ? projects : projects.filter((p) => p.published);

  return [...filtered].sort((a, b) => {
    // Pinned projects first
    if (a.pinned !== b.pinned) {
      return Number(b.pinned) - Number(a.pinned);
    }
    // Then by date, newest first
    const dateDiff = b.createdAt - a.createdAt;
    if (dateDiff !== 0) return dateDiff;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

export function getPinnedProjects(): ProjectMeta[] {
  return getAllProjects(false).filter((p) => p.pinned);
}

export async function getProjectBySlug(
  slug: string,
  options?: { includeDraft?: boolean },
): Promise<Project | null> {
  ensureProjectsDirectory();

  const normalizedSlug = normalizeSlug(slug);
  const fullPath = getProjectPath(normalizedSlug);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const source = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(source);
  const frontmatter = parseProjectFrontmatter(data, normalizedSlug);

  if (!options?.includeDraft && !frontmatter.published) {
    return null;
  }

  return {
    slug: normalizedSlug,
    ...frontmatter,
    content,
    html: await renderContent(content),
  };
}

export function saveProject(input: ProjectInput) {
  ensureProjectsDirectory();

  const slug = normalizeSlug(input.slug || input.title);
  const filePath = getProjectPath(slug);

  const createdAt = input.createdAt ?? Date.now();

  const frontmatter: Record<string, unknown> = {
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    createdAt,
    published: input.published ?? true,
    pinned: input.pinned ?? false,
    tags: input.tags ?? [],
    gallery: input.gallery ?? [],
    isOpenSource: input.isOpenSource ?? false,
  };

  if (input.cover) {
    frontmatter.cover = input.cover.trim();
  }

  if (input.isOpenSource && input.sourceUrl) {
    frontmatter.sourceUrl = input.sourceUrl.trim();
  }

  const file = matter.stringify(input.content.trimEnd() + "\n", frontmatter);
  fs.writeFileSync(filePath, file, "utf8");

  return slug;
}

export function deleteProject(slug: string) {
  ensureProjectsDirectory();

  const filePath = getProjectPath(slug);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function getProjectSlugs(): string[] {
  ensureProjectsDirectory();

  return fs
    .readdirSync(PROJECTS_DIR)
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
    pinned: false,
    tags: [] as string[],
    cover: "",
    gallery: [] as string[],
    isOpenSource: false,
    sourceUrl: "",
    content: `# New Project

Describe what this project does, why it exists, and what makes it interesting.

## Features

- Feature one
- Feature two
- Feature three

## Technical Details

Explain the architecture, stack choices, and key implementation decisions.
`,
  };
}
