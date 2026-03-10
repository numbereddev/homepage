"use client";

import { useEffect, useState, useCallback } from "react";

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

  return (
    <div className={`relative h-full overflow-y-auto ${className}`}>
      {isLoading && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#607080] bg-[#0a0d12]/80 border border-[#202632]">
            Rendering...
          </div>
        </div>
      )}
      {error ? (
        <div className="flex h-full items-center justify-center bg-[#080b10]">
          <div className="text-sm text-[#ff8f8f]">{error}</div>
        </div>
      ) : (
        <div className="preview-body preview-surface min-h-full">
          <div className="prose-flat" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
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
