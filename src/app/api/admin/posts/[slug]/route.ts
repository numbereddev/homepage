import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { deletePost, getPostBySlug } from "@/lib/content";
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
  const post = await getPostBySlug(slug, { includeDraft: true });

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      createdAt: post.createdAt,
      published: post.published,
      tags: post.tags,
      cover: post.cover ?? "",
      readingTime: post.readingTime ?? 1,
      content: post.content,
    },
    contentMode: detectContentMode(post.content),
  });
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { slug } = await context.params;
  const post = await getPostBySlug(slug, { includeDraft: true });

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  deletePost(slug);

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);

  return NextResponse.json({
    message: `Deleted "${post.title}".`,
  });
}
