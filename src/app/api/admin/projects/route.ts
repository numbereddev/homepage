import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  deleteProject,
  getAllProjects,
  getProjectBySlug,
  saveProject,
  type ProjectMeta,
} from "@/lib/projects";
import { normalizeSlug } from "@/lib/content";
import { clearExpiredAdminSessions, getAdminSession } from "@/lib/db";

type CreateProjectBody = {
  originalSlug?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  createdAt?: number;
  published?: boolean;
  tags?: string[];
  cover?: string;
  readingTime?: number;
  content?: string;
  gallery?: string[];
  sourceUrl?: string;
  isOpenSource?: boolean;
  pinned?: boolean;
};

type ProjectRecordResponse = {
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number;
  published: boolean;
  tags: string[];
  cover?: string;
  readingTime?: number;
  gallery: string[];
  sourceUrl: string;
  isOpenSource: boolean;
  pinned: boolean;
};

const SESSION_COOKIE_NAME = "numbered-dev-admin-session";

async function requireAdmin() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getAdminSession(token);
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) {
    return [];
  }

  return gallery
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

function toProjectRecord(project: ProjectMeta): ProjectRecordResponse {
  return {
    slug: project.slug,
    title: project.title,
    excerpt: project.excerpt,
    createdAt: project.createdAt,
    published: project.published,
    tags: project.tags,
    cover: project.cover,
    readingTime: project.readingTime,
    gallery: project.gallery,
    sourceUrl: project.sourceUrl,
    isOpenSource: project.isOpenSource,
    pinned: project.pinned,
  };
}

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const projects = getAllProjects(true);

  return NextResponse.json({
    projects: projects.map(toProjectRecord),
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CreateProjectBody;

  try {
    body = (await request.json()) as CreateProjectBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const requestedSlug = typeof body.slug === "string" ? normalizeSlug(body.slug) : "";
  const originalSlug =
    typeof body.originalSlug === "string" ? normalizeSlug(body.originalSlug) : "";

  const createdAt = isValidTimestamp(body.createdAt) ? body.createdAt : Date.now();
  const published = typeof body.published === "boolean" ? body.published : true;
  const tags = normalizeTags(body.tags);
  const cover = typeof body.cover === "string" && body.cover.trim() ? body.cover.trim() : undefined;
  const readingTime =
    typeof body.readingTime === "number" && body.readingTime > 0 ? body.readingTime : undefined;
  const gallery = normalizeGallery(body.gallery);
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const isOpenSource = typeof body.isOpenSource === "boolean" ? body.isOpenSource : false;
  const pinned = typeof body.pinned === "boolean" ? body.pinned : false;

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!excerpt) {
    return NextResponse.json({ error: "Excerpt is required." }, { status: 400 });
  }

  if (!content.trim()) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const finalSlug = requestedSlug || normalizeSlug(title);

  if (!finalSlug) {
    return NextResponse.json({ error: "A valid slug or title is required." }, { status: 400 });
  }

  const existingProject = await getProjectBySlug(finalSlug, { includeDraft: true });
  const isRenaming = Boolean(originalSlug && originalSlug !== finalSlug);

  if (existingProject && existingProject.slug !== originalSlug) {
    return NextResponse.json({ error: "Another project already uses that slug." }, { status: 409 });
  }

  if (isRenaming) {
    const originalProject = await getProjectBySlug(originalSlug, { includeDraft: true });

    if (!originalProject) {
      return NextResponse.json(
        { error: "The original project could not be found for rename." },
        { status: 404 },
      );
    }
  }

  saveProject({
    slug: finalSlug,
    title,
    excerpt,
    createdAt,
    published,
    tags,
    cover,
    readingTime,
    content,
    gallery,
    sourceUrl,
    isOpenSource,
    pinned,
  });

  if (isRenaming) {
    deleteProject(originalSlug);
  }

  const project = await getProjectBySlug(finalSlug, { includeDraft: true });

  if (!project) {
    return NextResponse.json(
      { error: "Project was saved but could not be loaded." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: `Saved "${project.title}".`,
    slug: finalSlug,
    project: toProjectRecord(project),
  });
}
