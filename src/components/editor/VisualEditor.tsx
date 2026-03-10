"use client";

import { MarkdownEditor } from "./CodeEditor";

import { useRef, useEffect, useCallback, useState } from "react";
import CodeEditor from "./CodeEditor";
import TokenPalette from "./TokenPalette";

export type EditorBlock = {
  id: string;
  type: "text" | "html" | "component";
  content: string;
  componentId?: string;
};

type VisualEditorProps = {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  onPreviewUpdate: (html: string) => void;
};

function generateId() {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderInlineMarkdown(text: string) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  return html;
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    output.push(
      `<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`,
    );
    listItems = [];
  };

  const flushCode = () => {
    const langAttr = codeLanguage ? ` data-language="${codeLanguage}"` : "";
    output.push(`<pre${langAttr}><code>${codeLines.map(escapeHtml).join("\n")}</code></pre>`);
    codeLines = [];
    codeLanguage = "";
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (inCodeBlock) {
      if (trimmed.startsWith("```")) {
        inCodeBlock = false;
        flushCode();
      } else {
        codeLines.push(rawLine);
      }
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      inCodeBlock = true;
      codeLanguage = trimmed.slice(3).trim();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      output.push(`<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`);
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      output.push(`<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      output.push(`<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`);
      continue;
    }

    if (trimmed.startsWith("#### ")) {
      flushParagraph();
      flushList();
      output.push(`<h4>${renderInlineMarkdown(trimmed.slice(5))}</h4>`);
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      flushList();
      output.push(`<blockquote><p>${renderInlineMarkdown(trimmed.slice(2))}</p></blockquote>`);
      continue;
    }

    if (/^[-*]\s/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    if (listItems.length > 0) {
      flushList();
    }

    paragraph.push(trimmed);
  }

  if (inCodeBlock) {
    flushCode();
  }

  flushParagraph();
  flushList();

  return output.join("\n");
}

export function blocksToContent(blocks: EditorBlock[]): string {
  return blocks.map((block) => block.content).join("\n\n");
}

export function contentToBlocks(content: string): EditorBlock[] {
  if (!content.trim()) {
    return [{ id: generateId(), type: "text", content: "" }];
  }

  const blocks: EditorBlock[] = [];
  const lines = content.split("\n");
  let currentTextLines: string[] = [];
  let inHtmlBlock = false;
  let htmlLines: string[] = [];
  let htmlTagDepth = 0;

  const flushText = () => {
    if (currentTextLines.length > 0) {
      const text = currentTextLines.join("\n").trim();
      if (text) {
        blocks.push({ id: generateId(), type: "text", content: text });
      }
      currentTextLines = [];
    }
  };

  const flushHtml = () => {
    if (htmlLines.length > 0) {
      blocks.push({
        id: generateId(),
        type: "html",
        content: htmlLines.join("\n"),
      });
      htmlLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (inHtmlBlock) {
      htmlLines.push(line);

      const openTags = (
        trimmed.match(
          /<(div|section|article|style|script|details|figure|svg|canvas|iframe|video)[\s>]/gi,
        ) || []
      ).length;
      const closeTags = (
        trimmed.match(
          /<\/(div|section|article|style|script|details|figure|svg|canvas|iframe|video)>/gi,
        ) || []
      ).length;

      htmlTagDepth += openTags - closeTags;

      if (htmlTagDepth <= 0) {
        inHtmlBlock = false;
        htmlTagDepth = 0;
        flushHtml();
      }
      continue;
    }

    const htmlBlockStart =
      /^<(div|section|article|style|script|details|figure|svg|canvas|iframe|video)[\s>]/i;
    if (htmlBlockStart.test(trimmed)) {
      flushText();
      inHtmlBlock = true;
      htmlTagDepth = 1;
      htmlLines.push(line);

      const openTags = (
        trimmed.match(
          /<(div|section|article|style|script|details|figure|svg|canvas|iframe|video)[\s>]/gi,
        ) || []
      ).length;
      const closeTags = (
        trimmed.match(
          /<\/(div|section|article|style|script|details|figure|svg|canvas|iframe|video)>/gi,
        ) || []
      ).length;

      htmlTagDepth = openTags - closeTags;

      if (htmlTagDepth <= 0) {
        inHtmlBlock = false;
        htmlTagDepth = 0;
        flushHtml();
      }
      continue;
    }

    currentTextLines.push(line);
  }

  if (inHtmlBlock && htmlLines.length > 0) {
    flushHtml();
  }

  flushText();

  if (blocks.length === 0) {
    blocks.push({ id: generateId(), type: "text", content: "" });
  }

  return blocks;
}

export function blocksToPreviewHtml(blocks: EditorBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "html" || block.type === "component") {
        return block.content;
      }
      return markdownToHtml(block.content);
    })
    .join("\n");
}

export default function VisualEditor({ blocks, onChange, onPreviewUpdate }: VisualEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<"before" | "after" | null>(null);

  // Per-block palette refs and insert-callback refs stored in state records
  // so they can be read safely during render without touching `.current`.
  // Keys are block ids; values are stable ref objects created once per block.
  const [paletteRefsRecord, setPaletteRefsRecord] = useState<
    Record<string, React.RefObject<HTMLDivElement | null>>
  >({});
  const [insertRefsRecord, setInsertRefsRecord] = useState<
    Record<string, React.RefObject<((text: string) => void) | null>>
  >({});

  // Keep the records in sync whenever the block list changes.
  // We only ever add new entries; stale entries for removed blocks are
  // harmless (refs just become orphaned, GC'd when nothing else holds them).
  useEffect(() => {
    const missingPalette: Record<string, React.RefObject<HTMLDivElement | null>> = {};
    const missingInsert: Record<string, React.RefObject<((text: string) => void) | null>> = {};
    let needsPalette = false;
    let needsInsert = false;

    for (const block of blocks) {
      if (!paletteRefsRecord[block.id]) {
        missingPalette[block.id] = { current: null };
        needsPalette = true;
      }
      if (!insertRefsRecord[block.id]) {
        missingInsert[block.id] = { current: null };
        needsInsert = true;
      }
    }

    if (needsPalette) {
      setPaletteRefsRecord((prev) => ({ ...prev, ...missingPalette }));
    }
    if (needsInsert) {
      setInsertRefsRecord((prev) => ({ ...prev, ...missingInsert }));
    }
    // paletteRefsRecord / insertRefsRecord intentionally omitted — we only
    // want to add entries for new blocks, not re-run on every record update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  useEffect(() => {
    onPreviewUpdate(blocksToPreviewHtml(blocks));
  }, [blocks, onPreviewUpdate]);

  const updateBlock = useCallback(
    (id: string, content: string) => {
      const newBlocks = blocks.map((block) => (block.id === id ? { ...block, content } : block));
      onChange(newBlocks);
    },
    [blocks, onChange],
  );

  const addBlockAfter = useCallback(
    (afterId: string, type: EditorBlock["type"] = "text") => {
      const index = blocks.findIndex((b) => b.id === afterId);
      const newBlock: EditorBlock = {
        id: generateId(),
        type,
        content: "",
      };
      const newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
      onChange(newBlocks);
      return newBlock.id;
    },
    [blocks, onChange],
  );

  const removeBlock = useCallback(
    (id: string) => {
      if (blocks.length <= 1) {
        onChange([{ id: generateId(), type: "text", content: "" }]);
        return;
      }
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange],
  );

  const moveBlock = useCallback(
    (fromId: string, toId: string, position: "before" | "after") => {
      const fromIndex = blocks.findIndex((b) => b.id === fromId);
      const toIndex = blocks.findIndex((b) => b.id === toId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(fromIndex, 1);

      let insertIndex = toIndex;
      if (fromIndex < toIndex) {
        insertIndex = position === "after" ? toIndex : toIndex - 1;
      } else {
        insertIndex = position === "after" ? toIndex + 1 : toIndex;
      }

      newBlocks.splice(insertIndex, 0, movedBlock);
      onChange(newBlocks);
    },
    [blocks, onChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? "before" : "after";

    setDragOverBlockId(blockId);
    setDragPosition(position);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetBlockId: string) => {
      e.preventDefault();
      e.stopPropagation();

      const componentContent = e.dataTransfer.getData("component/html");
      const blockId = e.dataTransfer.getData("block/id");

      if (componentContent) {
        const newBlock: EditorBlock = {
          id: generateId(),
          type: "component",
          content: componentContent,
        };

        const targetIndex = blocks.findIndex((b) => b.id === targetBlockId);
        const insertIndex = dragPosition === "after" ? targetIndex + 1 : targetIndex;

        const newBlocks = [...blocks.slice(0, insertIndex), newBlock, ...blocks.slice(insertIndex)];
        onChange(newBlocks);
      } else if (blockId && dragPosition) {
        moveBlock(blockId, targetBlockId, dragPosition);
      }

      setDragOverBlockId(null);
      setDragPosition(null);
    },
    [blocks, onChange, dragPosition, moveBlock],
  );

  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData("block/id", blockId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragOverBlockId(null);
    setDragPosition(null);
  }, []);

  const changeBlockType = useCallback(
    (id: string, newType: EditorBlock["type"]) => {
      const newBlocks = blocks.map((block) =>
        block.id === id ? { ...block, type: newType } : block,
      );
      onChange(newBlocks);
    },
    [blocks, onChange],
  );

  return (
    <div ref={containerRef} className="visual-editor">
      <div className="space-y-3">
        {blocks.map((block) => {
          const isActive = activeBlockId === block.id;
          const isDragOver = dragOverBlockId === block.id;
          const isCodeBlock = block.type === "html" || block.type === "component";

          return (
            <div
              key={block.id}
              className={[
                "group relative",
                isDragOver && dragPosition === "before"
                  ? "before:absolute before:left-0 before:right-0 before:-top-2 before:h-1 before:bg-[#5b9fd6]"
                  : "",
                isDragOver && dragPosition === "after"
                  ? "after:absolute after:left-0 after:right-0 after:-bottom-2 after:h-1 after:bg-[#5b9fd6]"
                  : "",
              ].join(" ")}
              onDragOver={(e) => {
                // Only intercept block-reorder drags here; token drags are
                // handled by CodeEditor's own DOM handler.
                if (e.dataTransfer.types.includes("block/id")) {
                  handleDragOver(e, block.id);
                }
              }}
              onDrop={(e) => {
                if (e.dataTransfer.types.includes("block/id")) {
                  handleDrop(e, block.id);
                }
              }}
              onDragLeave={() => {
                setDragOverBlockId(null);
                setDragPosition(null);
              }}
            >
              <div
                className={[
                  "relative border transition-all",
                  isActive
                    ? "border-[#5b9fd6] bg-[#0f1520]"
                    : "border-[#202632] bg-[#0b0f14] hover:border-[#3a4758]",
                ].join(" ")}
              >
                {/* Drag handle */}
                <div className="absolute -left-10 top-0 bottom-0 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, block.id)}
                    onDragEnd={handleDragEnd}
                    className="p-1.5 text-[#607080] hover:text-[#f5f7fa] cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="9" cy="5" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="5" r="1.5" fill="currentColor" />
                      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="9" cy="19" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="19" r="1.5" fill="currentColor" />
                    </svg>
                  </button>
                </div>

                {/* Block toolbar */}
                <div className="flex items-center gap-px border-b border-[#202632] bg-[#0a0d10]">
                  <select
                    value={block.type}
                    onChange={(e) =>
                      changeBlockType(block.id, e.target.value as EditorBlock["type"])
                    }
                    className="bg-transparent px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8a99] outline-none cursor-pointer hover:text-[#c7d0db]"
                  >
                    <option value="text">Markdown</option>
                    <option value="html">HTML</option>
                    <option value="component">Component</option>
                  </select>

                  {block.type === "text" && (
                    <span className="px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#3d4f60]">
                      syntax highlighting · soft wrap
                    </span>
                  )}
                  {isCodeBlock && (
                    <span className="px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#3d4f60]">
                      syntax highlighting · drag tokens below
                    </span>
                  )}

                  <div className="flex-1" />

                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5b3a3a] hover:text-[#ff8f8f] transition-colors"
                      title="Remove block"
                    >
                      Remove
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => addBlockAfter(block.id, "text")}
                    className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#607080] hover:text-[#f5f7fa] transition-colors"
                    title="Add block below"
                  >
                    + Block
                  </button>
                </div>

                {/* Editor area */}
                {block.type === "text" ? (
                  <MarkdownEditor
                    value={block.content}
                    onChange={(v) => updateBlock(block.id, v)}
                    onFocus={() => setActiveBlockId(block.id)}
                    onBlur={() => setActiveBlockId(null)}
                    insertRef={insertRefsRecord[block.id]}
                    minHeight={180}
                  />
                ) : (
                  <>
                    <CodeEditor
                      value={block.content}
                      onChange={(v) => updateBlock(block.id, v)}
                      onFocus={() => setActiveBlockId(block.id)}
                      onBlur={() => setActiveBlockId(null)}
                      paletteRef={paletteRefsRecord[block.id]}
                      insertRef={insertRefsRecord[block.id]}
                      minHeight={180}
                      className="border-b border-[#202632]"
                    />
                    {/* Token palette — always visible for code blocks.
                        NO preventDefault here so native dragstart fires on chips.
                        The CodeEditor's focusout handler uses paletteRef to
                        suppress spurious blur when focus moves into this div.
                        onInsert wires click-to-insert via the CodeEditor's
                        insertRef so tokens can be clicked in at the cursor. */}
                    <div ref={paletteRefsRecord[block.id]}>
                      <TokenPalette
                        onInsert={(text) => insertRefsRecord[block.id]?.current?.(text)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {blocks.length === 0 && (
        <button
          type="button"
          onClick={() => onChange([{ id: generateId(), type: "text", content: "" }])}
          className="w-full border border-dashed border-[#3a4758] p-8 text-center text-sm text-[#607080] hover:border-[#5b9fd6] hover:text-[#f5f7fa] transition-colors"
        >
          Click to add your first block
        </button>
      )}
    </div>
  );
}

export { generateId };
