"use client";

import { useState } from "react";
import { TOKEN_DRAG_TYPE } from "./CodeEditor";

// ---------------------------------------------------------------------------
// Public API for click-to-insert
// ---------------------------------------------------------------------------
export type TokenInsertFn = (text: string) => void;

// ---------------------------------------------------------------------------
// Token definitions
// Each entry describes one draggable chip. `insert` is the exact string that
// gets written into the editor at the drop position.
// ---------------------------------------------------------------------------

type TokenEntry = {
  label: string;
  insert: string;
  preview?: string; // short visual hint (colour swatch, size, etc.)
};

type TokenGroup = {
  label: string;
  tokens: TokenEntry[];
};

// Colour values must stay in sync with globals.css :root vars
const TOKEN_GROUPS: TokenGroup[] = [
  {
    label: "Colours",
    tokens: [
      { label: "background", insert: "var(--background)", preview: "#080b10" },
      { label: "foreground", insert: "var(--foreground)", preview: "#f3f6fb" },
      { label: "panel", insert: "var(--panel)", preview: "#0d1219" },
      { label: "panel-2", insert: "var(--panel-2)", preview: "#111826" },
      { label: "panel-3", insert: "var(--panel-3)", preview: "#151f30" },
      { label: "border", insert: "var(--border)", preview: "#202938" },
      { label: "border-strong", insert: "var(--border-strong)", preview: "#334155" },
      { label: "muted", insert: "var(--muted)", preview: "#91a0b3" },
      { label: "muted-2", insert: "var(--muted-2)", preview: "#637287" },
      { label: "accent", insert: "var(--accent)", preview: "#5b9fd6" },
      { label: "accent-strong", insert: "var(--accent-strong)", preview: "#3b82c4" },
      { label: "danger", insert: "var(--danger)", preview: "#fca5a5" },
      { label: "success", insert: "var(--success)", preview: "#86efac" },
    ],
  },
  {
    label: "Typography",
    tokens: [
      { label: "font-sans", insert: "var(--font-sans)", preview: "Aa" },
      { label: "font-mono", insert: "var(--font-mono)", preview: "Aa" },
      { label: "text-xs", insert: "font-size:0.75rem", preview: "12" },
      { label: "text-sm", insert: "font-size:0.875rem", preview: "14" },
      { label: "text-base", insert: "font-size:1rem", preview: "16" },
      { label: "text-lg", insert: "font-size:1.125rem", preview: "18" },
      { label: "text-xl", insert: "font-size:1.25rem", preview: "20" },
      { label: "text-2xl", insert: "font-size:1.5rem", preview: "24" },
      { label: "text-3xl", insert: "font-size:1.875rem", preview: "30" },
      { label: "tracking-tight", insert: "letter-spacing:-0.04em", preview: "–" },
      { label: "tracking-wide", insert: "letter-spacing:0.2em", preview: "+" },
      { label: "tracking-widest", insert: "letter-spacing:0.32em", preview: "++" },
      { label: "uppercase", insert: "text-transform:uppercase", preview: "UC" },
      { label: "weight-400", insert: "font-weight:400", preview: "Rg" },
      { label: "weight-600", insert: "font-weight:600", preview: "Sb" },
      { label: "weight-700", insert: "font-weight:700", preview: "Bd" },
      { label: "leading-snug", insert: "line-height:1.375", preview: "≡" },
      { label: "leading-normal", insert: "line-height:1.7", preview: "≡" },
      { label: "leading-loose", insert: "line-height:1.9", preview: "≡" },
    ],
  },
  {
    label: "Spacing",
    tokens: [
      { label: "gap-1", insert: "gap:4px", preview: "4" },
      { label: "gap-2", insert: "gap:8px", preview: "8" },
      { label: "gap-3", insert: "gap:12px", preview: "12" },
      { label: "gap-4", insert: "gap:16px", preview: "16" },
      { label: "gap-5", insert: "gap:20px", preview: "20" },
      { label: "gap-6", insert: "gap:24px", preview: "24" },
      { label: "gap-8", insert: "gap:32px", preview: "32" },
      { label: "p-3", insert: "padding:12px", preview: "12" },
      { label: "p-4", insert: "padding:16px", preview: "16" },
      { label: "p-5", insert: "padding:20px", preview: "20" },
      { label: "p-6", insert: "padding:24px", preview: "24" },
      { label: "p-8", insert: "padding:32px", preview: "32" },
      { label: "px-4", insert: "padding-inline:16px", preview: "⟺16" },
      { label: "px-6", insert: "padding-inline:24px", preview: "⟺24" },
      { label: "py-3", insert: "padding-block:12px", preview: "↕12" },
      { label: "py-4", insert: "padding-block:16px", preview: "↕16" },
      { label: "mt-4", insert: "margin-top:16px", preview: "↑16" },
      { label: "mt-6", insert: "margin-top:24px", preview: "↑24" },
      { label: "mt-8", insert: "margin-top:32px", preview: "↑32" },
      { label: "mb-4", insert: "margin-bottom:16px", preview: "↓16" },
    ],
  },
  {
    label: "Borders",
    tokens: [
      { label: "border-default", insert: "border:1px solid var(--border)", preview: "—" },
      { label: "border-strong", insert: "border:1px solid var(--border-strong)", preview: "—" },
      { label: "border-accent", insert: "border:1px solid var(--accent)", preview: "—" },
      { label: "border-left", insert: "border-left:2px solid var(--accent)", preview: "│" },
      { label: "radius-none", insert: "border-radius:0", preview: "□" },
      { label: "radius-sm", insert: "border-radius:4px", preview: "▢" },
    ],
  },
  {
    label: "Layout",
    tokens: [
      { label: "flex", insert: "display:flex", preview: "⊡" },
      { label: "flex-col", insert: "display:flex;flex-direction:column", preview: "⊞" },
      { label: "grid", insert: "display:grid", preview: "⊟" },
      {
        label: "grid-2-col",
        insert: "display:grid;grid-template-columns:repeat(2,1fr);gap:1px",
        preview: "⊠",
      },
      {
        label: "grid-3-col",
        insert: "display:grid;grid-template-columns:repeat(3,1fr);gap:1px",
        preview: "⊠",
      },
      { label: "items-center", insert: "align-items:center", preview: "⊡" },
      { label: "justify-between", insert: "justify-content:space-between", preview: "⟺" },
      { label: "justify-center", insert: "justify-content:center", preview: "⊡" },
      { label: "w-full", insert: "width:100%", preview: "↔" },
      { label: "overflow-hidden", insert: "overflow:hidden", preview: "✂" },
      {
        label: "truncate",
        insert: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
        preview: "…",
      },
    ],
  },
  {
    label: "Snippets",
    tokens: [
      {
        label: "panel card",
        insert: `<div style="border:1px solid var(--border);background:var(--panel);padding:20px">\n  \n</div>`,
        preview: "{ }",
      },
      {
        label: "section header",
        insert: `<div style="border-bottom:1px solid var(--border);padding-bottom:12px;margin-bottom:16px">\n  <p style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:var(--accent)">\n    Label\n  </p>\n  <h2 style="margin:8px 0 0;color:var(--foreground);font-size:24px;font-weight:600">Heading</h2>\n</div>`,
        preview: "H",
      },
      {
        label: "kicker label",
        insert: `<p style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;font-weight:600;color:var(--accent)">Label</p>`,
        preview: "L",
      },
      {
        label: "muted meta row",
        insert: `<p style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)">Date · Min read</p>`,
        preview: "m",
      },
      {
        label: "accent link",
        insert: `<a href="#" style="color:var(--accent);text-decoration:underline;text-underline-offset:.2em">Link text</a>`,
        preview: "↗",
      },
      {
        label: "gap divider",
        insert: `<hr style="border:0;border-top:1px solid var(--border);margin:24px 0" />`,
        preview: "—",
      },
      {
        label: "tag pill",
        insert: `<span style="border:1px solid var(--border);padding:4px 10px;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted)">Tag</span>`,
        preview: "○",
      },
      {
        label: "accent button",
        insert: `<a href="#" style="display:inline-block;border:1px solid var(--accent);background:var(--accent);color:var(--background);padding:10px 20px;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;text-decoration:none">Button</a>`,
        preview: "▶",
      },
      {
        label: "ghost button",
        insert: `<a href="#" style="display:inline-block;border:1px solid var(--border);color:var(--foreground);padding:10px 20px;font-size:12px;font-weight:600;letter-spacing:.22em;text-transform:uppercase;text-decoration:none">Button</a>`,
        preview: "□",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Colour swatch helper
// ---------------------------------------------------------------------------
function isHexColor(str: string): boolean {
  return /^#[0-9a-f]{3,8}$/i.test(str);
}

// ---------------------------------------------------------------------------
// Single draggable chip
// ---------------------------------------------------------------------------
function TokenChip({ token, onInsert }: { token: TokenEntry; onInsert?: TokenInsertFn }) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(TOKEN_DRAG_TYPE, token.insert);
    e.dataTransfer.effectAllowed = "copy";
  };

  // Click-to-insert: if an insertRef function is available use it, otherwise
  // fall back to copying to clipboard so the user can paste manually.
  const handleClick = (e: React.MouseEvent) => {
    // Only treat as a click if this wasn't the end of a drag gesture.
    if (e.detail === 0) return; // synthetic / accessibility click — allow
    if (onInsert) {
      onInsert(token.insert);
    } else {
      navigator.clipboard?.writeText(token.insert).catch(() => {});
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      title={
        onInsert ? `Click or drag to insert: ${token.insert}` : `Drag to insert: ${token.insert}`
      }
      className="group flex cursor-grab items-center gap-1.5 border border-[#202632] bg-[#0b0f14] px-2 py-1.5 transition-colors hover:border-[#5b9fd6] hover:bg-[#0f1520] active:cursor-grabbing"
    >
      {/* Colour swatch or text preview */}
      {token.preview && isHexColor(token.preview) ? (
        <span
          className="inline-block h-3 w-3 shrink-0 border border-[#303a4a]"
          style={{ background: token.preview }}
          aria-hidden
        />
      ) : token.preview ? (
        <span className="shrink-0 font-mono text-[9px] text-[#506172] w-4 text-center leading-none">
          {token.preview}
        </span>
      ) : null}

      <span className="font-mono text-[10px] text-[#c7d0db] group-hover:text-white leading-none truncate max-w-[88px]">
        {token.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main palette component
// ---------------------------------------------------------------------------
export default function TokenPalette({ onInsert }: { onInsert?: TokenInsertFn }) {
  const [openGroup, setOpenGroup] = useState<string | null>(TOKEN_GROUPS[0].label);
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  // When searching, show all groups flat
  const searching = normalizedSearch.length > 0;
  const filteredGroups: TokenGroup[] = searching
    ? [
        {
          label: "Results",
          tokens: TOKEN_GROUPS.flatMap((g) =>
            g.tokens.filter(
              (t) =>
                t.label.toLowerCase().includes(normalizedSearch) ||
                t.insert.toLowerCase().includes(normalizedSearch),
            ),
          ),
        },
      ]
    : TOKEN_GROUPS;

  return (
    <div className="flex flex-col overflow-hidden border-t border-[#202632] bg-[#080b10]">
      {/* Header + search */}
      <div className="flex items-center gap-3 border-b border-[#202632] px-4 py-2.5">
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8a99]">
          Tokens
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-[#c7d0db] outline-none placeholder:text-[#3d4f60]"
        />
        <p className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-[#3d4f60]">
          {onInsert ? "click or drag" : "drag into editor"}
        </p>
      </div>

      {/* Group tabs — hidden while searching */}
      {!searching && (
        <div className="flex gap-px overflow-x-auto border-b border-[#202632] bg-[#202632]">
          {TOKEN_GROUPS.map((group) => (
            <button
              key={group.label}
              type="button"
              onClick={() => setOpenGroup(group.label)}
              className={[
                "shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors",
                openGroup === group.label
                  ? "bg-[#0f1520] text-[#5b9fd6]"
                  : "bg-[#080b10] text-[#506172] hover:text-[#8fa1b3]",
              ].join(" ")}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      {/* Chips grid */}
      <div className="overflow-y-auto" style={{ maxHeight: 160 }}>
        {filteredGroups.map((group) => {
          const isOpen = searching || openGroup === group.label;
          if (!isOpen) return null;

          return (
            <div key={group.label} className="p-3">
              {searching && (
                <p className="mb-2 text-[9px] uppercase tracking-[0.14em] text-[#3d4f60]">
                  {group.tokens.length} result{group.tokens.length !== 1 ? "s" : ""}
                </p>
              )}
              {group.tokens.length === 0 ? (
                <p className="text-[11px] text-[#3d4f60]">No tokens found.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {group.tokens.map((token) => (
                    <TokenChip key={token.label + token.insert} token={token} onInsert={onInsert} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
