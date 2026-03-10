import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { deleteProject, getProjectBySlug } from "@/lib/content";
import { clearExpiredAdminSessions, getAdminSession } from "@/lib/db";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

const SESSION_COOKIE_NAME = "numbered-dev-admin-session";

async function requireAdminSession() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return getAdminSession(sessionToken);
}

export async function GET(_: Request, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await context.params;
  const project = await getProjectBySlug(slug, { includeDraft: true });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      slug: project.slug,
      title: project.title,
      excerpt: project.excerpt,
      createdAt: project.createdAt,
      published: project.published,
      pinned: project.pinned,
      tags: project.tags,
      cover: project.cover ?? "",
      gallery: project.gallery,
      isOpenSource: project.isOpenSource,
      sourceUrl: project.sourceUrl ?? "",
      content: project.content,
    },
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await context.params;
  const project = await getProjectBySlug(slug, { includeDraft: true });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  deleteProject(slug);

  return NextResponse.json({
    message: `Deleted "${project.title}".`,
  });
}
