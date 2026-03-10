"use client";

import Image from "next/image";
import { useState, useCallback } from "react";
import AssetUploadModal, { type AssetData } from "./editor/AssetUploadModal";

type AssetsManagerProps = {
  initialAssets: AssetData[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function getMimeCategory(mimeType: string): "image" | "video" | "audio" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "other";
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AssetsManager({ initialAssets }: AssetsManagerProps) {
  const [assets, setAssets] = useState<AssetData[]>(initialAssets);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetData | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "audio" | "other">(
    "all",
  );
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleAssetUploaded = useCallback((asset: AssetData) => {
    setAssets((prev) => [asset, ...prev]);
    setShowUploadModal(false);
  }, []);

  const handleStartEdit = useCallback((asset: AssetData) => {
    setEditingAsset(asset);
    setEditSlug(asset.slug);
    setError("");
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingAsset(null);
    setEditSlug("");
    setError("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingAsset) return;

    const newSlug = normalizeSlug(editSlug);
    if (!newSlug) {
      setError("Slug is required.");
      return;
    }

    if (newSlug === editingAsset.slug) {
      handleCancelEdit();
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/assets/${editingAsset.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: newSlug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update asset.");
      }

      setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? data.asset : a)));
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setIsSaving(false);
    }
  }, [editingAsset, editSlug, handleCancelEdit]);

  const handleDelete = useCallback(async (asset: AssetData) => {
    const confirmed = window.confirm(`Delete "${asset.slug}"? This cannot be undone.`);

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/assets/${asset.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete asset.");
      }

      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }, []);

  const handleCopyUrl = useCallback((asset: AssetData) => {
    navigator.clipboard.writeText(asset.url);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      !searchQuery ||
      asset.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const category = getMimeCategory(asset.mimeType);
    const matchesFilter = filterType === "all" || category === filterType;

    return matchesSearch && matchesFilter;
  });

  const imageCount = assets.filter((a) => getMimeCategory(a.mimeType) === "image").length;
  const videoCount = assets.filter((a) => getMimeCategory(a.mimeType) === "video").length;
  const audioCount = assets.filter((a) => getMimeCategory(a.mimeType) === "audio").length;
  const otherCount = assets.filter((a) => getMimeCategory(a.mimeType) === "other").length;

  return (
    <div className="border border-[#202632] bg-[#0b0f14]">
      <div className="border-b border-[#202632] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7d8a99]">
              Assets
            </p>
            <p className="mt-1 text-xs text-[#607080]">
              {assets.length} total · {imageCount} images · {videoCount} videos · {audioCount} audio
              · {otherCount} other
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="border border-[#3a4758] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5f7fa] transition hover:bg-[#151c25]"
          >
            + Upload
          </button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Search and filter */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="flex-1 border border-[#202632] bg-[#0f141b] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
          />

          <div className="flex border border-[#202632]">
            {(["all", "image", "video", "audio", "other"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={[
                  "px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] transition",
                  filterType === type
                    ? "bg-[#f5f7fa] text-[#0a0d12]"
                    : "text-[#c7d0db] hover:bg-[#151c25]",
                ].join(" ")}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Assets list */}
        {filteredAssets.length === 0 ? (
          <div className="border border-dashed border-[#3a4758] p-6 text-center">
            <p className="text-sm text-[#8fa1b3]">
              {assets.length === 0
                ? "No assets yet. Upload your first file."
                : "No assets match your search."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredAssets.map((asset) => {
              const isEditing = editingAsset?.id === asset.id;
              const category = getMimeCategory(asset.mimeType);

              return (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 border border-[#202632] bg-[#0a0d12] p-3"
                >
                  {/* Thumbnail */}
                  <div className="h-12 w-12 shrink-0 overflow-hidden border border-[#202632] bg-[#080b10]">
                    {category === "image" ? (
                      <Image
                        src={asset.url}
                        alt={asset.slug}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg">
                        {category === "video" && "🎬"}
                        {category === "audio" && "🎵"}
                        {category === "other" && "📄"}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="w-full border border-[#202632] bg-[#0f141b] px-2 py-1 text-sm text-white outline-none focus:border-[#7dd3fc]"
                          autoFocus
                        />
                        {error && <p className="text-xs text-[#ff8f8f]">{error}</p>}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isSaving}
                            className="border border-[#3a4758] bg-[#f5f7fa] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:opacity-50"
                          >
                            {isSaving ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="border border-[#202632] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8fa1b3] transition hover:bg-[#151c25]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-white truncate">{asset.slug}</p>
                        <p className="text-[10px] text-[#506172] truncate">
                          {asset.url} · {formatFileSize(asset.size)} · {formatDate(asset.createdAt)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(asset)}
                        className="border border-[#202632] px-2 py-1 text-[9px] font-medium text-[#8fa1b3] transition hover:bg-[#151c25] hover:text-white"
                        title="Copy URL"
                      >
                        {copiedId === asset.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(asset)}
                        className="border border-[#202632] px-2 py-1 text-[9px] font-medium text-[#8fa1b3] transition hover:bg-[#151c25] hover:text-white"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(asset)}
                        className="border border-[#202632] px-2 py-1 text-[9px] font-medium text-[#8fa1b3] transition hover:border-[#7f3030] hover:text-[#fca5a5]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AssetUploadModal
        isOpen={showUploadModal}
        onCloseAction={() => setShowUploadModal(false)}
        onUploadedAction={handleAssetUploaded}
      />
    </div>
  );
}

export type { AssetData };
