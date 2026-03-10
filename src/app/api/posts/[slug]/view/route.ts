import { type NextRequest, NextResponse } from "next/server";
import { makeFingerprint, recordView, getPostStats } from "@/lib/db";
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
  const ip = getIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const fingerprint = makeFingerprint(ip, ua);

  const isNew = await recordView(slug, fingerprint);

  if (isNew) {
    const stats = await getPostStats(slug);
    broadcast(slug, stats);
  }

  return NextResponse.json({ ok: true });
}
