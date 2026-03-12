"use client";

import { useState, useCallback, useRef } from "react";
import { Modal } from "./Modal";

export type AssetData = {
  id: number;
  slug: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
};

type AssetUploadModalProps = {
  isOpen: boolean;
  onCloseAction: () => void;
  onUploadedAction: (asset: AssetData) => void;
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AssetUploadModal({
  isOpen,
  onCloseAction,
  onUploadedAction,
}: AssetUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [slug, setSlug] = useState("");
  const [isAutoSlug, setIsAutoSlug] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setSlug("");
    setIsAutoSlug(true);
    setError("");
    setDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onCloseAction();
  }, [onCloseAction, resetForm]);

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setError("");

      // Auto-generate slug from filename
      if (isAutoSlug) {
        const baseName = file.name.replace(/\.[^.]+$/, "");
        setSlug(normalizeSlug(baseName));
      }
    },
    [isAutoSlug],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleSlugChange = useCallback((value: string) => {
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s\-_.]/g, "")
        .replace(/\s+/g, "-"),
    );
    setIsAutoSlug(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a file.");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (slug) {
        formData.append("slug", slug);
      }

      const response = await fetch("/api/admin/assets", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload asset.");
      }

      onUploadedAction(data.asset);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, slug, onUploadedAction, handleClose]);

  if (!isOpen) return null;

  return (
    <Modal
      variant="centered"
      zIndex="z-60"
      panelClassName="border border-[#202632] bg-[#0a0d12] w-md"
      onBackdropClickAction={handleClose}
    >
      <header className="flex items-center justify-between border-b border-[#202632] px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
              Asset Manager
            </p>
            <h2 className="text-lg font-semibold text-white">Upload Asset</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-[#607080] hover:text-[#f5f7fa] transition-colors"
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
        </header>

        <div className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              "border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-[#7dd3fc] bg-[#0f1520]"
                : selectedFile
                  ? "border-[#294b36] bg-[#0b0f14]"
                  : "border-[#3a4758] bg-[#0b0f14] hover:border-[#5b9fd6]",
            ].join(" ")}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              className="hidden"
              accept="image/*,video/*,audio/*,.svg,.pdf,.webp"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-[#92d0a6]">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="font-medium">File selected</span>
                </div>
                <p className="text-sm text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-[#607080]">
                  {selectedFile.type || "Unknown type"} · {formatFileSize(selectedFile.size)}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetForm();
                  }}
                  className="mt-2 text-xs text-[#8fa1b3] hover:text-white transition-colors"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <svg
                  className="mx-auto text-[#506172]"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <p className="text-sm text-[#8fa1b3]">Drop a file here or click to browse</p>
                <p className="text-xs text-[#506172]">Images, videos, SVGs, and more</p>
              </div>
            )}
          </div>

          {/* Slug input */}
          <label className="block">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
              URL Slug
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#506172]">/assets/</span>
              <input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="my-image"
                className="flex-1 border border-[#202632] bg-[#0b0f14] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
              />
            </div>
            <p className="mt-2 text-xs text-[#506172]">
              The file will be accessible at{" "}
              <span className="text-[#7dd3fc]">
                /assets/{slug || "your-slug"}
                {selectedFile ? selectedFile.name.match(/\.[^.]+$/)?.[0] || "" : ""}
              </span>
            </p>
          </label>

          {error && (
            <div className="border border-[#5b3030] bg-[#1a1010] px-4 py-3">
              <p className="text-sm text-[#ff8f8f]">{error}</p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[#202632] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="border border-[#202632] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa1b3] transition hover:bg-[#151c25]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="border border-[#3a4758] bg-[#f5f7fa] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload Asset"}
          </button>
        </footer>
    </Modal>
  );
}
