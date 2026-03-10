"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import VisualEditor, { type EditorBlock, blocksToContent, contentToBlocks } from "./VisualEditor";
import ComponentDrawer from "./ComponentDrawer";
import AssetPicker, { type AssetData, type InsertType } from "./AssetPicker";
import PostPreview from "@/components/PostPreview";

type GalleryMedia = {
  url: string;
  kind: "image" | "video";
};

export type ProjectData = {
  originalSlug: string;
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number;
  published: boolean;
  pinned: boolean;
  tags: string;
  cover: string;
  gallery: GalleryMedia[];
  isOpenSource: boolean;
  sourceUrl: string;
  content: string;
};

type ProjectEditorModalProps = {
  isOpen: boolean;
  project: ProjectData;
  onCloseAction: () => void;
  onSaveAction: (project: ProjectData) => Promise<void>;
  onDeleteAction: (slug: string) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
};

type AssetPickerMode = "content" | "gallery";

function normalizeSlug(value: string, options?: { preserveEdgeDashes?: boolean }) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (options?.preserveEdgeDashes) {
    return normalized;
  }

  return normalized.replace(/^-|-$/g, "");
}

function formatTimestampForDisplay(timestamp: number) {
  try {
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString();
  }
}

function formatTimestampForInput(timestamp: number) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseInputToTimestamp(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function getGalleryMediaKindFromAsset(asset: AssetData): GalleryMedia["kind"] {
  return asset.mimeType.startsWith("video/") ? "video" : "image";
}

export default function ProjectEditorModal({
  isOpen,
  project,
  onCloseAction,
  onSaveAction,
  onDeleteAction,
  isSaving,
  isDeleting,
}: ProjectEditorModalProps) {
  const normalizeProjectContent = useCallback((value: string) => {
    return blocksToContent(contentToBlocks(value));
  }, []);

  const createEditorState = useCallback(
    (proj: ProjectData) => {
      const normalizedContent = normalizeProjectContent(proj.content);
      const nextProj = { ...proj, content: normalizedContent };
      return {
        project: nextProj,
        blocks: contentToBlocks(normalizedContent),
        isSlugLocked: Boolean(proj.originalSlug),
      };
    },
    [normalizeProjectContent],
  );

  type EditorHistoryState = {
    project: ProjectData;
    blocks: EditorBlock[];
    isSlugLocked: boolean;
  };

  const initialState = useMemo(() => createEditorState(project), [createEditorState, project]);

  const [blocks, setBlocks] = useState<EditorBlock[]>(initialState.blocks);
  const [localProject, setLocalProject] = useState<ProjectData>(initialState.project);
  const [isSlugLocked, setIsSlugLocked] = useState(initialState.isSlugLocked);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [showComponentDrawer, setShowComponentDrawer] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [assetPickerMode, setAssetPickerMode] = useState<AssetPickerMode>("content");
  const [error, setError] = useState("");
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [historyPast, setHistoryPast] = useState<EditorHistoryState[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorHistoryState[]>([]);
  const [galleryInput, setGalleryInput] = useState("");

  const [savedSnapshot, setSavedSnapshot] = useState<{ project: ProjectData; content: string }>(
    () => ({
      project: initialState.project,
      content: initialState.project.content,
    }),
  );

  const currentEditorState = useCallback(
    (): EditorHistoryState => ({
      project: localProject,
      blocks,
      isSlugLocked,
    }),
    [localProject, blocks, isSlugLocked],
  );

  const applyEditorState = useCallback((state: EditorHistoryState) => {
    setLocalProject(state.project);
    setBlocks(state.blocks);
    setIsSlugLocked(state.isSlugLocked);
  }, []);

  const commitEditorState = useCallback(
    (updater: (state: EditorHistoryState) => EditorHistoryState) => {
      const currentState = currentEditorState();
      const nextState = updater(currentState);

      if (
        nextState.project === currentState.project &&
        nextState.blocks === currentState.blocks &&
        nextState.isSlugLocked === currentState.isSlugLocked
      ) {
        return;
      }

      setHistoryPast((prev) => [...prev, currentState]);
      setHistoryFuture([]);
      applyEditorState(nextState);
    },
    [applyEditorState, currentEditorState],
  );

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const currentState = currentEditorState();
    const previousState = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [currentState, ...prev]);
    applyEditorState(previousState);
  }, [applyEditorState, canUndo, currentEditorState, historyPast]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const currentState = currentEditorState();
    const [nextState, ...remainingFuture] = historyFuture;
    setHistoryFuture(remainingFuture);
    setHistoryPast((prev) => [...prev, currentState]);
    applyEditorState(nextState);
  }, [applyEditorState, canRedo, currentEditorState, historyFuture]);

  const isDirty = useMemo(() => {
    const s = savedSnapshot;
    return (
      localProject.title !== s.project.title ||
      localProject.excerpt !== s.project.excerpt ||
      localProject.slug !== s.project.slug ||
      localProject.tags !== s.project.tags ||
      localProject.published !== s.project.published ||
      localProject.pinned !== s.project.pinned ||
      localProject.cover !== s.project.cover ||
      localProject.createdAt !== s.project.createdAt ||
      localProject.isOpenSource !== s.project.isOpenSource ||
      localProject.sourceUrl !== s.project.sourceUrl ||
      JSON.stringify(localProject.gallery) !== JSON.stringify(s.project.gallery) ||
      localProject.content !== s.content
    );
  }, [localProject, savedSnapshot]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      setHistoryPast([]);
      setHistoryFuture([]);
      onCloseAction();
    }
  }, [isDirty, onCloseAction]);

  const handlePreviewUpdate = useCallback(() => {}, []);

  const handleBlocksChange = useCallback(
    (newBlocks: EditorBlock[]) => {
      commitEditorState((state) => {
        const content = blocksToContent(newBlocks);
        return {
          ...state,
          blocks: newBlocks,
          project: { ...state.project, content },
        };
      });
    },
    [commitEditorState],
  );

  const updateField = useCallback(
    <K extends keyof ProjectData>(key: K, value: ProjectData[K]) => {
      commitEditorState((state) => ({
        ...state,
        project: { ...state.project, [key]: value },
      }));
    },
    [commitEditorState],
  );

  const updateTitle = useCallback(
    (value: string) => {
      commitEditorState((state) => {
        const updates: Partial<ProjectData> = { title: value };
        if (!state.isSlugLocked) {
          updates.slug = normalizeSlug(value);
        }
        return {
          ...state,
          project: { ...state.project, ...updates },
        };
      });
    },
    [commitEditorState],
  );

  const updateSlug = useCallback(
    (value: string) => {
      const normalized = normalizeSlug(value, { preserveEdgeDashes: true });
      commitEditorState((state) => ({
        ...state,
        project: { ...state.project, slug: normalized },
        isSlugLocked: true,
      }));
    },
    [commitEditorState],
  );

  const addGalleryImage = useCallback(() => {
    const url = galleryInput.trim();
    if (!url) return;
    commitEditorState((state) => ({
      ...state,
      project: {
        ...state.project,
        gallery: [...state.project.gallery, { url, kind: "image" }],
      },
    }));
    setGalleryInput("");
  }, [galleryInput, commitEditorState]);

  const addGalleryAsset = useCallback(
    (asset: AssetData) => {
      commitEditorState((state) => ({
        ...state,
        project: {
          ...state.project,
          gallery: [
            ...state.project.gallery,
            { url: asset.url, kind: getGalleryMediaKindFromAsset(asset) },
          ],
        },
      }));
      setShowAssetPicker(false);
    },
    [commitEditorState],
  );

  const updateGalleryMediaKind = useCallback(
    (index: number, kind: GalleryMedia["kind"]) => {
      commitEditorState((state) => ({
        ...state,
        project: {
          ...state.project,
          gallery: state.project.gallery.map((item, i) => (i === index ? { ...item, kind } : item)),
        },
      }));
    },
    [commitEditorState],
  );

  const moveGalleryMedia = useCallback(
    (index: number, direction: "left" | "right") => {
      commitEditorState((state) => {
        const targetIndex = direction === "left" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= state.project.gallery.length) {
          return state;
        }

        const gallery = [...state.project.gallery];
        [gallery[index], gallery[targetIndex]] = [gallery[targetIndex], gallery[index]];

        return {
          ...state,
          project: {
            ...state.project,
            gallery,
          },
        };
      });
    },
    [commitEditorState],
  );

  const removeGalleryImage = useCallback(
    (index: number) => {
      commitEditorState((state) => ({
        ...state,
        project: {
          ...state.project,
          gallery: state.project.gallery.filter((_, i) => i !== index),
        },
      }));
    },
    [commitEditorState],
  );

  const handleSave = useCallback(async () => {
    setShowConfirmClose(false);
    setError("");

    if (!localProject.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!localProject.excerpt.trim()) {
      setError("Excerpt is required.");
      return;
    }
    const content = blocksToContent(blocks);
    if (!content.trim()) {
      setError("Content is required.");
      return;
    }

    try {
      await onSaveAction({
        ...localProject,
        slug: normalizeSlug(localProject.slug),
        content,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project.");
      return;
    }
    const savedContent = blocksToContent(blocks);
    setSavedSnapshot({
      project: { ...localProject, content: savedContent },
      content: savedContent,
    });
  }, [localProject, blocks, onSaveAction]);

  const handleDelete = useCallback(async () => {
    if (!localProject.originalSlug) {
      setHistoryPast([]);
      setHistoryFuture([]);
      onCloseAction();
      return;
    }
    const confirmed = window.confirm(
      `Delete "${localProject.title || localProject.originalSlug}"? This cannot be undone.`,
    );
    if (!confirmed) return;
    try {
      await onDeleteAction(localProject.originalSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project.");
    }
  }, [localProject, onDeleteAction, onCloseAction]);

  const insertComponent = useCallback(
    (snippet: string) => {
      commitEditorState((state) => {
        const newBlock: EditorBlock = {
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: "component",
          content: snippet,
        };
        const newBlocks = [...state.blocks, newBlock];
        return {
          ...state,
          blocks: newBlocks,
          project: { ...state.project, content: blocksToContent(newBlocks) },
        };
      });
      setShowComponentDrawer(false);
    },
    [commitEditorState],
  );

  const handleAssetSelect = useCallback(
    (asset: AssetData, insertType: InsertType) => {
      let content = "";
      switch (insertType) {
        case "markdown":
          content = `![${asset.slug}](${asset.url})`;
          break;
        case "html-img":
          content = `<img src="${asset.url}" alt="${asset.slug}" />`;
          break;
        case "html-video":
          content = `<video src="${asset.url}" controls></video>`;
          break;
        case "html-audio":
          content = `<audio src="${asset.url}" controls></audio>`;
          break;
        case "url-only":
          content = asset.url;
          break;
      }
      const blockType: EditorBlock["type"] = insertType === "markdown" ? "text" : "html";
      commitEditorState((state) => {
        const newBlock: EditorBlock = {
          id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: blockType,
          content,
        };
        const newBlocks = [...state.blocks, newBlock];
        return {
          ...state,
          blocks: newBlocks,
          project: { ...state.project, content: blocksToContent(newBlocks) },
        };
      });
      setShowAssetPicker(false);
      setAssetPickerMode("content");
    },
    [commitEditorState],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isMacRedo = e.metaKey && e.shiftKey && key === "z" && !e.ctrlKey;
      const isWindowsRedo = e.ctrlKey && e.shiftKey && key === "z" && !e.metaKey;
      const isUndo =
        ((e.metaKey && !e.ctrlKey) || (e.ctrlKey && !e.metaKey)) && !e.shiftKey && key === "z";
      const isSave = ((e.metaKey && !e.ctrlKey) || (e.ctrlKey && !e.metaKey)) && key === "s";
      const isSaveAndClose =
        ((e.metaKey && !e.ctrlKey) || (e.ctrlKey && !e.metaKey)) &&
        !e.shiftKey &&
        e.key === "Enter" &&
        showConfirmClose;

      if (isSave) {
        e.preventDefault();
        handleSave();
      } else if (isMacRedo || isWindowsRedo) {
        e.preventDefault();
        handleRedo();
      } else if (isUndo) {
        e.preventDefault();
        handleUndo();
      } else if (isSaveAndClose) {
        e.preventDefault();
        handleSave();
      }
    };

    const handleEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (showConfirmClose) {
        setShowConfirmClose(false);
      } else if (!showComponentDrawer && !showAssetPicker) {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleEscapeCapture, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleEscapeCapture, { capture: true });
    };
  }, [
    isOpen,
    handleRedo,
    handleSave,
    handleUndo,
    requestClose,
    showComponentDrawer,
    showAssetPicker,
    showConfirmClose,
  ]);

  if (!isOpen) return null;

  const canDelete = Boolean(localProject.originalSlug);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={requestClose} />

      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] lg:inset-8 xl:inset-12">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#202632] px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={requestClose}
              className="p-2 text-[#607080] hover:text-[#f5f7fa] transition-colors"
              title="Close editor"
              aria-label="Close editor"
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
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                {localProject.originalSlug ? "Editing Project" : "New Project"}
              </p>
              <h1 className="text-lg font-semibold text-white truncate max-w-md">
                {localProject.title || "Untitled project"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center border border-[#202632]">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="px-3 py-2 text-[#607080] transition-colors hover:text-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
                title="Undo"
                aria-label="Undo"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 14 4 9l5-5" />
                  <path d="M4 9h10a6 6 0 0 1 0 12h-1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo}
                className="border-l border-[#202632] px-3 py-2 text-[#607080] transition-colors hover:text-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
                title="Redo"
                aria-label="Redo"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 14 5-5-5-5" />
                  <path d="M20 9H10a6 6 0 0 0 0 12h1" />
                </svg>
              </button>
            </div>

            <div className="flex border border-[#202632]">
              <button
                type="button"
                onClick={() => setActiveTab("editor")}
                className={[
                  "px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  activeTab === "editor"
                    ? "bg-[#f5f7fa] text-[#0a0d12]"
                    : "text-[#c7d0db] hover:bg-[#151c25]",
                ].join(" ")}
              >
                Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={[
                  "px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition",
                  activeTab === "preview"
                    ? "bg-[#f5f7fa] text-[#0a0d12]"
                    : "text-[#c7d0db] hover:bg-[#151c25]",
                ].join(" ")}
              >
                Preview
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAssetPickerMode("content");
                setShowAssetPicker(true);
              }}
              className="border border-[#3a4758] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#92d0a6] transition hover:bg-[#151c25]"
            >
              Assets
            </button>
            <button
              type="button"
              onClick={() => setShowComponentDrawer(true)}
              className="border border-[#3a4758] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7dd3fc] transition hover:bg-[#151c25]"
            >
              Components
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="border border-[#3a4758] bg-[#f5f7fa] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Project"}
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="border border-[#5b3030] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f0b0b0] transition hover:bg-[#1a1010] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="border-b border-[#5b3030] bg-[#1a1010] px-6 py-3">
            <p className="text-sm text-[#ff8f8f]">{error}</p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-1 xl:grid-cols-[1fr_380px]">
            <main className="h-full overflow-y-auto">
              {activeTab === "editor" ? (
                <div className="p-6">
                  <div className="grid gap-4 mb-6 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Title
                      </span>
                      <input
                        value={localProject.title}
                        onChange={(e) => updateTitle(e.target.value)}
                        placeholder="Project title"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Slug
                      </span>
                      <input
                        value={localProject.slug}
                        onChange={(e) => updateSlug(e.target.value)}
                        placeholder="project-slug"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Excerpt
                      </span>
                      <input
                        value={localProject.excerpt}
                        onChange={(e) => updateField("excerpt", e.target.value)}
                        placeholder="Brief summary for cards and SEO"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Created At
                      </span>
                      <input
                        type="datetime-local"
                        value={formatTimestampForInput(localProject.createdAt)}
                        onChange={(e) =>
                          updateField("createdAt", parseInputToTimestamp(e.target.value))
                        }
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition focus:border-[#7dd3fc]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Cover URL
                      </span>
                      <input
                        value={localProject.cover}
                        onChange={(e) => updateField("cover", e.target.value)}
                        placeholder="/images/cover.png"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Tags
                      </span>
                      <input
                        value={localProject.tags}
                        onChange={(e) => updateField("tags", e.target.value)}
                        placeholder="react, typescript, architecture"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>

                    {/* Open Source toggle */}
                    <label className="flex items-center gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localProject.isOpenSource}
                        onChange={(e) => updateField("isOpenSource", e.target.checked)}
                        className="h-4 w-4 border border-[#3a4758] bg-transparent accent-[#7dd3fc]"
                      />
                      <span className="text-sm text-[#dce3ea]">Open Source</span>
                    </label>

                    {/* Source URL (visible when open source) */}
                    {localProject.isOpenSource && (
                      <label className="block">
                        <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                          Source Code URL
                        </span>
                        <input
                          value={localProject.sourceUrl}
                          onChange={(e) => updateField("sourceUrl", e.target.value)}
                          placeholder="https://github.com/..."
                          className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                        />
                      </label>
                    )}

                    {/* Pinned toggle */}
                    <label className="flex items-center gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localProject.pinned}
                        onChange={(e) => updateField("pinned", e.target.checked)}
                        className="h-4 w-4 border border-[#3a4758] bg-transparent accent-[#7dd3fc]"
                      />
                      <span className="text-sm text-[#dce3ea]">Pin to sidebar</span>
                    </label>

                    {/* Published toggle */}
                    <label className="flex items-center gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localProject.published}
                        onChange={(e) => updateField("published", e.target.checked)}
                        className="h-4 w-4 border border-[#3a4758] bg-transparent accent-[#7dd3fc]"
                      />
                      <span className="text-sm text-[#dce3ea]">Publish this project</span>
                    </label>
                  </div>

                  {/* Gallery manager */}
                  <div className="mb-6 border border-[#202632] bg-[#0b0f14] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Gallery Media
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAssetPickerMode("gallery");
                          setShowAssetPicker(true);
                        }}
                        className="shrink-0 border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5f7fa] transition hover:bg-[#151c25]"
                      >
                        + Add from Assets
                      </button>
                    </div>
                    {localProject.gallery.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {localProject.gallery.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 border border-[#202632] bg-[#0a0d12] px-3 py-2"
                          >
                            <span className="flex-1 min-w-0 text-sm text-[#8fa1b3] truncate">
                              {item.url}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveGalleryMedia(idx, "left")}
                                disabled={idx === 0}
                                className="shrink-0 border border-[#202632] px-2 py-1 text-[10px] text-[#8fa1b3] transition hover:bg-[#151c25] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Move gallery media left"
                                title="Move left"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={() => moveGalleryMedia(idx, "right")}
                                disabled={idx === localProject.gallery.length - 1}
                                className="shrink-0 border border-[#202632] px-2 py-1 text-[10px] text-[#8fa1b3] transition hover:bg-[#151c25] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Move gallery media right"
                                title="Move right"
                              >
                                →
                              </button>
                            </div>

                            <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#8fa1b3]">
                              <input
                                type="checkbox"
                                checked={item.kind === "video"}
                                onChange={(e) =>
                                  updateGalleryMediaKind(idx, e.target.checked ? "video" : "image")
                                }
                                className="h-4 w-4 border border-[#3a4758] bg-transparent accent-[#7dd3fc]"
                              />
                              Video
                            </label>

                            <button
                              type="button"
                              onClick={() => removeGalleryImage(idx)}
                              className="shrink-0 border border-[#202632] px-2 py-1 text-[10px] text-[#8fa1b3] transition hover:border-[#7f3030] hover:text-[#fca5a5]"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        value={galleryInput}
                        onChange={(e) => setGalleryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addGalleryImage();
                          }
                        }}
                        placeholder="Media URL (e.g. /assets/screenshot.png or /assets/demo.mp4)"
                        className="flex-1 border border-[#202632] bg-[#0f141b] px-3 py-2 text-sm text-white outline-none placeholder:text-[#506172] focus:border-[#5b9fd6]"
                      />
                      <button
                        type="button"
                        onClick={addGalleryImage}
                        className="shrink-0 border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5f7fa] transition hover:bg-[#151c25]"
                      >
                        + Add URL
                      </button>
                    </div>
                    <p className="mt-3 text-[10px] text-[#607080]">
                      “Add from Assets” now adds directly to the gallery and uses the asset MIME
                      type to detect videos automatically. You can still override it with the
                      checkbox.
                    </p>
                  </div>

                  {/* Content blocks */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Content Blocks
                      </span>
                      <span className="text-[10px] text-[#506172]">
                        Mix Markdown and HTML freely
                      </span>
                    </div>
                    <div className="pl-10">
                      <VisualEditor
                        blocks={blocks}
                        onChange={handleBlocksChange}
                        onPreviewUpdate={handlePreviewUpdate}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full p-6">
                  <div className="h-full border border-[#202632] bg-[#080b10]">
                    <PostPreview content={localProject.content} className="w-full h-full" />
                  </div>
                </div>
              )}
            </main>

            {/* Sidebar */}
            <aside className="hidden xl:block border-l border-[#202632] bg-[#0f141b] overflow-y-auto">
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99] mb-4">
                  Project Preview Card
                </p>
                <div className="border border-[#202632] bg-[#0b0f14] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#607080]">
                      {formatTimestampForDisplay(localProject.createdAt)}
                    </span>
                    <div className="flex gap-1">
                      {localProject.pinned && (
                        <span className="border border-[#3a4758] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7dd3fc]">
                          Featured
                        </span>
                      )}
                      <span
                        className={[
                          "border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
                          localProject.published
                            ? "border-[#294b36] text-[#92d0a6]"
                            : "border-[#4d3c1a] text-[#d4b16a]",
                        ].join(" ")}
                      >
                        {localProject.published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
                    {localProject.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-[#8fa1b3] leading-relaxed mb-3">
                    {localProject.excerpt || "No excerpt provided."}
                  </p>
                  {localProject.isOpenSource && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="border border-[#294b36] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#92d0a6]">
                        Open Source
                      </span>
                      {localProject.sourceUrl && (
                        <span className="text-[10px] text-[#506172] truncate">
                          {localProject.sourceUrl}
                        </span>
                      )}
                    </div>
                  )}
                  {localProject.gallery.length > 0 && (
                    <p className="text-[10px] text-[#607080] mb-3">
                      {localProject.gallery.length} gallery image
                      {localProject.gallery.length !== 1 ? "s" : ""}
                    </p>
                  )}
                  {localProject.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {localProject.tags
                        .split(",")
                        .map((tg) => tg.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="border border-[#202632] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[#7d8a99]"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}
                  <div className="pt-3 border-t border-[#202632] text-[10px] uppercase tracking-[0.14em] text-[#7dd3fc]">
                    /projects/{localProject.slug || "your-slug"}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#202632]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99] mb-4">
                  Keyboard Shortcuts
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8fa1b3]">Save project</span>
                    <kbd className="px-1.5 py-0.5 border border-[#202632] bg-[#0b0f14] text-[#607080] font-mono text-[10px]">
                      ⌘S
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8fa1b3]">Undo</span>
                    <kbd className="px-1.5 py-0.5 border border-[#202632] bg-[#0b0f14] text-[#607080] font-mono text-[10px]">
                      ⌘Z
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8fa1b3]">Redo</span>
                    <kbd className="px-1.5 py-0.5 border border-[#202632] bg-[#0b0f14] text-[#607080] font-mono text-[10px]">
                      ⌘⇧Z
                    </kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8fa1b3]">Close modal</span>
                    <kbd className="px-1.5 py-0.5 border border-[#202632] bg-[#0b0f14] text-[#607080] font-mono text-[10px]">
                      Esc
                    </kbd>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Confirm-close modal */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowConfirmClose(false)}
          />
          <div className="relative z-10 w-full max-w-md border border-[#3a4758] bg-[#0d1219] shadow-2xl">
            <div className="border-b border-[#202632] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#607080]">
                Unsaved changes
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-white">
                Discard changes and close?
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-[#8fa1b3]">
                You have unsaved changes to{" "}
                <span className="font-medium text-white">
                  {localProject.title || "this project"}
                </span>
                . They will be permanently lost if you close without saving.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-px border-t border-[#202632] bg-[#202632]">
              <button
                type="button"
                onClick={() => setShowConfirmClose(false)}
                className="bg-[#0d1219] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa1b3] transition hover:bg-[#131c27] hover:text-white"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#f5f7fa] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0a0d12] transition hover:bg-white disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save & close"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistoryPast([]);
                  setHistoryFuture([]);
                  onCloseAction();
                }}
                className="bg-[#0d1219] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c07070] transition hover:bg-[#1a1010] hover:text-[#ffaaaa]"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <ComponentDrawer
        isOpen={showComponentDrawer}
        onClose={() => setShowComponentDrawer(false)}
        onInsert={insertComponent}
      />
      <AssetPicker
        isOpen={showAssetPicker}
        onCloseAction={() => {
          setShowAssetPicker(false);
          setAssetPickerMode("content");
        }}
        onSelectAction={(asset, insertType) => {
          if (assetPickerMode === "gallery") {
            addGalleryAsset(asset);
            return;
          }

          handleAssetSelect(asset, insertType);
        }}
      />
    </>
  );
}

export function createBlankProject(): ProjectData {
  return {
    originalSlug: "",
    slug: "",
    title: "",
    excerpt: "",
    createdAt: Date.now(),
    published: true,
    pinned: false,
    tags: "",
    cover: "",
    gallery: [],
    isOpenSource: false,
    sourceUrl: "",
    content: "# New Project\n\nDescribe your project here.\n",
  };
}

export function projectToEditorData(raw: {
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number;
  published: boolean;
  pinned: boolean;
  tags: string[];
  cover: string;
  gallery: GalleryMedia[];
  isOpenSource: boolean;
  sourceUrl: string;
  content: string;
}): ProjectData {
  return {
    originalSlug: raw.slug,
    slug: raw.slug,
    title: raw.title,
    excerpt: raw.excerpt,
    createdAt: raw.createdAt,
    published: raw.published,
    pinned: raw.pinned,
    tags: raw.tags.join(", "),
    cover: raw.cover,
    gallery: raw.gallery,
    isOpenSource: raw.isOpenSource,
    sourceUrl: raw.sourceUrl,
    content: raw.content,
  };
}
