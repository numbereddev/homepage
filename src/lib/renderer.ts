import { marked } from "marked";
import { codeToHtml, bundledLanguages } from "shiki";

// Language aliases for common variations
const languageAliases: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  yml: "yaml",
  md: "markdown",
  html: "html",
  css: "css",
  json: "json",
  sql: "sql",
  graphql: "graphql",
  dockerfile: "dockerfile",
  docker: "dockerfile",
  plaintext: "text",
  txt: "text",
  text: "text",
};

function resolveLanguage(lang: string | undefined): string {
  if (!lang) return "text";

  const normalized = lang.toLowerCase().trim();

  if (normalized in bundledLanguages) {
    return normalized;
  }

  if (normalized in languageAliases) {
    const aliased = languageAliases[normalized];
    if (aliased in bundledLanguages) {
      return aliased;
    }
  }

  return "text";
}

// Store for code blocks that need async highlighting
type CodeBlock = {
  id: string;
  code: string;
  language: string;
};

/**
 * Render markdown/HTML content with syntax highlighting
 * This is the canonical renderer used for both preview and final output
 */
export async function renderContent(content: string): Promise<string> {
  // Extract and process code blocks
  const codeBlocks: CodeBlock[] = [];
  let blockCounter = 0;

  // Create a custom renderer that extracts code blocks
  const renderer = new marked.Renderer();

  renderer.code = ({ text, lang }) => {
    const id = `__CODE_BLOCK_${blockCounter++}__`;
    const resolvedLang = resolveLanguage(lang);

    codeBlocks.push({
      id,
      code: text,
      language: resolvedLang,
    });

    // Return placeholder that we'll replace after async highlighting
    return id;
  };

  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // First pass: convert markdown to HTML with placeholders
  let html = await marked.parse(content, { renderer });

  // Second pass: highlight code blocks
  for (const block of codeBlocks) {
    try {
      const highlighted = await codeToHtml(block.code, {
        lang: block.language,
        theme: "github-dark-default",
        transformers: [
          {
            pre(node) {
              // Add data-language attribute for styling
              node.properties["data-language"] = block.language;
            },
          },
        ],
      });
      html = html.replace(block.id, highlighted);
    } catch {
      // Fallback to plain code block if highlighting fails
      const escaped = escapeHtml(block.code);
      html = html.replace(
        block.id,
        `<pre data-language="${block.language}"><code>${escaped}</code></pre>`,
      );
    }
  }

  return html;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Render inline markdown (for simple text with emphasis, links, etc.)
 */
export function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code (must come first to prevent other replacements inside code)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );

  return html;
}

/**
 * Calculate estimated reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  // Strip HTML tags and count words
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.trim().split(/\s+/).filter(Boolean).length;

  // Average reading speed: 200-250 words per minute
  // We use 200 to be conservative
  const minutes = Math.ceil(words / 200);

  return Math.max(1, minutes);
}

/**
 * Synchronous markdown to HTML converter for simple preview use cases
 * Does NOT include syntax highlighting - use renderContent for full rendering
 */
export function markdownToHtmlSync(markdown: string): string {
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
