"use client";

import { useState, useCallback, useMemo } from "react";
import VisualEditor, { type EditorBlock, blocksToContent, contentToBlocks } from "./VisualEditor";
import ComponentDrawer from "./ComponentDrawer";
import AssetPicker, { type AssetData, type InsertType } from "./AssetPicker";
import PostPreview from "@/components/PostPreview";
import {
  SharedConfirmCloseModal,
  SharedEditorModalHeader,
  formatEditorTimestampForDisplay,
  formatEditorTimestampForInput,
  normalizeEditorSlug,
  parseEditorInputToTimestamp,
  createEditorBlock,
  createAssetContent,
  useSharedEditorModalKeyboardShortcuts,
} from "./sharedEditorModal";

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
          updates.slug = normalizeEditorSlug(value);
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
      const normalized = normalizeEditorSlug(value, { preserveEdgeDashes: true });
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
      await onSaveAction({ ...localPost, slug: normalizeEditorSlug(localPost.slug), content });
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
        const newBlock = createEditorBlock("component", snippet);
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
      const { content, blockType } = createAssetContent(asset, insertType);

      commitEditorState((state) => {
        const newBlock = createEditorBlock(blockType, content);

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

  useSharedEditorModalKeyboardShortcuts({
    isOpen,
    showConfirmClose,
    showComponentDrawer,
    showAssetPicker,
    lockBodyScroll: true,
    onSaveAction: handleSave,
    onUndoAction: handleUndo,
    onRedoAction: handleRedo,
    onRequestCloseAction: requestClose,
    onDismissConfirmCloseAction: () => setShowConfirmClose(false),
  });

  if (!isOpen) return null;

  const canDelete = Boolean(localPost.originalSlug);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={requestClose} />

      <div className="fixed inset-2 z-50 flex min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] flex-col overflow-hidden border border-[#202632] bg-[#0a0d12] sm:inset-4 sm:max-h-[calc(100dvh-2rem)] lg:inset-8 lg:max-h-[calc(100dvh-4rem)] xl:inset-12 xl:max-h-[calc(100dvh-6rem)]">
        <SharedEditorModalHeader
          label={localPost.originalSlug ? "Editing Post" : "New Post"}
          title={localPost.title || "Untitled draft"}
          canUndo={canUndo}
          canRedo={canRedo}
          activeTab={activeTab}
          onRequestCloseAction={requestClose}
          onUndoAction={handleUndo}
          onRedoAction={handleRedo}
          onChangeTabAction={setActiveTab}
          onOpenAssetsAction={() => setShowAssetPicker(true)}
          onOpenComponentsAction={() => setShowComponentDrawer(true)}
          onSaveAction={handleSave}
          isSaving={isSaving}
          deleteButton={
            canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="col-span-2 border border-[#5b3030] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f0b0b0] transition hover:bg-[#1a1010] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1 sm:tracking-[0.16em]"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            ) : null
          }
        />

        {error && (
          <div className="border-b border-[#5b3030] bg-[#1a1010] px-6 py-3">
            <p className="text-sm text-[#ff8f8f]">{error}</p>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 grid-cols-1 xl:grid-cols-[1fr_380px]">
            <main className="h-full min-h-0 overflow-x-hidden overflow-y-auto">
              {activeTab === "editor" ? (
                <div className="p-4 sm:p-6">
                  <div className="mb-6 grid gap-4 md:grid-cols-2">
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
                        value={formatEditorTimestampForInput(localPost.createdAt)}
                        onChange={(e) =>
                          updateField("createdAt", parseEditorInputToTimestamp(e.target.value))
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
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Content Blocks
                      </span>
                      <span className="text-[10px] text-[#506172]">
                        Mix Markdown and HTML freely
                      </span>
                    </div>

                    <div className="pl-0 sm:pl-10">
                      <VisualEditor
                        blocks={blocks}
                        onChange={handleBlocksChange}
                        onPreviewUpdate={handlePreviewUpdate}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full p-4 sm:p-6">
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
                      {formatEditorTimestampForDisplay(localPost.createdAt)}
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

      <SharedConfirmCloseModal
        isOpen={showConfirmClose}
        title={localPost.title}
        kindLabel="this post"
        isSaving={isSaving}
        onKeepEditingAction={() => setShowConfirmClose(false)}
        onSaveAndCloseAction={handleSave}
        onDiscardAction={() => {
          setHistoryPast([]);
          setHistoryFuture([]);
          onCloseAction();
        }}
      />

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
