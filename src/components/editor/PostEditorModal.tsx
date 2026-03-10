"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import VisualEditor, { type EditorBlock, blocksToContent, contentToBlocks } from "./VisualEditor";
import ComponentDrawer from "./ComponentDrawer";
import AssetPicker, { type AssetData, type InsertType } from "./AssetPicker";
import PostPreview from "@/components/PostPreview";

export type PostData = {
  originalSlug: string;
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number; // Unix timestamp in milliseconds
  published: boolean;
  tags: string;
  cover: string;
  readingTime: number;
  content: string;
};

type PostEditorModalProps = {
  isOpen: boolean;
  post: PostData;
  onCloseAction: () => void;
  onSaveAction: (post: PostData) => Promise<void>;
  onDeleteAction: (slug: string) => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  // Format as datetime-local input value: YYYY-MM-DDTHH:mm
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseInputToTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export default function PostEditorModal({
  isOpen,
  post,
  onCloseAction,
  onSaveAction,
  onDeleteAction,
  isSaving,
  isDeleting,
}: PostEditorModalProps) {
  const normalizePostContent = useCallback((value: string) => {
    return blocksToContent(contentToBlocks(value));
  }, []);

  const createEditorState = useCallback(
    (postValue: PostData) => {
      const normalizedContent = normalizePostContent(postValue.content);
      const nextPost = { ...postValue, content: normalizedContent };
      return {
        post: nextPost,
        blocks: contentToBlocks(normalizedContent),
        isSlugLocked: Boolean(postValue.originalSlug),
      };
    },
    [normalizePostContent],
  );

  type EditorHistoryState = {
    post: PostData;
    blocks: EditorBlock[];
    isSlugLocked: boolean;
  };

  const initialState = useMemo(() => createEditorState(post), [createEditorState, post]);

  // Note: This component should be keyed by post.originalSlug in the parent
  // to ensure clean re-mounting when switching between posts
  const [blocks, setBlocks] = useState<EditorBlock[]>(initialState.blocks);
  const [localPost, setLocalPost] = useState<PostData>(initialState.post);
  const [isSlugLocked, setIsSlugLocked] = useState(initialState.isSlugLocked);
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const [showComponentDrawer, setShowComponentDrawer] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [historyPast, setHistoryPast] = useState<EditorHistoryState[]>([]);
  const [historyFuture, setHistoryFuture] = useState<EditorHistoryState[]>([]);

  // Snapshot of the last saved state — used to derive isDirty.
  // Updated after each successful save so the dirty flag resets.
  // Both localPost and this snapshot are initialized with the same normalized
  // content, so isDirty starts as false until the user actually edits something.
  const [savedSnapshot, setSavedSnapshot] = useState<{ post: PostData; content: string }>(() => ({
    post: initialState.post,
    content: initialState.post.content,
  }));

  const currentEditorState = useCallback(
    (): EditorHistoryState => ({
      post: localPost,
      blocks,
      isSlugLocked,
    }),
    [localPost, blocks, isSlugLocked],
  );

  const applyEditorState = useCallback((state: EditorHistoryState) => {
    setLocalPost(state.post);
    setBlocks(state.blocks);
    setIsSlugLocked(state.isSlugLocked);
  }, []);

  const commitEditorState = useCallback(
    (updater: (state: EditorHistoryState) => EditorHistoryState) => {
      const currentState = currentEditorState();
      const nextState = updater(currentState);

      if (
        nextState.post === currentState.post &&
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
      localPost.title !== s.post.title ||
      localPost.excerpt !== s.post.excerpt ||
      localPost.slug !== s.post.slug ||
      localPost.tags !== s.post.tags ||
      localPost.published !== s.post.published ||
      localPost.cover !== s.post.cover ||
      localPost.createdAt !== s.post.createdAt ||
      localPost.readingTime !== s.post.readingTime ||
      localPost.content !== s.content
    );
  }, [localPost, savedSnapshot]);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      setHistoryPast([]);
      setHistoryFuture([]);
      onCloseAction();
    }
  }, [isDirty, onCloseAction]);

  const handlePreviewUpdate = useCallback(() => {
    // Preview is now handled by PostPreview component using the content directly
  }, []);

  const handleBlocksChange = useCallback(
    (newBlocks: EditorBlock[]) => {
      commitEditorState((state) => {
        const content = blocksToContent(newBlocks);
        return {
          ...state,
          blocks: newBlocks,
          post: { ...state.post, content },
        };
      });
    },
    [commitEditorState],
  );

  const updateField = useCallback(
    <K extends keyof PostData>(key: K, value: PostData[K]) => {
      commitEditorState((state) => ({
        ...state,
        post: { ...state.post, [key]: value },
      }));
    },
    [commitEditorState],
  );

  const updateTitle = useCallback(
    (value: string) => {
      commitEditorState((state) => {
        const updates: Partial<PostData> = { title: value };

        if (!state.isSlugLocked) {
          updates.slug = normalizeSlug(value);
        }

        return {
          ...state,
          post: { ...state.post, ...updates },
        };
      });
    },
    [commitEditorState],
  );

  const updateSlug = useCallback(
    (value: string) => {
      const normalized = normalizeSlug(value);
      commitEditorState((state) => ({
        ...state,
        post: { ...state.post, slug: normalized },
        isSlugLocked: true,
      }));
    },
    [commitEditorState],
  );

  const handleSave = useCallback(async () => {
    setShowConfirmClose(false);
    setError("");

    if (!localPost.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!localPost.excerpt.trim()) {
      setError("Excerpt is required.");
      return;
    }

    const content = blocksToContent(blocks);
    if (!content.trim()) {
      setError("Content is required.");
      return;
    }

    try {
      await onSaveAction({ ...localPost, content });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post.");
      return;
    }
    // After a successful save, reset dirty tracking
    const savedContent = blocksToContent(blocks);
    setSavedSnapshot({ post: { ...localPost, content: savedContent }, content: savedContent });
  }, [localPost, blocks, onSaveAction]);

  const handleDelete = useCallback(async () => {
    if (!localPost.originalSlug) {
      setHistoryPast([]);
      setHistoryFuture([]);
      onCloseAction();
      return;
    }

    const confirmed = window.confirm(
      `Delete "${localPost.title || localPost.originalSlug}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await onDeleteAction(localPost.originalSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post.");
    }
  }, [localPost, onDeleteAction, onCloseAction]);

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
          post: {
            ...state.post,
            content: blocksToContent(newBlocks),
          },
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

      // Determine block type based on insert type
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
          post: {
            ...state.post,
            content: blocksToContent(newBlocks),
          },
        };
      });
      setShowAssetPicker(false);
    },
    [commitEditorState],
  );

  // Keyboard shortcuts:
  //   Cmd+S / Ctrl+S              → save
  //   Cmd+Z / Ctrl+Z              → undo
  //   Cmd+Shift+Z / Ctrl+Shift+Z  → redo
  //   Cmd/Ctrl+Enter              → save & close when confirm modal is open
  //   Escape                      → request close / dismiss confirm modal
  //
  // Escape is handled in the capture phase so CodeMirror's stopPropagation
  // on the bubble phase cannot block it.
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

    // Escape is handled in the capture phase so CodeMirror's stopPropagation
    // on the bubble phase cannot block it. We use keydown here because capture
    // fires before any target handler regardless of phase.
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

  const canDelete = Boolean(localPost.originalSlug);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={requestClose} />

      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] lg:inset-8 xl:inset-12">
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
                {localPost.originalSlug ? "Editing Post" : "New Post"}
              </p>
              <h1 className="text-lg font-semibold text-white truncate max-w-md">
                {localPost.title || "Untitled draft"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center border border-[#202632]">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo}
                className="px-3 py-2 text-[#607080] transition-colors hover:text-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#607080]"
                title="Undo (⌘Z / Ctrl+Z)"
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
                className="border-l border-[#202632] px-3 py-2 text-[#607080] transition-colors hover:text-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#607080]"
                title="Redo (⌘⇧Z / Ctrl+Shift+Z)"
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
              onClick={() => setShowAssetPicker(true)}
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
              {isSaving ? "Saving..." : "Save Post"}
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
                        value={localPost.title}
                        onChange={(e) => updateTitle(e.target.value)}
                        placeholder="Article title"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Slug
                      </span>
                      <input
                        value={localPost.slug}
                        onChange={(e) => updateSlug(e.target.value)}
                        placeholder="article-slug"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Excerpt
                      </span>
                      <input
                        value={localPost.excerpt}
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
                        value={formatTimestampForInput(localPost.createdAt)}
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
                        value={localPost.cover}
                        onChange={(e) => updateField("cover", e.target.value)}
                        placeholder="/images/cover.png"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Reading Time (min)
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={localPost.readingTime}
                        onChange={(e) => updateField("readingTime", parseInt(e.target.value) || 1)}
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition focus:border-[#7dd3fc]"
                      />
                    </label>

                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Tags
                      </span>
                      <input
                        value={localPost.tags}
                        onChange={(e) => updateField("tags", e.target.value)}
                        placeholder="react, typescript, architecture"
                        className="w-full border border-[#202632] bg-[#0b0f14] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#506172] focus:border-[#7dd3fc]"
                      />
                    </label>

                    <label className="flex items-center gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 md:col-span-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localPost.published}
                        onChange={(e) => updateField("published", e.target.checked)}
                        className="h-4 w-4 border border-[#3a4758] bg-transparent accent-[#7dd3fc]"
                      />
                      <span className="text-sm text-[#dce3ea]">Publish this article</span>
                    </label>
                  </div>

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
                    <PostPreview content={localPost.content} className="w-full h-full" />
                  </div>
                </div>
              )}
            </main>

            <aside className="hidden xl:block border-l border-[#202632] bg-[#0f141b] overflow-y-auto">
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99] mb-4">
                  Post Preview Card
                </p>

                <div className="border border-[#202632] bg-[#0b0f14] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#607080]">
                      {formatTimestampForDisplay(localPost.createdAt)}
                    </span>
                    <span
                      className={[
                        "border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]",
                        localPost.published
                          ? "border-[#294b36] text-[#92d0a6]"
                          : "border-[#4d3c1a] text-[#d4b16a]",
                      ].join(" ")}
                    >
                      {localPost.published ? "Published" : "Draft"}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
                    {localPost.title || "Untitled"}
                  </h3>

                  <p className="text-xs text-[#8fa1b3] leading-relaxed mb-3">
                    {localPost.excerpt || "No excerpt provided."}
                  </p>

                  {localPost.tags && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {localPost.tags
                        .split(",")
                        .map((t) => t.trim())
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
                    /blog/{localPost.slug || "your-slug"}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#202632]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99] mb-4">
                  Quick Help
                </p>

                <div className="space-y-3 text-xs text-[#8fa1b3] leading-relaxed">
                  <p>
                    <strong className="text-white">Markdown blocks</strong> support standard syntax:
                    headings, lists, code, links, and emphasis.
                  </p>
                  <p>
                    <strong className="text-white">HTML blocks</strong> render raw HTML with full
                    CSS and JavaScript support.
                  </p>
                  <p>
                    <strong className="text-white">Components</strong> are pre-built HTML snippets
                    you can drag from the drawer.
                  </p>
                  <p>Drag blocks to reorder. Each block type is independent—mix them freely.</p>
                </div>
              </div>

              <div className="p-5 border-t border-[#202632]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99] mb-4">
                  Keyboard Shortcuts
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8fa1b3]">Save post</span>
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
                      ⌘⇧Z / Ctrl⇧Z
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

      {/* ── Confirm-close modal ─────────────────────────────────────────── */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowConfirmClose(false)}
          />
          <div className="relative z-10 w-full max-w-md border border-[#3a4758] bg-[#0d1219] shadow-2xl">
            {/* Header */}
            <div className="border-b border-[#202632] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#607080]">
                Unsaved changes
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-white">
                Discard changes and close?
              </h2>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <p className="text-sm leading-relaxed text-[#8fa1b3]">
                You have unsaved changes to{" "}
                <span className="font-medium text-white">{localPost.title || "this post"}</span>.
                They will be permanently lost if you close without saving.
              </p>
            </div>

            {/* Actions — stacked so labels never wrap */}
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
                title="Save and close (⌘↵)"
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

            {/* Hint */}
            <div className="border-t border-[#202632] px-5 py-3">
              <p className="text-[10px] text-[#404f60]">
                <kbd className="mr-0.5 rounded-none border border-[#2a3848] bg-[#0b0f14] px-1.5 py-0.5 font-mono text-[10px] text-[#607080]">
                  ⌘↵
                </kbd>
                {" / "}
                <kbd className="mx-0.5 rounded-none border border-[#2a3848] bg-[#0b0f14] px-1.5 py-0.5 font-mono text-[10px] text-[#607080]">
                  Ctrl↵
                </kbd>{" "}
                to save &amp; close ·{" "}
                <kbd className="ml-0.5 rounded-none border border-[#2a3848] bg-[#0b0f14] px-1.5 py-0.5 font-mono text-[10px] text-[#607080]">
                  Esc
                </kbd>{" "}
                to keep editing
              </p>
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
        onCloseAction={() => setShowAssetPicker(false)}
        onSelectAction={handleAssetSelect}
      />
    </>
  );
}

export function createBlankPost(): PostData {
  return {
    originalSlug: "",
    slug: "",
    title: "",
    excerpt: "",
    createdAt: Date.now(),
    published: true,
    tags: "",
    cover: "",
    readingTime: 1,
    content: "# New Post\n\nStart writing here.\n",
  };
}

export function postToEditorData(post: {
  slug: string;
  title: string;
  excerpt: string;
  createdAt: number;
  published: boolean;
  tags: string[];
  cover?: string;
  readingTime?: number;
  content: string;
}): PostData {
  return {
    originalSlug: post.slug,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    createdAt: post.createdAt,
    published: post.published,
    tags: post.tags.join(", "),
    cover: post.cover ?? "",
    readingTime: post.readingTime ?? 1,
    content: post.content,
  };
}
