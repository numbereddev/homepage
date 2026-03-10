import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { deleteProject, getProjectBySlug } from "@/lib/projects";
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

function detectContentMode(content: string): "markdown" | "html" {
  const trimmed = content.trim();

  if (!trimmed) {
    return "markdown";
  }

  const htmlSignals = [
    /<style[\s>]/i,
    /<script[\s>]/i,
    /<div[\s>]/i,
    /<section[\s>]/i,
    /<article[\s>]/i,
    /<span[\s>]/i,
    /<svg[\s>]/i,
    /<canvas[\s>]/i,
    /<iframe[\s>]/i,
    /<video[\s>]/i,
    /<details[\s>]/i,
  ];

  return htmlSignals.some((pattern) => pattern.test(trimmed)) ? "html" : "markdown";
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
      tags: project.tags,
      cover: project.cover ?? "",
      readingTime: project.readingTime ?? 1,
      content: project.content,
      gallery: project.gallery,
      sourceUrl: project.sourceUrl,
      isOpenSource: project.isOpenSource,
      pinned: project.pinned,
    },
    contentMode: detectContentMode(project.content),
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
