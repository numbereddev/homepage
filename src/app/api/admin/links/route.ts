import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  getAllLinks,
  createLink,
  updateLink,
  reorderLinks,
  deleteLink,
  clearExpiredAdminSessions,
  getAdminSession,
} from "@/lib/db";

const SESSION_COOKIE_NAME = "numbered-dev-admin-session";

async function requireAdmin() {
  clearExpiredAdminSessions();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getAdminSession(token);
}

/** GET /api/admin/links — public, no auth required */
export async function GET() {
  try {
    const links = getAllLinks();
    return NextResponse.json({ links });
  } catch (err) {
    console.error("[links] GET failed", err);
    return NextResponse.json({ error: "Failed to load links." }, { status: 500 });
  }
}

/** POST /api/admin/links — create a new link */
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { label?: unknown; url?: unknown };
  try {
    body = (await request.json()) as { label?: unknown; url?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!label) return NextResponse.json({ error: "Label is required." }, { status: 400 });
  if (!url) return NextResponse.json({ error: "URL is required." }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "URL is not valid." }, { status: 400 });
  }

  try {
    const link = createLink(label, url);
    return NextResponse.json({ link }, { status: 201 });
  } catch (err) {
    console.error("[links] POST failed", err);
    return NextResponse.json({ error: "Failed to create link." }, { status: 500 });
  }
}

/** PATCH /api/admin/links — update a link or reorder the list */
export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { id?: unknown; label?: unknown; url?: unknown; order?: unknown };
  try {
    body = (await request.json()) as {
      id?: unknown;
      label?: unknown;
      url?: unknown;
      order?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Reorder mode: { order: number[] }
  if (Array.isArray(body.order)) {
    const ids = body.order as unknown[];
    if (!ids.every((x) => typeof x === "number")) {
      return NextResponse.json({ error: "order must be an array of numbers." }, { status: 400 });
    }
    try {
      reorderLinks(ids as number[]);
      return NextResponse.json({ links: getAllLinks() });
    } catch (err) {
      console.error("[links] PATCH reorder failed", err);
      return NextResponse.json({ error: "Failed to reorder links." }, { status: 500 });
    }
  }

  // Update mode: { id, label, url }
  const id = typeof body.id === "number" ? body.id : undefined;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Label is required." }, { status: 400 });
  if (!url) return NextResponse.json({ error: "URL is required." }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "URL is not valid." }, { status: 400 });
  }

  try {
    const link = updateLink(id, label, url);
    if (!link) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({ link });
  } catch (err) {
    console.error("[links] PATCH update failed", err);
    return NextResponse.json({ error: "Failed to update link." }, { status: 500 });
  }
}

/** DELETE /api/admin/links — delete a link by id */
export async function DELETE(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { id?: unknown };
  try {
    body = (await request.json()) as { id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body.id === "number" ? body.id : undefined;
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  try {
    deleteLink(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[links] DELETE failed", err);
    return NextResponse.json({ error: "Failed to delete link." }, { status: 500 });
  }
}
