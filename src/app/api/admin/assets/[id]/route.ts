import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
import { getFileExtension } from "@/lib/assets";
import { normalizeSlug } from "@/lib/slugs";

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

  const ext = getFileExtension(asset.filename);
  const newSlug = body.slug ? normalizeSlug(body.slug) + ext : "";
  if (!newSlug) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  if (newSlug !== asset.slug && (await assetSlugExists(newSlug, assetId))) {
    return NextResponse.json({ error: "Another asset already uses that slug." }, { status: 409 });
  }

  const oldFilePath = path.join(ASSETS_DIR, asset.slug);
  const newFilePath = path.join(ASSETS_DIR, newSlug);

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

  console.log("asset.slug", asset.slug, "updatedAsset.slug", updatedAsset.slug);
  revalidatePath(`/assets/${asset.slug}`);
  revalidatePath(`/assets/${updatedAsset.slug}`);

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

  const filePath = path.join(ASSETS_DIR, asset.slug);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Failed to delete asset file:", err);
    }
  }

  await deleteAsset(assetId);
  revalidatePath(`/assets/${asset.slug}`);

  return NextResponse.json({
    message: "Asset deleted successfully.",
  });
}
