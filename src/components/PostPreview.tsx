"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type PostPreviewProps = {
  content: string;
  className?: string;
};

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * PostPreview component that uses the same rendering pipeline as the final output.
 * Uses the server-side API to render content with syntax highlighting.
 */
export default function PostPreview({ content, className = "" }: PostPreviewProps) {
  const [html, setHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounce content to avoid too many API calls while typing
  const debouncedContent = useDebounce(content, 300);

  const renderPreview = useCallback(async (contentToRender: string) => {
    if (!contentToRender.trim()) {
      setHtml("");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/preview", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: contentToRender }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to render preview");
      }

      setHtml(data.html || "");
    } catch (err) {
      console.error("Preview render error:", err);
      setError(err instanceof Error ? err.message : "Failed to render preview");
      setHtml("");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    renderPreview(debouncedContent);
  }, [debouncedContent, renderPreview]);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              *, *::before, *::after { box-sizing: border-box; }

              body {
                margin: 0;
                padding: 24px;
                background: #080b10;
                color: #f3f6fb;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                line-height: 1.7;
              }

              /* Typography */
              h1, h2, h3, h4 {
                color: #fff;
                font-weight: 600;
                letter-spacing: -0.04em;
                line-height: 1.2;
                margin-top: 1.5rem;
              }
              h1 { font-size: 2.4rem; margin-top: 0; }
              h2 { font-size: 1.7rem; border-top: 1px solid #202938; padding-top: 1rem; margin-top: 2rem; }
              h3 { font-size: 1.3rem; }
              h4 { font-size: 1.1rem; }

              p { color: #cad3df; margin: 1rem 0; }

              a { color: #7dd3fc; text-decoration: underline; }
              a:hover { color: #b6e8ff; }

              ul, ol { padding-left: 1.25rem; color: #cad3df; }
              li + li { margin-top: 0.4rem; }

              /* Inline code */
              code {
                border: 1px solid #202938;
                background: #0d1219;
                padding: 0.12rem 0.35rem;
                color: #d8f3ff;
                font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
                font-size: 0.92em;
              }

              /* Code blocks with syntax highlighting */
              pre {
                overflow-x: auto;
                border: 1px solid #202938;
                background: #0a1017 !important;
                padding: 1rem;
                position: relative;
                margin: 1.5rem 0;
              }

              pre[data-language]::before {
                content: attr(data-language);
                position: absolute;
                top: 0.5rem;
                right: 0.6rem;
                border: 1px solid #2a3442;
                background: #0f1722;
                padding: 0.12rem 0.4rem;
                color: #7dd3fc;
                font-family: ui-monospace, SFMono-Regular, monospace;
                font-size: 0.68rem;
                font-weight: 600;
                letter-spacing: 0.12em;
                text-transform: uppercase;
              }

              pre code {
                display: block;
                border: 0;
                background: transparent;
                padding: 0;
                font-size: 0.9rem;
                line-height: 1.7;
              }

              /* Shiki syntax highlighting - ensure background stays dark */
              pre.shiki,
              .shiki,
              .shiki code {
                background: #0a1017 !important;
              }

              /* Blockquotes */
              blockquote {
                margin: 1.5rem 0;
                border-left: 2px solid #38bdf8;
                padding-left: 1rem;
                color: #d7e2ee;
              }

              strong { color: #fff; font-weight: 600; }
              em { color: #dbe7f3; }

              /* Images */
              img { max-width: 100%; height: auto; }

              /* Tables */
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5rem 0;
              }
              th, td {
                border: 1px solid #202938;
                padding: 0.75rem;
                text-align: left;
              }
              th {
                background: #0d1219;
                color: #fff;
                font-weight: 600;
              }
              td {
                color: #cad3df;
              }

              /* Horizontal rule */
              hr {
                border: 0;
                border-top: 1px solid #202938;
                margin: 2rem 0;
              }

              /* Details/Summary */
              details {
                margin: 1rem 0;
              }
              summary {
                cursor: pointer;
                color: #f5f7fa;
                font-weight: 500;
              }

              /* Styled fields from component system */
              .styled-field {
                color: #f5f7fa;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#607080] bg-[#0a0d12]/80 border border-[#202632]">
            Rendering...
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#080b10]">
          <div className="text-sm text-[#ff8f8f]">{error}</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title="Post Preview"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

/**
 * Static HTML preview that doesn't use iframe
 * Useful for inline previews where iframe isolation isn't needed
 */
export function PostPreviewInline({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`prose-flat ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
