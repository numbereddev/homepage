import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearExpiredAdminSessions,
  createAdmin,
  createAdminSession,
  getAdminByUsername,
  getSetupStatus,
  hasAnyAdminUsers,
  hashPassword,
} from "@/lib/db";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME?.trim() || "numbered-dev-admin-session";
const SESSION_DURATION_DAYS = 7;

type SetupBody = {
  username?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
};

function isFormRequest(contentType: string | null) {
  return Boolean(
    contentType?.includes("application/x-www-form-urlencoded") ||
      contentType?.includes("multipart/form-data"),
  );
}

function sanitizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function isValidUsername(username: string) {
  return /^[a-z0-9._-]{3,64}$/.test(username);
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 400 });
}

function forbidden(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status: 403 });
}

export async function GET() {
  try {
    const setupStatus = await getSetupStatus();

    if (!setupStatus.ready) {
      return NextResponse.json(
        {
          setupComplete: false,
          canSetup: false,
          status: setupStatus,
        },
        { status: setupStatus.reason === "missing-config" ? 503 : 500 },
      );
    }

    const setupComplete = await hasAnyAdminUsers();

    return NextResponse.json({
      setupComplete,
      canSetup: !setupComplete,
      status: setupStatus,
    });
  } catch (error) {
    console.error("[admin-setup] Failed to fetch setup status.", error);

    return NextResponse.json(
      {
        error: "Unable to determine setup status right now.",
        setupComplete: false,
        canSetup: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const setupStatus = await getSetupStatus();
    const expectsHtml = isFormRequest(request.headers.get("content-type"));

    if (!setupStatus.ready) {
      if (expectsHtml) {
        return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
      }

      return forbidden(
        "MySQL is not ready. Configure and connect the database before running setup.",
        { setupRequired: true, status: setupStatus },
      );
    }

    if (await hasAnyAdminUsers()) {
      if (expectsHtml) {
        return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
      }

      return forbidden("Initial setup has already been completed.", {
        setupComplete: true,
      });
    }

    let username = "";
    let password = "";
    let confirmPassword = "";

    if (expectsHtml) {
      const formData = await request.formData();
      username = typeof formData.get("username") === "string" ? String(formData.get("username")) : "";
      password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
      confirmPassword =
        typeof formData.get("confirmPassword") === "string"
          ? String(formData.get("confirmPassword"))
          : "";
    } else {
      const body = (await request.json()) as SetupBody;
      username = typeof body.username === "string" ? body.username : "";
      password = typeof body.password === "string" ? body.password : "";
      confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
    }

    username = sanitizeUsername(username);

    if (!username || !password || !confirmPassword) {
      if (expectsHtml) {
        return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
      }

      return badRequest("Username, password, and confirmation are required.");
    }

    if (!isValidUsername(username)) {
      return badRequest(
        "Username must be 3-64 characters and use only lowercase letters, numbers, dots, dashes, or underscores.",
      );
    }

    if (password.length < 10) {
      return badRequest("Password must be at least 10 characters long.");
    }

    if (password !== confirmPassword) {
      return badRequest("Password and confirmation do not match.");
    }

    const existingAdmin = await getAdminByUsername(username);

    if (existingAdmin) {
      return badRequest("That username is already in use.");
    }

    const passwordHash = await hashPassword(password);
    const adminId = await createAdmin(username, passwordHash);
    await clearExpiredAdminSessions();

    const session = await createAdminSession(adminId, SESSION_DURATION_DAYS);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });

    if (expectsHtml) {
      return NextResponse.redirect(new URL("/admin", request.url), { status: 303 });
    }

    return NextResponse.json({
      success: true,
      setupComplete: true,
      username,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("[admin-setup] Failed to complete initial setup.", error);

    return NextResponse.json(
      { error: "Unable to complete setup right now." },
      { status: 500 },
    );
  }
}
