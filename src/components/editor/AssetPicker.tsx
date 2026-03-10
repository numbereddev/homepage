"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import AssetUploadModal, { type AssetData } from "./AssetUploadModal";

declare global {
  interface Window {
    __projectEditorSelectedGalleryAsset?: AssetData;
  }
}

type AssetPickerProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onSelectAction: (asset: AssetData, insertType: InsertType) => void;
  onAddToGalleryAction?: (asset: AssetData) => void;
};

type InsertType = "markdown" | "html-img" | "html-video" | "html-audio" | "url-only";

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
      hour: "2-digit",
      minute: "2-digit",
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

function getInsertOptions(mimeType: string): { value: InsertType; label: string }[] {
  const category = getMimeCategory(mimeType);

  const options: { value: InsertType; label: string }[] = [
    { value: "url-only", label: "URL Only" },
  ];

  if (category === "image") {
    options.unshift(
      { value: "markdown", label: "Markdown Image" },
      { value: "html-img", label: "HTML <img>" },
    );
  } else if (category === "video") {
    options.unshift({ value: "html-video", label: "HTML <video>" });
  } else if (category === "audio") {
    options.unshift({ value: "html-audio", label: "HTML <audio>" });
  }

  return options;
}

export default function AssetPicker({
  isOpen,
  onCloseAction,
  onSelectAction,
  onAddToGalleryAction,
}: AssetPickerProps) {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "audio" | "other">(
    "all",
  );
  const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
  const [insertType, setInsertType] = useState<InsertType>("markdown");
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/assets", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch assets.");
      }

      setAssets(data.assets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
      setSelectedAsset(null);
      window.__projectEditorSelectedGalleryAsset = undefined;
      setSearchQuery("");
      setFilterType("all");
    } else {
      window.__projectEditorSelectedGalleryAsset = undefined;
    }
  }, [isOpen, fetchAssets]);

  const handleAssetUploaded = useCallback((asset: AssetData) => {
    setAssets((prev) => [asset, ...prev]);
    setSelectedAsset(asset);
    window.__projectEditorSelectedGalleryAsset = asset;
    setShowUploadModal(false);

    // Set default insert type based on mime type
    const category = getMimeCategory(asset.mimeType);
    if (category === "image") {
      setInsertType("markdown");
    } else if (category === "video") {
      setInsertType("html-video");
    } else if (category === "audio") {
      setInsertType("html-audio");
    } else {
      setInsertType("url-only");
    }
  }, []);

  const handleSelect = useCallback(() => {
    if (selectedAsset) {
      onSelectAction(selectedAsset, insertType);
      onCloseAction();
    }
  }, [selectedAsset, insertType, onSelectAction, onCloseAction]);

  const handleAddToGallery = useCallback(() => {
    if (selectedAsset && onAddToGalleryAction) {
      onAddToGalleryAction(selectedAsset);
      onCloseAction();
    }
  }, [selectedAsset, onAddToGalleryAction, onCloseAction]);

  const handleAssetClick = useCallback((asset: AssetData) => {
    setSelectedAsset(asset);
    window.__projectEditorSelectedGalleryAsset = asset;

    // Set default insert type based on mime type
    const category = getMimeCategory(asset.mimeType);
    if (category === "image") {
      setInsertType("markdown");
    } else if (category === "video") {
      setInsertType("html-video");
    } else if (category === "audio") {
      setInsertType("html-audio");
    } else {
      setInsertType("url-only");
    }
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-55 bg-black/70 backdrop-blur-sm" onClick={onCloseAction} />

      <div className="fixed inset-2 z-55 flex flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] sm:inset-4 lg:inset-12 xl:inset-16">
        <header className="border-b border-[#202632] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                Asset Manager
              </p>
              <h2 className="text-base font-semibold text-white sm:text-lg">Select Asset</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="flex-1 border border-[#3a4758] bg-[#f5f7fa] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0a0d12] transition hover:bg-[#dfe6ee] sm:flex-none"
              >
                + Upload New
              </button>
              <button
                type="button"
                onClick={onCloseAction}
                className="shrink-0 p-2 text-[#607080] hover:text-[#f5f7fa] transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Asset grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Search and filter */}
            <div className="mb-5 flex flex-col gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full min-w-0 border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
              />

              <div className="grid grid-cols-2 border border-[#202632] sm:flex">
                {(["all", "image", "video", "audio", "other"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(type)}
                    className={[
                      "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
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

            {error && (
              <div className="mb-5 border border-[#5b3030] bg-[#1a1010] px-4 py-3">
                <p className="text-sm text-[#ff8f8f]">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[#607080]">Loading assets...</p>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="border border-dashed border-[#3a4758] p-8 text-center">
                <p className="text-sm text-[#8fa1b3]">
                  {assets.length === 0
                    ? "No assets yet. Upload your first file."
                    : "No assets match your search."}
                </p>
                {assets.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="mt-4 border border-[#3a4758] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7dd3fc] transition hover:bg-[#151c25]"
                  >
                    Upload Asset
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {filteredAssets.map((asset) => {
                  const isSelected = selectedAsset?.id === asset.id;
                  const category = getMimeCategory(asset.mimeType);

                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => handleAssetClick(asset)}
                      className={[
                        "group flex flex-col border text-left transition-all",
                        isSelected
                          ? "border-[#7dd3fc] bg-[#0f1520]"
                          : "border-[#202632] bg-[#0b0f14] hover:border-[#3a4758]",
                      ].join(" ")}
                    >
                      {/* Preview */}
                      <div className="relative aspect-square overflow-hidden bg-[#080b10]">
                        {category === "image" ? (
                          <Image
                            src={asset.url}
                            alt={asset.slug}
                            width={320}
                            height={320}
                            className="h-full w-full object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <span className="text-3xl text-[#3a4758]">
                              {category === "video" && "🎬"}
                              {category === "audio" && "🎵"}
                              {category === "other" && "📄"}
                            </span>
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#7dd3fc]/20">
                            <svg
                              className="text-[#7dd3fc]"
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="border-t border-[#202632] p-2">
                        <p className="truncate text-xs font-medium text-white">{asset.slug}</p>
                        <p className="truncate text-[10px] text-[#506172]">
                          {formatFileSize(asset.size)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected asset details */}
          {selectedAsset && (
            <aside className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-[#202632] bg-[#0b0f14] p-4 sm:p-5 lg:max-h-none lg:w-80 lg:border-l lg:border-t-0">
              <div className="space-y-5">
                {/* Preview */}
                <div className="aspect-video overflow-hidden border border-[#202632] bg-[#080b10]">
                  {getMimeCategory(selectedAsset.mimeType) === "image" ? (
                    <Image
                      src={selectedAsset.url}
                      alt={selectedAsset.slug}
                      width={640}
                      height={360}
                      className="h-full w-full object-contain"
                      unoptimized
                    />
                  ) : getMimeCategory(selectedAsset.mimeType) === "video" ? (
                    <video
                      src={selectedAsset.url}
                      controls
                      className="h-full w-full object-contain"
                    />
                  ) : getMimeCategory(selectedAsset.mimeType) === "audio" ? (
                    <div className="flex h-full w-full items-center justify-center p-4">
                      <audio src={selectedAsset.url} controls className="w-full" />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-4xl text-[#3a4758]">📄</span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                      Slug
                    </p>
                    <p className="mt-1 text-sm text-white">{selectedAsset.slug}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                      Original filename
                    </p>
                    <p className="mt-1 text-sm text-[#c7d0db] truncate">{selectedAsset.filename}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                      URL
                    </p>
                    <p className="mt-1 text-sm font-mono text-[#7dd3fc] break-all">
                      {selectedAsset.url}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                        Type
                      </p>
                      <p className="mt-1 text-sm text-[#c7d0db]">{selectedAsset.mimeType}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                        Size
                      </p>
                      <p className="mt-1 text-sm text-[#c7d0db]">
                        {formatFileSize(selectedAsset.size)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                      Uploaded
                    </p>
                    <p className="mt-1 text-sm text-[#c7d0db]">
                      {formatDate(selectedAsset.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Insert options */}
                <div className="border-t border-[#202632] pt-5">
                  <label className="block">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7d8a99]">
                      Insert as
                    </span>
                    <select
                      value={insertType}
                      onChange={(e) => setInsertType(e.target.value as InsertType)}
                      className="w-full border border-[#202632] bg-[#0a0d12] px-3 py-2 text-sm text-white outline-none transition focus:border-[#7dd3fc]"
                    >
                      {getInsertOptions(selectedAsset.mimeType).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Preview of what will be inserted */}
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#506172]">
                      Preview
                    </p>
                    <pre className="mt-2 overflow-x-auto border border-[#202632] bg-[#080b10] p-3 text-xs text-[#8fa1b3]">
                      {insertType === "markdown" &&
                        `![${selectedAsset.slug}](${selectedAsset.url})`}
                      {insertType === "html-img" &&
                        `<img src="${selectedAsset.url}" alt="${selectedAsset.slug}" />`}
                      {insertType === "html-video" &&
                        `<video src="${selectedAsset.url}" controls></video>`}
                      {insertType === "html-audio" &&
                        `<audio src="${selectedAsset.url}" controls></audio>`}
                      {insertType === "url-only" && selectedAsset.url}
                    </pre>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#202632] px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCloseAction}
            className="w-full border border-[#202632] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa1b3] transition hover:bg-[#151c25] sm:w-auto"
          >
            Cancel
          </button>
          {onAddToGalleryAction && (
            <button
              type="button"
              onClick={handleAddToGallery}
              disabled={!selectedAsset}
              className="w-full border border-[#3a4758] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5f7fa] transition hover:bg-[#151c25] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Add to Gallery
            </button>
          )}
          <button
            type="button"
            onClick={handleSelect}
            disabled={!selectedAsset}
            className="w-full border border-[#3a4758] bg-[#f5f7fa] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Insert Asset
          </button>
        </footer>
      </div>

      <AssetUploadModal
        isOpen={showUploadModal}
        onCloseAction={() => setShowUploadModal(false)}
        onUploadedAction={handleAssetUploaded}
      />
    </>
  );
}

export type { AssetData, InsertType };
