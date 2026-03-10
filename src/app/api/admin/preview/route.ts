import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { renderContent } from "@/lib/renderer";
import { clearExpiredAdminSessions, getAdminSession } from "@/lib/db";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";

async function requireAdmin() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getAdminSession(token);
}

type PreviewRequestBody = {
  content?: string;
};

export async function POST(request: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: PreviewRequestBody;

  try {
    body = (await request.json()) as PreviewRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content : "";

  if (!content.trim()) {
    return NextResponse.json({ html: "" });
  }

  try {
    const html = await renderContent(content);
    return NextResponse.json({ html });
  } catch (error) {
    console.error("Preview render error:", error);
    return NextResponse.json({ error: "Failed to render preview.", html: "" }, { status: 500 });
  }
}
