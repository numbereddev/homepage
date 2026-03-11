import { type NextRequest, NextResponse } from "next/server";
import { makeFingerprint, toggleReaction, getPostStats, REACTIONS } from "@/lib/db";
import { broadcast } from "@/lib/sse";

type Params = { params: Promise<{ slug: string }> };

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emoji = (body as Record<string, unknown>)?.emoji;
  if (typeof emoji !== "string" || !(REACTIONS as readonly string[]).includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const ip = getIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const fingerprint = makeFingerprint(ip, ua);

  const { added } = await toggleReaction(slug, emoji, fingerprint);
  const stats = await getPostStats(slug, fingerprint);
  const broadcastStats = await getPostStats(slug);

  broadcast(slug, broadcastStats);

  return NextResponse.json({ ok: true, added, stats });
}
