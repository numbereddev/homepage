"use client";

import { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  dropCursor,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
  foldGutter,
} from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";

// ---------------------------------------------------------------------------
// Markdown-specific theme overrides — slightly softer than the HTML editor
// ---------------------------------------------------------------------------
const markdownTheme = EditorView.theme({
  // Headings: brighter white
  ".cm-line .tok-heading": { color: "#f0f6fc", fontWeight: "600" },
  // Strong / bold
  ".cm-line .tok-strong": { color: "#e2e8f0", fontWeight: "700" },
  // Emphasis / italic
  ".cm-line .tok-emphasis": { color: "#d1dce8", fontStyle: "italic" },
  // Inline code
  ".cm-line .tok-monospace": { color: "#d8f3ff" },
  // Links
  ".cm-line .tok-link": { color: "#7dd3fc", textDecoration: "underline" },
  ".cm-line .tok-url": { color: "#5b9fd6" },
  // Block quote marker / HR
  ".cm-line .tok-meta": { color: "#4a7a9b" },
  // List markers
  ".cm-line .tok-list": { color: "#5b9fd6" },
  // Fenced code language tag
  ".cm-line .tok-labelName": { color: "#7dd3fc" },
  // Active line — softer tint than the HTML editor
  ".cm-activeLine": { background: "rgba(91, 159, 214, 0.04)" },
  ".cm-activeLineGutter": {
    background: "rgba(91, 159, 214, 0.06)",
    color: "#7a95ad",
  },
});

// ---------------------------------------------------------------------------
// Token drag-and-drop data transfer key — imported by TokenPalette too
// ---------------------------------------------------------------------------
export const TOKEN_DRAG_TYPE = "application/x-site-token";

// ---------------------------------------------------------------------------
// Custom theme that matches the admin panel aesthetics
// ---------------------------------------------------------------------------
const adminTheme = EditorView.theme({
  "&": {
    background: "transparent !important",
    color: "#c9d1d9",
    fontFamily:
      'var(--font-geist-mono), ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    fontSize: "13px",
    height: "100%",
  },
  ".cm-scroller": {
    overflow: "auto",
    lineHeight: "1.75",
    fontFamily: "inherit",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "#5b9fd6",
  },
  ".cm-focused": {
    outline: "none !important",
  },
  ".cm-line": {
    padding: "0 16px",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#5b9fd6",
  },
  ".cm-gutters": {
    background: "#080b10",
    borderRight: "1px solid #202938",
    color: "#4a5568",
    minWidth: "40px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 4px",
    fontSize: "11px",
  },
  ".cm-activeLine": {
    background: "rgba(91, 159, 214, 0.06)",
  },
  ".cm-activeLineGutter": {
    background: "rgba(91, 159, 214, 0.08)",
    color: "#7a95ad",
  },
  ".cm-selectionBackground, ::selection": {
    background: "rgba(91, 159, 214, 0.25) !important",
  },
  ".cm-matchingBracket": {
    background: "rgba(91, 159, 214, 0.2)",
    outline: "1px solid rgba(91, 159, 214, 0.5)",
  },
  ".cm-dropCursor": {
    borderLeft: "2px solid #5b9fd6",
    marginLeft: "-1px",
  },
  ".cm-foldGutter": {
    width: "16px",
  },
  ".cm-foldPlaceholder": {
    background: "#151f30",
    border: "1px solid #202938",
    color: "#5b9fd6",
    padding: "0 4px",
  },
});

