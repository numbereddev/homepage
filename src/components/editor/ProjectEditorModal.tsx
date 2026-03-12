"use client";

import { useState, useCallback, useMemo } from "react";
import VisualEditor, { type EditorBlock, blocksToContent, contentToBlocks } from "./VisualEditor";
import ComponentDrawer from "./ComponentDrawer";
import AssetPicker, { type AssetData } from "./AssetPicker";
import PostPreview from "@/components/PostPreview";
import {
  SharedConfirmCloseModal,
  SharedEditorModalHeader,
  createAssetContent,
  createEditorBlock,
  formatEditorTimestampForDisplay,
  formatEditorTimestampForInput,
  normalizeEditorSlug,
  parseEditorInputToTimestamp,
  useSharedEditorModalKeyboardShortcuts,
} from "./sharedEditorModal";
import { Modal } from "./Modal";

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
          updates.slug = normalizeEditorSlug(value);
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
      const normalized = normalizeEditorSlug(value, { preserveEdgeDashes: true });
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
        slug: normalizeEditorSlug(localProject.slug),
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
        const newBlock = createEditorBlock("component", snippet);
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
    (asset: AssetData, insertType: Parameters<typeof createAssetContent>[1]) => {
      const { content, blockType } = createAssetContent(asset, insertType);
      commitEditorState((state) => {
        const newBlock = createEditorBlock(blockType, content);
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

  useSharedEditorModalKeyboardShortcuts({
    isOpen,
    showConfirmClose,
    showComponentDrawer,
    showAssetPicker,
    onSaveAction: handleSave,
    onUndoAction: handleUndo,
    onRedoAction: handleRedo,
    onRequestCloseAction: requestClose,
    onDismissConfirmCloseAction: () => setShowConfirmClose(false),
  });

  if (!isOpen) return null;

  const canDelete = Boolean(localProject.originalSlug);

  return (
    <>
      <Modal
        variant="full"
        zIndex="z-50"
        onBackdropClickAction={requestClose}
        panelClassName="overscroll-contain"
        onWheel={(e: React.WheelEvent) => e.stopPropagation()}
        onTouchMove={(e: React.TouchEvent) => e.stopPropagation()}
      >
        <SharedEditorModalHeader
          label={localProject.originalSlug ? "Editing Project" : "New Project"}
          title={localProject.title || "Untitled project"}
          canUndo={canUndo}
          canRedo={canRedo}
          activeTab={activeTab}
          onRequestCloseAction={requestClose}
          onUndoAction={handleUndo}
          onRedoAction={handleRedo}
          onChangeTabAction={setActiveTab}
          onOpenAssetsAction={() => {
            setAssetPickerMode("content");
            setShowAssetPicker(true);
          }}
          onOpenComponentsAction={() => setShowComponentDrawer(true)}
          onSaveAction={handleSave}
          isSaving={isSaving}
          deleteButton={
            canDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="col-span-3 border border-[#5b3030] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f0b0b0] transition hover:bg-[#1a1010] disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1 sm:tracking-[0.16em]"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            ) : undefined
          }
        />

        {error && (
          <div className="border-b border-[#5b3030] bg-[#1a1010] px-6 py-3">
            <p className="text-sm text-[#ff8f8f]">{error}</p>
          </div>
        )}

        {/* Body */}
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
                        value={formatEditorTimestampForInput(localProject.createdAt)}
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
                    <label className="flex items-start gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 cursor-pointer sm:items-center">
                      <input
                        type="checkbox"
                        checked={localProject.isOpenSource}
                        onChange={(e) => updateField("isOpenSource", e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 border border-[#3a4758] bg-transparent accent-[#7dd3fc] sm:mt-0"
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
                    <label className="flex items-start gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 cursor-pointer sm:items-center">
                      <input
                        type="checkbox"
                        checked={localProject.pinned}
                        onChange={(e) => updateField("pinned", e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 border border-[#3a4758] bg-transparent accent-[#7dd3fc] sm:mt-0"
                      />
                      <span className="text-sm text-[#dce3ea]">Pin to sidebar</span>
                    </label>

                    {/* Published toggle */}
                    <label className="flex items-start gap-3 border border-[#202632] bg-[#0b0f14] px-4 py-3 cursor-pointer sm:items-center">
                      <input
                        type="checkbox"
                        checked={localProject.published}
                        onChange={(e) => updateField("published", e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 border border-[#3a4758] bg-transparent accent-[#7dd3fc] sm:mt-0"
                      />
                      <span className="text-sm text-[#dce3ea]">Publish this project</span>
                    </label>
                  </div>

                  {/* Gallery manager */}
                  <div className="mb-6 border border-[#202632] bg-[#0b0f14] p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99]">
                        Gallery Media
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAssetPickerMode("gallery");
                          setShowAssetPicker(true);
                        }}
                        className="w-full shrink-0 border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5f7fa] transition hover:bg-[#151c25] sm:w-auto"
                      >
                        + Add from Assets
                      </button>
                    </div>
                    {localProject.gallery.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {localProject.gallery.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col gap-3 border border-[#202632] bg-[#0a0d12] px-3 py-3 sm:flex-row sm:items-center"
                          >
                            <span className="min-w-0 flex-1 break-all text-sm text-[#8fa1b3]">
                              {item.url}
                            </span>

                            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
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
                                    updateGalleryMediaKind(
                                      idx,
                                      e.target.checked ? "video" : "image",
                                    )
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
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
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
                        className="w-full min-w-0 flex-1 border border-[#202632] bg-[#0f141b] px-3 py-2 text-sm text-white outline-none placeholder:text-[#506172] focus:border-[#5b9fd6]"
                      />
                      <button
                        type="button"
                        onClick={addGalleryImage}
                        className="w-full shrink-0 border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f5f7fa] transition hover:bg-[#151c25] sm:w-auto"
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
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
                  <div className="h-full overflow-y-auto border border-[#202632] bg-[#080b10]">
                    <PostPreview content={localProject.content} className="h-full w-full" />
                  </div>
                </div>
              )}
            </main>

            {/* Sidebar */}
            <aside className="hidden min-h-0 xl:block border-l border-[#202632] bg-[#0f141b] overflow-y-auto">
              <div className="p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7d8a99] mb-4">
                  Project Preview Card
                </p>
                <div className="border border-[#202632] bg-[#0b0f14] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[#607080]">
                      {formatEditorTimestampForDisplay(localProject.createdAt)}
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
      </Modal>

      <SharedConfirmCloseModal
        isOpen={showConfirmClose}
        title={localProject.title}
        kindLabel="this project"
        isSaving={isSaving}
        onKeepEditingAction={() => setShowConfirmClose(false)}
        onSaveAndCloseAction={handleSave}
        onDiscardAction={() => {
          setHistoryPast([]);
          setHistoryFuture([]);
          onCloseAction();
        }}
        showShortcutHint={false}
      />

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
