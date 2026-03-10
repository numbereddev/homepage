import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";

import {
  clearExpiredAdminSessions,
  getAdminSession,
  getAllAssets,
  createAsset,
  assetSlugExists,
  type AssetRow,
} from "@/lib/db";

const SESSION_COOKIE_NAME = "numbered-dev-admin-session";
const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

async function requireAdmin() {
  clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return getAdminSession(token);
}

function ensureAssetsDirectory() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
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

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filename.slice(lastDot);
}

function toAssetResponse(asset: AssetRow) {
  return {
    id: asset.id,
    slug: asset.slug,
    filename: asset.filename,
    mimeType: asset.mime_type,
    size: asset.size,
    createdAt: asset.created_at,
    url: `/assets/${asset.slug}${getFileExtension(asset.filename)}`,
  };
}

export async function GET() {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const assets = getAllAssets();

  return NextResponse.json({
    assets: assets.map(toAssetResponse),
  });
}

export async function POST(request: Request) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  ensureAssetsDirectory();

  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data request." },
      { status: 400 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse form data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  const slugInput = formData.get("slug");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const originalFilename = file.name || "upload";
  const mimeType = file.type || "application/octet-stream";
  const size = file.size;

  // Generate or normalize slug
  let slug: string;
  if (typeof slugInput === "string" && slugInput.trim()) {
    slug = normalizeSlug(slugInput);
  } else {
    // Use filename without extension as slug
    const baseName = originalFilename.replace(/\.[^.]+$/, "");
    slug = normalizeSlug(baseName);
  }

  if (!slug) {
    slug = `asset-${Date.now()}`;
  }

  // Ensure slug is unique
  let finalSlug = slug;
  let counter = 1;
  while (assetSlugExists(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  // Save file to disk with slug + original extension
  const ext = getFileExtension(originalFilename);
  const savedFilename = `${finalSlug}${ext}`;
  const filePath = path.join(ASSETS_DIR, savedFilename);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error("Failed to save asset file:", err);
    return NextResponse.json(
      { error: "Failed to save file to disk." },
      { status: 500 }
    );
  }

  // Save to database
  const asset = createAsset(finalSlug, originalFilename, mimeType, size);

  return NextResponse.json({
    message: "Asset uploaded successfully.",
    asset: toAssetResponse(asset),
  });
}
