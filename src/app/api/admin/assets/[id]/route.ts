import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "node:fs";
import path from "node:path";

import {
  clearExpiredAdminSessions,
  getAdminSession,
  getAssetById,
  deleteAsset,
  updateAssetSlug,
  assetSlugExists,
  type AssetRow,
} from "@/lib/db";

import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth";

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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const assetId = parseInt(id, 10);

  if (Number.isNaN(assetId)) {
    return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
  }

  const asset = await getAssetById(assetId);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  return NextResponse.json({ asset: toAssetResponse(asset) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const assetId = parseInt(id, 10);

  if (Number.isNaN(assetId)) {
    return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
  }

  const asset = await getAssetById(assetId);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  let body: { slug?: string };
  try {
    body = (await request.json()) as { slug?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.slug !== "string" || !body.slug.trim()) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const newSlug = normalizeSlug(body.slug);

  if (!newSlug) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  if (newSlug !== asset.slug && (await assetSlugExists(newSlug, assetId))) {
    return NextResponse.json({ error: "Another asset already uses that slug." }, { status: 409 });
  }

  const ext = getFileExtension(asset.filename);
  const oldFilePath = path.join(ASSETS_DIR, `${asset.slug}${ext}`);
  const newFilePath = path.join(ASSETS_DIR, `${newSlug}${ext}`);

  if (newSlug !== asset.slug && fs.existsSync(oldFilePath)) {
    try {
      fs.renameSync(oldFilePath, newFilePath);
    } catch (err) {
      console.error("Failed to rename asset file:", err);
      return NextResponse.json({ error: "Failed to rename file on disk." }, { status: 500 });
    }
  }

  const updatedAsset = await updateAssetSlug(assetId, newSlug);

  if (!updatedAsset) {
    return NextResponse.json({ error: "Failed to update asset." }, { status: 500 });
  }

  return NextResponse.json({
    message: "Asset updated successfully.",
    asset: toAssetResponse(updatedAsset),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireAdmin();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const assetId = parseInt(id, 10);

  if (Number.isNaN(assetId)) {
    return NextResponse.json({ error: "Invalid asset ID." }, { status: 400 });
  }

  const asset = await getAssetById(assetId);

  if (!asset) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const ext = getFileExtension(asset.filename);
  const filePath = path.join(ASSETS_DIR, `${asset.slug}${ext}`);

  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Failed to delete asset file:", err);
    }
  }

  await deleteAsset(assetId);

  return NextResponse.json({
    message: "Asset deleted successfully.",
  });
}
