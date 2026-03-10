import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  deletePost,
  getAllPosts,
  getPostBySlug,
  normalizeSlug,
  savePost,
  type PostMeta,
} from "@/lib/content";
import { clearExpiredAdminSessions, getAdminSession } from "@/lib/db";

type ContentMode = "markdown" | "html";

type CreatePostBody = {
  originalSlug?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  createdAt?: number; // Unix timestamp in milliseconds
  published?: boolean;
  tags?: string[];
  cover?: string;
  readingTime?: number;
  content?: string;
  contentMode?: ContentMode;
};

type PostRecordResponse = {
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number; // Unix timestamp in milliseconds
  published: boolean;
  tags: string[];
  cover?: string;
  readingTime?: number;
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

function isValidTimestamp(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && value > 0;
}

function normalizeContentMode(value: unknown): ContentMode {
  return value === "html" ? "html" : "markdown";
}

function toPostRecord(post: PostMeta): PostRecordResponse {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    createdAt: post.createdAt,
    published: post.published,
    tags: post.tags,
    cover: post.cover,
    readingTime: post.readingTime,
  };
}

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const posts = getAllPosts(true);

  return NextResponse.json({
    posts: posts.map(toPostRecord),
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CreatePostBody;

  try {
    body = (await request.json()) as CreatePostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  const requestedSlug = typeof body.slug === "string" ? normalizeSlug(body.slug) : "";
  const originalSlug =
    typeof body.originalSlug === "string" ? normalizeSlug(body.originalSlug) : "";

  // Use provided timestamp or current time for new posts
  const createdAt = isValidTimestamp(body.createdAt) ? body.createdAt : Date.now();

  const published = typeof body.published === "boolean" ? body.published : true;
  const tags = normalizeTags(body.tags);
  const cover = typeof body.cover === "string" && body.cover.trim() ? body.cover.trim() : undefined;
  const readingTime =
    typeof body.readingTime === "number" && body.readingTime > 0 ? body.readingTime : undefined;
  const contentMode = normalizeContentMode(body.contentMode);

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

  const existingPost = await getPostBySlug(finalSlug, { includeDraft: true });
  const isRenaming = Boolean(originalSlug && originalSlug !== finalSlug);

  if (existingPost && existingPost.slug !== originalSlug) {
    return NextResponse.json({ error: "Another post already uses that slug." }, { status: 409 });
  }

  if (isRenaming) {
    const originalPost = await getPostBySlug(originalSlug, { includeDraft: true });

    if (!originalPost) {
      return NextResponse.json(
        { error: "The original post could not be found for rename." },
        { status: 404 },
      );
    }
  }

  savePost({
    slug: finalSlug,
    title,
    excerpt,
    createdAt,
    published,
    tags,
    cover,
    readingTime,
    content,
  });

  if (isRenaming) {
    revalidatePath(`/blog/${originalSlug}`);
    deletePost(originalSlug);
  }

  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${finalSlug}`);

  const post = await getPostBySlug(finalSlug, { includeDraft: true });

  if (!post) {
    return NextResponse.json({ error: "Post was saved but could not be loaded." }, { status: 500 });
  }

  return NextResponse.json({
    message: `Saved "${post.title}".`,
    slug: finalSlug,
    contentMode,
    post: toPostRecord(post),
  });
}
