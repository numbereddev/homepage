import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  clearExpiredAdminSessions,
  createAdminSession,
  deleteAdminSession,
  getAdminByUsername,
  verifyPassword,
} from "@/lib/db";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME?.trim() || "numbered-dev-admin-session";
const SESSION_DURATION_DAYS = 7;

function unauthorized(message = "Invalid username or password.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isFormRequest(contentType: string | null) {
  return Boolean(
    contentType?.includes("application/x-www-form-urlencoded") ||
    contentType?.includes("multipart/form-data"),
  );
}

function getOrigin(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");

  if (forwardedProto && host) {
    return `${forwardedProto}://${host}`;
  }

  return new URL(request.url).origin;
}

function getAdminRedirectUrl(request: Request) {
  return new URL("/admin", getOrigin(request));
}

export async function POST(request: Request) {
  try {
    await clearExpiredAdminSessions();

    const contentType = request.headers.get("content-type");
    const expectsHtml = isFormRequest(contentType);

    let username = "";
    let password = "";

    if (expectsHtml) {
      const formData = await request.formData();
      const rawUsername = formData.get("username");
      const rawPassword = formData.get("password");

      username = typeof rawUsername === "string" ? rawUsername.trim() : "";
      password = typeof rawPassword === "string" ? rawPassword : "";
    } else {
      const body = (await request.json()) as {
        username?: unknown;
        password?: unknown;
      };

      username = typeof body.username === "string" ? body.username.trim() : "";
      password = typeof body.password === "string" ? body.password : "";
    }

    if (!username || !password) {
      if (expectsHtml) {
        return NextResponse.redirect(getAdminRedirectUrl(request), {
          status: 303,
        });
      }

      return badRequest("Username and password are required.");
    }

    const admin = await getAdminByUsername(username);

    if (!admin) {
      if (expectsHtml) {
        return NextResponse.redirect(getAdminRedirectUrl(request), {
          status: 303,
        });
      }

      return unauthorized();
    }

    const passwordMatches = await verifyPassword(password, admin.password_hash);

    if (!passwordMatches) {
      if (expectsHtml) {
        return NextResponse.redirect(getAdminRedirectUrl(request), {
          status: 303,
        });
      }

      return unauthorized();
    }

    const session = await createAdminSession(admin.id, SESSION_DURATION_DAYS);
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(session.expiresAt),
    });

    if (expectsHtml) {
      return NextResponse.redirect(getAdminRedirectUrl(request), {
        status: 303,
      });
    }

    return NextResponse.json({
      success: true,
      username: admin.username,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("[admin-login] Failed to sign in.", error);

    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await deleteAdminSession(sessionToken);
    }

    cookieStore.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin-login] Failed to sign out.", error);

    return NextResponse.json({ error: "Unable to sign out right now." }, { status: 500 });
  }
}
