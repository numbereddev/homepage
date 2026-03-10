"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

type Props = {
  postTitle: string;
  postUrl: string;
};

type PopoverState = { visible: false } | { visible: true; x: number; y: number; text: string };

const MAX_QUOTE = 220;

function cleanSelection(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(s: string): string {
  if (s.length <= MAX_QUOTE) return s;
  return s.slice(0, MAX_QUOTE).trimEnd() + "…";
}

function twitterUrl(quote: string, title: string, url: string) {
  const body = `"${quote}"\n\n— ${title}`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}&url=${encodeURIComponent(url)}`;
}

function linkedInUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

async function copyText(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

export default function TextSelectionShare({ postTitle, postUrl }: Props) {
  const [pop, setPop] = useState<PopoverState>({ visible: false });
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether the pointer is currently pressed so we don't show mid-drag
  const pointerDownRef = useRef(false);
  // Track whether the popover itself is being interacted with
  const interactingWithPopoverRef = useRef(false);

  const hide = useCallback(() => {
    setPop({ visible: false });
    setCopied(false);
  }, []);

  const tryShow = useCallback(() => {
    // Don't evaluate while user is still holding the mouse button
    if (pointerDownRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      hide();
      return;
    }

    const raw = sel.toString();
    const text = cleanSelection(raw);
    if (text.length < 10) {
      hide();
      return;
    }

    const range = sel.getRangeAt(0);

    // Only activate inside [data-share-scope]
    const ancestor =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    if (!ancestor?.closest("[data-share-scope]")) {
      hide();
      return;
    }

    const rect = range.getBoundingClientRect();
    // getBoundingClientRect can return zeros for collapsed or off-screen ranges
    if (rect.width === 0 && rect.height === 0) {
      hide();
      return;
    }

    const POPOVER_W = 122;
    const x = Math.round(rect.left + rect.width / 2 - POPOVER_W / 2);
    const y = Math.round(rect.top - 46);

    setPop({ visible: true, x, y, text: truncate(text) });
    setCopied(false);
  }, [hide]);

  // selectionchange fires reliably whenever the selection changes (including
  // via keyboard). We defer by one rAF so the range geometry is finalised.
  useEffect(() => {
    let rafId: number;

    const onSelectionChange = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tryShow);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      cancelAnimationFrame(rafId);
    };
  }, [tryShow]);

  // Track pointer down/up so we suppress mid-drag display
  useEffect(() => {
    const onDown = () => {
      pointerDownRef.current = true;
    };
    const onUp = () => {
      pointerDownRef.current = false;
      // Give selectionchange one more chance to fire now that pointer is up
      requestAnimationFrame(tryShow);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("touchend", onUp, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("touchend", onUp);
    };
  }, [tryShow]);

  // Hide when clicking outside — but only if not clicking inside the popover
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) {
        // User clicked inside the popover; keep it alive
        interactingWithPopoverRef.current = true;
        return;
      }
      interactingWithPopoverRef.current = false;
      // Don't hide immediately — let selectionchange decide after mouseup
    };

    const onMouseUp = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      if (interactingWithPopoverRef.current) return;

      // Small delay so selectionchange fires first; if a new valid selection
      // was made, tryShow will have already updated state.
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) hide();
      }, 0);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [hide]);

  // Scroll → hide (position would drift since we use fixed coords)
  useEffect(() => {
    const onScroll = () => {
      if (pop.visible) hide();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pop.visible, hide]);

  useEffect(() => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    return () => {
      setMounted(false);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  // ---------- action handlers ----------

  const onTwitter = () => {
    if (!pop.visible) return;
    window.open(
      twitterUrl(pop.text, postTitle, postUrl),
      "_blank",
      "noopener,noreferrer,width=560,height=420",
    );
    hide();
  };

  const onLinkedIn = () => {
    window.open(linkedInUrl(postUrl), "_blank", "noopener,noreferrer,width=600,height=500");
    hide();
  };

  const onCopy = async () => {
    if (!pop.visible) return;
    const snippet = `"${pop.text}"\n\n— ${postTitle}\n${postUrl}`;
    if (await copyText(snippet)) {
      setCopied(true);
      copyTimer.current = setTimeout(() => {
        setCopied(false);
        hide();
      }, 1400);
    }
  };

  // Always render the container so refs and event handlers stay stable;
  // visibility is controlled via opacity + pointer-events rather than
  // conditional unmounting, which avoids losing the element mid-click.
  const isVisible = pop.visible;
  const x = pop.visible ? pop.x : 0;
  const y = pop.visible ? pop.y : 0;

  const popover = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Share selected text"
      aria-hidden={!isVisible}
      // Prevent this mousedown from triggering the "outside click" hide path
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        pointerEvents: isVisible ? "auto" : "none",
        opacity: isVisible ? 1 : 0,
        // Only animate entry; skip the animation when hidden so there's no
        // ghost flash when the element re-appears at stale coords.
        animation: isVisible ? "spop 180ms cubic-bezier(0.16,1,0.3,1) both" : "none",
        willChange: "transform, opacity",
      }}
    >
      {/* Downward caret — border */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid #1e2c3a",
        }}
      />
      {/* Downward caret — fill */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: -3,
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "4px solid transparent",
          borderRight: "4px solid transparent",
          borderTop: "4px solid #0d1219",
        }}
      />

      {/* Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          background: "#0d1219",
          border: "1px solid #1e2c3a",
          padding: "3px 4px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6), 0 1px 4px rgba(0,0,0,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        <Btn onClick={onTwitter} title="Share on X / Twitter">
          <Image
            src="/x.svg"
            alt="X"
            width={11}
            height={11}
            style={{ filter: "invert(1)", opacity: 0.55 }}
          />
        </Btn>

        <Sep />

        <Btn onClick={onLinkedIn} title="Share on LinkedIn">
          <Image
            src="/linkedin.svg"
            alt="LinkedIn"
            width={11}
            height={11}
            style={{ opacity: 0.55 }}
          />
        </Btn>

        <Sep />

        <Btn onClick={onCopy} title={copied ? "Copied!" : "Copy quote"}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Btn>
      </div>

      <style>{`
        @keyframes spop {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0) scale(0.96);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  );

  if (!mounted) return null;

  return createPortal(popover, document.body);
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Btn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "#111c2a";
        const img = (e.currentTarget as HTMLButtonElement).querySelector("img");
        if (img) img.style.opacity = "0.9";
        const svg = (e.currentTarget as HTMLButtonElement).querySelector("svg");
        if (svg) svg.style.color = "#7dd3fc";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        const img = (e.currentTarget as HTMLButtonElement).querySelector("img");
        if (img) img.style.opacity = "0.55";
        const svg = (e.currentTarget as HTMLButtonElement).querySelector("svg");
        if (svg) svg.style.color = "#607080";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 27,
        height: 25,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        transition: "background 100ms ease",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <span
      aria-hidden="true"
      style={{ width: 1, height: 12, background: "#1e2c3a", flexShrink: 0 }}
    />
  );
}

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: "#607080", transition: "color 100ms ease" }}
    >
      <rect x="9" y="9" width="13" height="13" rx="0" ry="0" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#86efac"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
