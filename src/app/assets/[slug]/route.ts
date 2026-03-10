import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";

import { getAssetBySlug } from "@/lib/db";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot);
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Invalid asset slug." }, { status: 400 });
  }

  const normalizedSlug = normalizeSlug(slug.replace(/\.[^.]+$/, ""));
  if (!normalizedSlug) {
    return NextResponse.json({ error: "Invalid asset slug." }, { status: 400 });
  }

  const asset = await getAssetBySlug(normalizedSlug);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const ext = getFileExtension(asset.filename);
  const filePath = path.join(ASSETS_DIR, `${asset.slug}${ext}`);

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "Asset file not found." }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Asset file not found." }, { status: 404 });
  }

  let fileStream: fs.ReadStream;
  try {
    fileStream = fs.createReadStream(filePath);
  } catch {
    return NextResponse.json({ error: "Failed to read asset file." }, { status: 500 });
  }

  const webStream = Readable.toWeb(fileStream) as ReadableStream<Uint8Array>;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": asset.mime_type || "application/octet-stream",
      "Content-Length": String(stat.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
