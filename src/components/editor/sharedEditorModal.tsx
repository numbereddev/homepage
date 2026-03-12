"use client";

import { type ReactNode, useEffect } from "react";
import type { EditorBlock } from "./VisualEditor";
import type { AssetData, InsertType } from "./AssetPicker";
import { Modal } from "./Modal";

let stableBodyScrollLockCount = 0;
let stableBodyScrollLockY = 0;
let stablePreviousBodyOverflow = "";
let stablePreviousHtmlOverflow = "";

function applyBodyScrollLock() {
  if (typeof window === "undefined") return;

  stableBodyScrollLockCount += 1;
  if (stableBodyScrollLockCount > 1) return;

  stableBodyScrollLockY = window.scrollY;
  stablePreviousBodyOverflow = document.body.style.overflow;
  stablePreviousHtmlOverflow = document.documentElement.style.overflow;

  // Only set overflow:hidden — do NOT set position:fixed on the body.
  // Setting position:fixed on body (combined with the pre-existing
  // overflow-x:hidden rule) causes body to become the containing block for
  // fixed-positioned descendants in some browsers, which offsets every modal
  // by the current scroll amount and breaks centring when the page is scrolled.
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

function releaseBodyScrollLock() {
  if (typeof window === "undefined") return;
  if (stableBodyScrollLockCount === 0) return;

  stableBodyScrollLockCount -= 1;
  if (stableBodyScrollLockCount > 0) return;

  document.body.style.overflow = stablePreviousBodyOverflow;
  document.documentElement.style.overflow = stablePreviousHtmlOverflow;
  window.scrollTo(0, stableBodyScrollLockY);
}

export type EditorTab = "editor" | "preview";

export type SlugOptions = {
  preserveEdgeDashes?: boolean;
};

export function normalizeEditorSlug(value: string, options?: SlugOptions) {
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

export function formatEditorTimestampForDisplay(timestamp: number) {
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

export function formatEditorTimestampForInput(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseEditorInputToTimestamp(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function createEditorBlock(type: EditorBlock["type"], content: string): EditorBlock {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    content,
  };
}

export function createAssetContent(
  asset: AssetData,
  insertType: InsertType,
): { content: string; blockType: EditorBlock["type"] } {
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

  return {
    content,
    blockType: insertType === "markdown" ? "text" : "html",
  };
}

type ModalHeaderProps = {
  label: string;
  title: string;
  canUndo: boolean;
  canRedo: boolean;
  activeTab: EditorTab;
  onRequestCloseAction: () => void;
  onUndoAction: () => void;
  onRedoAction: () => void;
  onChangeTabAction: (tab: EditorTab) => void;
  onOpenAssetsAction: () => void;
  onOpenComponentsAction: () => void;
  onSaveAction: () => void;
  isSaving: boolean;
  saveLabel?: string;
  saveLoadingLabel?: string;
  deleteButton?: ReactNode;
};

function UndoRedoControls({
  canUndo,
  canRedo,
  onUndoAction,
  onRedoAction,
  mobile,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndoAction: () => void;
  onRedoAction: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className={[
        "items-center border border-[#202632]",
        mobile ? "flex sm:hidden" : "hidden sm:flex sm:col-span-1",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onUndoAction}
        disabled={!canUndo}
        className="flex-1 px-2.5 py-2 text-[#607080] transition-colors hover:text-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#607080] sm:flex-none sm:px-3"
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
        onClick={onRedoAction}
        disabled={!canRedo}
        className="flex-1 border-l border-[#202632] px-2.5 py-2 text-[#607080] transition-colors hover:text-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#607080] sm:flex-none sm:px-3"
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
  );
}

export function SharedEditorModalHeader({
  label,
  title,
  canUndo,
  canRedo,
  activeTab,
  onRequestCloseAction,
  onUndoAction,
  onRedoAction,
  onChangeTabAction,
  onOpenAssetsAction,
  onOpenComponentsAction,
  onSaveAction,
  isSaving,
  saveLabel = "Save",
  saveLoadingLabel = "Saving...",
  deleteButton,
}: ModalHeaderProps) {
  return (
    <header className="min-w-0 border-b border-[#202632] px-3 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start justify-between gap-3 sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onRequestCloseAction}
              className="p-2 text-[#607080] transition-colors hover:text-[#f5f7fa]"
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

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7d8a99]">
                {label}
              </p>
              <h1 className="max-w-48 truncate text-base font-semibold text-white sm:max-w-md sm:text-lg">
                {title}
              </h1>
            </div>
          </div>

          <UndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndoAction={onUndoAction}
            onRedoAction={onRedoAction}
            mobile
          />
        </div>

        <div className="grid grid-cols-[auto_auto_auto] gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <UndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndoAction={onUndoAction}
            onRedoAction={onRedoAction}
          />

          <div className="col-span-3 grid grid-cols-2 border border-[#202632] sm:col-span-1">
            <button
              type="button"
              onClick={() => onChangeTabAction("editor")}
              className={[
                "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition sm:px-4 sm:tracking-[0.16em]",
                activeTab === "editor"
                  ? "bg-[#f5f7fa] text-[#0a0d12]"
                  : "text-[#c7d0db] hover:bg-[#151c25]",
              ].join(" ")}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => onChangeTabAction("preview")}
              className={[
                "px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition sm:px-4 sm:tracking-[0.16em]",
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
            onClick={onOpenAssetsAction}
            className="border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#92d0a6] transition hover:bg-[#151c25] sm:px-4 sm:tracking-[0.16em]"
          >
            Assets
          </button>

          <button
            type="button"
            onClick={onOpenComponentsAction}
            className="border border-[#3a4758] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7dd3fc] transition hover:bg-[#151c25] sm:px-4 sm:tracking-[0.16em]"
          >
            Components
          </button>

          <button
            type="button"
            onClick={onSaveAction}
            disabled={isSaving}
            className="justify-self-start border border-[#3a4758] bg-[#f5f7fa] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0a0d12] transition hover:bg-[#dfe6ee] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:tracking-[0.18em]"
          >
            {isSaving ? saveLoadingLabel : saveLabel}
          </button>

          {deleteButton}
        </div>
      </div>
    </header>
  );
}

type LayoutProps = {
  error?: string;
  overlayClassName?: string;
  modalClassName?: string;
  modalEventHandlers?: {
    onWheel?: React.WheelEventHandler<HTMLDivElement>;
    onTouchMove?: React.TouchEventHandler<HTMLDivElement>;
  };
  children: ReactNode;
};

export function SharedEditorModalLayout({
  error,
  overlayClassName,
  modalClassName,
  modalEventHandlers,
  children,
}: LayoutProps) {
  return (
    <Modal
      variant="full"
      zIndex="z-50"
      overlayClassName={overlayClassName}
      panelClassName={modalClassName}
      {...modalEventHandlers}
    >
      {error && (
        <div className="border-b border-[#5b3030] bg-[#1a1010] px-6 py-3">
          <p className="text-sm text-[#ff8f8f]">{error}</p>
        </div>
      )}

      {children}
    </Modal>
  );
}

type ConfirmCloseModalProps = {
  isOpen: boolean;
  title: string;
  kindLabel: string;
  isSaving: boolean;
  onKeepEditingAction: () => void;
  onSaveAndCloseAction: () => void;
  onDiscardAction: () => void;
  showShortcutHint?: boolean;
};

export function SharedConfirmCloseModal({
  isOpen,
  title,
  kindLabel,
  isSaving,
  onKeepEditingAction,
  onSaveAndCloseAction,
  onDiscardAction,
  showShortcutHint = true,
}: ConfirmCloseModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      variant="centered"
      zIndex="z-60"
      panelClassName="max-w-md border border-[#3a4758] bg-[#0d1219] shadow-2xl"
      onBackdropClickAction={onKeepEditingAction}
    >
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
          <span className="font-medium text-white">{title || kindLabel}</span>. They will be
          permanently lost if you close without saving.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px border-t border-[#202632] bg-[#202632] sm:grid-cols-3">
        <button
          type="button"
          onClick={onKeepEditingAction}
          className="bg-[#0d1219] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa1b3] transition hover:bg-[#131c27] hover:text-white"
        >
          Keep editing
        </button>
        <button
          type="button"
          onClick={onSaveAndCloseAction}
          disabled={isSaving}
          className="bg-[#f5f7fa] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0a0d12] transition hover:bg-white disabled:opacity-50"
          title="Save and close (⌘↵)"
        >
          {isSaving ? "Saving…" : "Save & close"}
        </button>
        <button
          type="button"
          onClick={onDiscardAction}
          className="bg-[#0d1219] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c07070] transition hover:bg-[#1a1010] hover:text-[#ffaaaa]"
        >
          Discard
        </button>
      </div>

      {showShortcutHint && (
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
      )}
    </Modal>
  );
}

type KeyboardShortcutOptions = {
  isOpen: boolean;
  showConfirmClose: boolean;
  showComponentDrawer: boolean;
  showAssetPicker: boolean;
  lockBodyScroll?: boolean;
  onSaveAction: () => void;
  onUndoAction: () => void;
  onRedoAction: () => void;
  onRequestCloseAction: () => void;
  onDismissConfirmCloseAction: () => void;
};

export function useSharedEditorModalKeyboardShortcuts({
  isOpen,
  showConfirmClose,
  showComponentDrawer,
  showAssetPicker,
  lockBodyScroll = false,
  onSaveAction,
  onUndoAction,
  onRedoAction,
  onRequestCloseAction,
  onDismissConfirmCloseAction,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    if (!isOpen) return;

    if (lockBodyScroll) {
      applyBodyScrollLock();
    }

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
        onSaveAction();
      } else if (isMacRedo || isWindowsRedo) {
        e.preventDefault();
        onRedoAction();
      } else if (isUndo) {
        e.preventDefault();
        onUndoAction();
      } else if (isSaveAndClose) {
        e.preventDefault();
        onSaveAction();
      }
    };

    const handleEscapeCapture = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      e.stopPropagation();

      if (showConfirmClose) {
        onDismissConfirmCloseAction();
      } else if (!showComponentDrawer && !showAssetPicker) {
        onRequestCloseAction();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleEscapeCapture, { capture: true });

    return () => {
      if (lockBodyScroll) {
        releaseBodyScrollLock();
      }

      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleEscapeCapture, { capture: true });
    };
  }, [
    isOpen,
    lockBodyScroll,
    onDismissConfirmCloseAction,
    onRedoAction,
    onRequestCloseAction,
    onSaveAction,
    onUndoAction,
    showAssetPicker,
    showComponentDrawer,
    showConfirmClose,
  ]);
}
