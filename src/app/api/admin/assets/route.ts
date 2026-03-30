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
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";
import { getFileExtension } from "@/lib/assets";
import { normalizeSlug } from "@/lib/content";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

async function requireAdmin() {
  await clearExpiredAdminSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return await getAdminSession(token);
}

function ensureAssetsDirectory() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

function toAssetResponse(asset: AssetRow) {
  return {
    id: asset.id,
    slug: asset.slug,
    filename: asset.filename,
    mimeType: asset.mime_type,
    size: asset.size,
    createdAt: asset.created_at,
    url: `/assets/${asset.slug}`,
  };
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const assets = await getAllAssets();
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
    return NextResponse.json({ error: "Expected multipart/form-data request." }, { status: 400 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const customSlug = formData.get("slug");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const originalFilename = file.name.trim();
  const originalExt = getFileExtension(originalFilename);
  const mimeType = file.type || "application/octet-stream";

  let slug: string = `asset-${Date.now()}${originalExt}`;
  if (typeof customSlug === "string" && customSlug.trim()) {
    slug = normalizeSlug(`${customSlug}${originalExt}`);
  } else if (originalFilename) {
    slug = normalizeSlug(originalFilename);
  }

  let counter = 1;
  while (await assetSlugExists(slug)) {
    // replace last file extension with counter and add it before the extension
    slug = `${slug.replace(/\.[^.]+$/, `-${counter}`)}${originalExt}`;
    counter++;
  }

  const filePath = path.join(ASSETS_DIR, slug);
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error("Failed to save asset file:", err);
    return NextResponse.json({ error: "Failed to save file to disk." }, { status: 500 });
  }

  try {
    const asset = await createAsset(slug, originalFilename, mimeType, file.size);

    return NextResponse.json({
      message: "Asset uploaded successfully.",
      asset: toAssetResponse(asset),
    });
  } catch (err) {
    console.error("Failed to save asset metadata:", err);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupErr) {
      console.error("Failed to clean up uploaded asset file:", cleanupErr);
    }

    return NextResponse.json({ error: "Failed to save asset metadata." }, { status: 500 });
  }
}
