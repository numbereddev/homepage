import { type NextRequest, NextResponse } from "next/server";
import { makeFingerprint, getPostStats } from "@/lib/db";

type Params = { params: Promise<{ slug: string }> };

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const ip = getIp(req);
  const ua = req.headers.get("user-agent") ?? "";
  const fingerprint = makeFingerprint(ip, ua);

  const stats = await getPostStats(slug, fingerprint);
  return NextResponse.json(stats);
}
