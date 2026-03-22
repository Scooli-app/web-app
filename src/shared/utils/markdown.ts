import * as showdown from "showdown";

// Configure showdown converter with appropriate options for TipTap
const converterOptions: showdown.ConverterOptions = {
  headerLevelStart: 1,
  simplifiedAutoLink: true,
  excludeTrailingPunctuationFromURLs: true,
  literalMidWordUnderscores: true,
  strikethrough: true,
  tables: true,
  ghCodeBlocks: true,
  tasklists: true,
  flavor: "github",
  simpleLineBreaks: false,
  requireSpaceBeforeHeadingText: false,
  encodeEmails: true,
  openLinksInNewWindow: false,
  backslashEscapesHTMLTags: false,
  emoji: false,
  underline: false,
  completeHTMLDocument: false,
  metadata: false,
  splitAdjacentBlockquotes: false,
};

// Create showdown converter instance
const converter = new showdown.Converter(converterOptions);
const MARKDOWN_CODE_FENCE_PATTERN = /```[\s\S]*?```/g;
const HTML_PRE_BLOCK_PATTERN = /<pre[\s\S]*?<\/pre>/gi;

/**
 * Convert markdown to HTML using showdown.js
 * Optimized for TipTap rich text editor
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === "") {
    return "";
  }

  try {
    const codeProtected = protectSegments(
      markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
      MARKDOWN_CODE_FENCE_PATTERN
    );

    // Clean input markdown
    const cleanMarkdown = codeProtected.content
      // Remove invisible characters that can break markdown parsing (e.g., headings)
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      // Convert non-standard checkbox format ( ) to standard [ ]
      .replace(/- \( \)/g, "- [ ]")
      .replace(/- \(x\)/gi, "- [x]")
      // Normalize trailing spaces
      .replace(/[ \t]+\n/g, "\n")
      // Remove excessive newlines while preserving intentional breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const restoredMarkdown = codeProtected.restore(cleanMarkdown);

    // Convert markdown to HTML
    let html = converter.makeHtml(restoredMarkdown);

    const htmlProtected = protectSegments(html, HTML_PRE_BLOCK_PATTERN);

    // Post-process HTML for better TipTap compatibility
    html = htmlProtected.content
      // Ensure paragraphs have proper spacing
      .replace(/<\/p>\s*<p>/g, "</p><p>")
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, "")
      // Ensure lists are properly formatted
      .replace(/<\/li>\s*<li>/g, "</li><li>")
      // Remove layout-only whitespace between tags
      .replace(/>\s+</g, "><")
      // Collapse repeated spaces/tabs outside code blocks
      .replace(/[ \t]{2,}/g, " ")
      .trim();
    html = htmlProtected.restore(html);

    return html;
  } catch (error) {
    console.error("Error converting markdown to HTML:", error);
    // Fallback: return the original markdown wrapped in a paragraph
    return `<p>${markdown.replace(/\n/g, "<br>")}</p>`;
  }
}

/**
 * Convert HTML to markdown using showdown.js
 * Optimized for TipTap rich text editor output
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === "") {
    return "";
  }

  try {
    const htmlProtected = protectSegments(html, HTML_PRE_BLOCK_PATTERN);

    // Pre-process HTML for better conversion
    const cleanHtml = htmlProtected.content
      // Remove TipTap-specific attributes and classes
      .replace(/\s*class="[^"]*"/g, "")
      .replace(/\s*data-[^=]*="[^"]*"/g, "")
      .replace(/\s*style="[^"]*"/g, "")
      // Clean up empty elements
      .replace(/<(\w+)>\s*<\/\1>/g, "")
      // Normalize paragraph spacing
      .replace(/\s*<\/p>\s*<p>\s*/g, "</p>\n<p>")
      // Remove layout-only whitespace between tags
      .replace(/>\s+</g, "><")
      .trim();
    const restoredHtml = htmlProtected.restore(cleanHtml);

    // Convert HTML to markdown
    let markdown = converter.makeMarkdown(restoredHtml);
    const markdownProtected = protectSegments(markdown, MARKDOWN_CODE_FENCE_PATTERN);

    // Post-process markdown for consistency
    markdown = markdownProtected.content
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Clean up excessive newlines
      .replace(/\n{3,}/g, "\n\n")
      // Ensure proper spacing around headers
      .replace(/\n(#{1,6}\s)/g, "\n\n$1")
      .replace(/(#{1,6}\s.*)\n(?!\n)/g, "$1\n\n")
      // Ensure proper spacing around lists
      .replace(/\n(\s*[\*\-\+]|\s*\d+\.)/g, "\n\n$1")
      .replace(
        /((\s*[\*\-\+]|\s*\d+\.).*)\n(?!\n|\s*[\*\-\+]|\s*\d+\.)/g,
        "$1\n\n"
      )
      .trim();
    markdown = markdownProtected.restore(markdown);

    return markdown;
  } catch (error) {
    console.error("Error converting HTML to markdown:", error);
    // Fallback: strip HTML tags and return plain text
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

/**
 * Sanitize markdown for safe rendering
 * Removes potentially harmful content while preserving formatting
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) {
    return "";
  }

  return (
    markdown
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      // Remove on* event handlers
      .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "")
      // Remove javascript: links
      .replace(/javascript:/gi, "")
      // Remove data: URLs (except images)
      .replace(/data:(?!image\/)/gi, "")
      .trim()
  );
}

/**
 * Get plain text from markdown
 * Useful for previews and search
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) {
    return "";
  }

  try {
    // Convert to HTML first, then strip tags
    const html = markdownToHtml(markdown);
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  } catch (error) {
    console.error("Error converting markdown to plain text:", error);
    return markdown
      .replace(/[#*_`~\[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

/**
 * Check if content is valid markdown
 */
export function isValidMarkdown(content: string): boolean {
  if (!content) {
    return true; // Empty content is valid
  }

  try {
    markdownToHtml(content);
    return true;
  } catch (_error) {
    return false;
  }
}

function protectSegments(input: string, pattern: RegExp): {
  content: string;
  restore: (value: string) => string;
} {
  const segments: string[] = [];
  const tokenized = input.replace(pattern, (match) => {
    const id = segments.push(match) - 1;
    return `@@CODEX_SEGMENT_${id}@@`;
  });

  return {
    content: tokenized,
    restore: (value: string) =>
      value.replace(/@@CODEX_SEGMENT_(\d+)@@/g, (_match, rawId) => {
        const index = Number(rawId);
        return Number.isNaN(index) ? "" : (segments[index] ?? "");
      }),
  };
}
