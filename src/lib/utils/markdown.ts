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

/**
 * Convert markdown to HTML using showdown.js
 * Optimized for TipTap rich text editor
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === "") {
    return "";
  }

  try {
    // Clean input markdown
    const cleanMarkdown = markdown
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive newlines while preserving intentional breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Convert markdown to HTML
    let html = converter.makeHtml(cleanMarkdown);

    // Post-process HTML for better TipTap compatibility
    html = html
      // Ensure paragraphs have proper spacing
      .replace(/<\/p>\s*<p>/g, "</p><p>")
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, "")
      // Ensure lists are properly formatted
      .replace(/<\/li>\s*<li>/g, "</li><li>")
      // Clean up excessive whitespace
      .replace(/\s+/g, " ")
      .trim();

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
    // Pre-process HTML for better conversion
    const cleanHtml = html
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Remove TipTap-specific attributes and classes
      .replace(/\s*class="[^"]*"/g, "")
      .replace(/\s*data-[^=]*="[^"]*"/g, "")
      .replace(/\s*style="[^"]*"/g, "")
      // Clean up empty elements
      .replace(/<(\w+)>\s*<\/\1>/g, "")
      // Normalize paragraph spacing
      .replace(/\s*<\/p>\s*<p>\s*/g, "</p>\n<p>")
      .trim();

    // Convert HTML to markdown
    let markdown = converter.makeMarkdown(cleanHtml);

    // Post-process markdown for consistency
    markdown = markdown
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
