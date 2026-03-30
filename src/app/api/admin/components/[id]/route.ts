import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";
import { clearExpiredAdminSessions, getAdminSession } from "@/lib/db";
import { deleteCustomComponent, getCustomComponentById } from "@/lib/content";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const SESSION_COOKIE_NAME = ADMIN_SESSION_COOKIE_NAME;

async function requireAdminSession() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  return getAdminSession(sessionToken);
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await requireAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const component = getCustomComponentById(id);

  if (!component) {
    return NextResponse.json({ error: "Component not found." }, { status: 404 });
  }

  deleteCustomComponent(id);

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({
    message: `Deleted "${component.label}".`,
  });
}
