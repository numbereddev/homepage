import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearExpiredAdminSessions,
  getAdminSession,
  getAdminByUsername,
  hashPassword,
  verifyPassword,
  updateAdminPassword,
} from "@/lib/db";

const SESSION_COOKIE_NAME = "numbered-dev-admin-session";

type UpdatePasswordBody = {
  currentPassword?: unknown;
  newPassword?: unknown;
  confirmPassword?: unknown;
};

async function requireAdmin() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getAdminSession(token);
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    let body: UpdatePasswordBody;

    try {
      body = (await request.json()) as UpdatePasswordBody;
    } catch {
      return badRequest("Invalid JSON request body.");
    }

    const currentPassword =
      typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body.newPassword === "string" ? body.newPassword : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return badRequest("Current password, new password, and confirmation are required.");
    }

    if (newPassword !== confirmPassword) {
      return badRequest("New password and confirmation do not match.");
    }

    if (newPassword.length < 10) {
      return badRequest("New password must be at least 10 characters long.");
    }

    if (newPassword === currentPassword) {
      return badRequest("New password must be different from the current password.");
    }

    const admin = getAdminByUsername(session.username);

    if (!admin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    const currentPasswordMatches = await verifyPassword(
      currentPassword,
      admin.password_hash,
    );

    if (!currentPasswordMatches) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 },
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    updateAdminPassword(admin.id, newPasswordHash);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("[admin-password] Failed to update password.", error);

    return NextResponse.json(
      { error: "Unable to update password right now." },
      { status: 500 },
    );
  }
}