// ---------------------------------------------------------------------------
// Token-drop extension
// Handles dragover/drop inside the CodeMirror DOM for TOKEN_DRAG_TYPE payloads.
// ---------------------------------------------------------------------------
function makeTokenDropExtension(): Extension {
  return EditorView.domEventHandlers({
    dragover(event) {
      if (event.dataTransfer?.types.includes(TOKEN_DRAG_TYPE)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        return true;
      }
      return false;
    },
    drop(event, view) {
      const token = event.dataTransfer?.getData(TOKEN_DRAG_TYPE);
      if (!token) return false;

      event.preventDefault();

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.doc.length;

      view.dispatch({
        changes: { from: pos, insert: token },
        selection: { anchor: pos + token.length },
      });
      view.focus();
      return true;
    },
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  /**
   * Called when focus enters the editor OR the token palette that sits
   * directly below it. Pass a stable callback ref — it is never used as a
   * useEffect dependency.
   */
  onFocus?: () => void;
  /**
   * Called only when focus leaves both the editor AND its associated palette.
   * The palette element is identified via the `paletteRef` prop; when provided
   * we check `relatedTarget` before firing to avoid spurious blur/focus cycles.
   */
  onBlur?: () => void;
  /**
   * Ref to the palette container DOM node. When supplied, `onBlur` is
   * suppressed if the focus moves into that element, so the host component
   * never sees a blur when the user interacts with the token palette.
   */
  paletteRef?: React.RefObject<HTMLElement | null>;
  /**
   * If provided, this ref will be populated with an `insertText` function
   * that callers (e.g. TokenPalette) can invoke to insert a string at the
   * current cursor position without having to hold a reference to the view.
   */
  insertRef?: React.RefObject<((text: string) => void) | null>;
  minHeight?: number;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CodeEditor({
  value,
  onChange,
  onFocus,
  onBlur,
  paletteRef,
  insertRef,
  minHeight = 160,
  className = "",
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const internalChangeRef = useRef(false);

  // Always-fresh callback refs so the CodeMirror setup closure never stales.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const paletteRefRef = useRef(paletteRef);
  paletteRefRef.current = paletteRef;

  // Always-fresh insertRef — populated once the view is created.
  const insertRefRef = useRef(insertRef);
  insertRefRef.current = insertRef;

  // Mount editor once.
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        internalChangeRef.current = true;
        onChangeRef.current(update.state.doc.toString());
        internalChangeRef.current = false;
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        oneDark,
        adminTheme,
        html({ autoCloseTags: true, matchClosingTags: true }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        lineNumbers(),
        foldGutter(),
        dropCursor(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        updateListener,
        makeTokenDropExtension(),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    // ── insertRef wiring ─────────────────────────────────────────────────────
    // Expose an insertText helper so external callers (TokenPalette click-to-
    // insert) can push text into the editor at the current cursor position.
    if (insertRefRef.current) {
      insertRefRef.current.current = (text: string) => {
        const v = viewRef.current;
        if (!v) return;
        const sel = v.state.selection.main;
        v.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length },
        });
        v.focus();
      };
    }

    // ── Focus / blur wiring ──────────────────────────────────────────────────
    // We listen on the CodeMirror root element with focusin/focusout rather
    // than relying on CodeMirror's own focus callbacks, because we need access
    // to `relatedTarget` to decide whether focus is truly leaving the
    // editor+palette compound widget.
    const cmRoot = view.dom;

    const handleFocusIn = () => {
      onFocusRef.current?.();
    };

    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;

      // If focus is moving into the palette, do NOT fire onBlur.
      const palette = paletteRefRef.current?.current;
      if (palette && next && palette.contains(next)) return;

      // If focus is staying inside the CodeMirror editor itself, skip too.
      if (cmRoot.contains(next)) return;

      onBlurRef.current?.();
    };

    cmRoot.addEventListener("focusin", handleFocusIn);
    cmRoot.addEventListener("focusout", handleFocusOut);

    return () => {
      cmRoot.removeEventListener("focusin", handleFocusIn);
      cmRoot.removeEventListener("focusout", handleFocusOut);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // Sync external value → editor (e.g. block reset).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || internalChangeRef.current) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    // Guard: clamp to actual doc length to prevent RangeError if the view
    // was partially torn down or the doc shrank between render and dispatch.
    const docLen = view.state.doc.length;
    view.dispatch({ changes: { from: 0, to: Math.min(docLen, current.length), insert: value } });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`cm-editor-host overflow-auto ${className}`}
      style={{ minHeight }}
    />
  );
}

// ---------------------------------------------------------------------------
// MarkdownEditor — same wrapper but with markdown language + softer theme
// ---------------------------------------------------------------------------
export function MarkdownEditor({
  value,
  onChange,
  onFocus,
  onBlur,
  insertRef,
  minHeight = 160,
  className = "",
}: Omit<CodeEditorProps, "paletteRef">) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const internalChangeRef = useRef(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;
  const insertRefRef = useRef(insertRef);
  insertRefRef.current = insertRef;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        internalChangeRef.current = true;
        onChangeRef.current(update.state.doc.toString());
        internalChangeRef.current = false;
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        oneDark,
        adminTheme,
        markdownTheme,
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        history(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        lineNumbers(),
        // No foldGutter for markdown — headings fold is more confusing than helpful
        dropCursor(),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        // Soft-wrap long lines — prose flows naturally
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    if (insertRefRef.current) {
      insertRefRef.current.current = (text: string) => {
        const v = viewRef.current;
        if (!v) return;
        const sel = v.state.selection.main;
        v.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length },
        });
        v.focus();
      };
    }

    const cmRoot = view.dom;
    const handleFocusIn = () => onFocusRef.current?.();
    const handleFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (cmRoot.contains(next)) return;
      onBlurRef.current?.();
    };
    cmRoot.addEventListener("focusin", handleFocusIn);
    cmRoot.addEventListener("focusout", handleFocusOut);

    return () => {
      cmRoot.removeEventListener("focusin", handleFocusIn);
      cmRoot.removeEventListener("focusout", handleFocusOut);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value → editor (e.g. block reset).
  useEffect(() => {
    const view = viewRef.current;
    if (!view || internalChangeRef.current) return;
    const current = view.state.doc.toString();
    if (current === value) return;
    // Guard: clamp to actual doc length to prevent RangeError if the view
    // was partially torn down or the doc shrank between render and dispatch.
    const docLen = view.state.doc.length;
    view.dispatch({ changes: { from: 0, to: Math.min(docLen, current.length), insert: value } });
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={`cm-editor-host overflow-auto ${className}`}
      style={{ minHeight }}
    />
  );
}
