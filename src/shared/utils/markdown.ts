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
const HTML_IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi;
const IMAGE_SEGMENT_TOKEN_PREFIX = "CODEXIMAGESEGMENT";
const IMAGE_SEGMENT_TOKEN_SUFFIX = "TOKEN";
const IMAGE_SEGMENT_TOKEN_PATTERN = /CODEXIMAGESEGMENT(\d+)TOKEN/g;
const LEGACY_IMAGE_SEGMENT_TOKEN_PATTERN = /@@CODEX\\?_IMAGE\\?_SEGMENT\\?_\d+@@/gi;
const FALLBACK_IMAGE_SEGMENT_TOKEN_PATTERN = /CODEXIMAGESEGMENT\d+TOKEN/g;
const HTML_ENTITY_PATTERN = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;
const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(value: string): string {
  if (!value || !value.includes("&")) {
    return value;
  }

  return value.replace(HTML_ENTITY_PATTERN, (_match, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized in HTML_ENTITY_MAP) {
      return HTML_ENTITY_MAP[normalized];
    }

    if (normalized.startsWith("#x")) {
      const code = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }

    if (normalized.startsWith("#")) {
      const code = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }

    return "";
  });
}

function getHtmlAttribute(tag: string, attrName: string): string | null {
  const escapedName = attrName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const doubleQuoteRegex = new RegExp(`${escapedName}\\s*=\\s*\"([^\"]*)\"`, "i");
  const singleQuoteRegex = new RegExp(`${escapedName}\\s*=\\s*'([^']*)'`, "i");

  const doubleQuoteMatch = tag.match(doubleQuoteRegex);
  if (doubleQuoteMatch?.[1] !== undefined) {
    return doubleQuoteMatch[1];
  }

  const singleQuoteMatch = tag.match(singleQuoteRegex);
  if (singleQuoteMatch?.[1] !== undefined) {
    return singleQuoteMatch[1];
  }

  return null;
}

function escapeMarkdownImageAlt(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\]/g, "\\]")
    .replace(/\r?\n/g, " ");
}

function escapeMarkdownImageSrc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\)/g, "\\)");
}

function escapeMarkdownImageTitle(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, " ");
}

function toMarkdownImageTag(imageTag: string): string {
  const rawSrc = getHtmlAttribute(imageTag, "src");
  if (!rawSrc) {
    return "";
  }

  const rawAlt = getHtmlAttribute(imageTag, "alt") ?? "";
  const rawTitle = getHtmlAttribute(imageTag, "title") ?? "";

  const src = escapeMarkdownImageSrc(decodeHtmlEntities(rawSrc).trim());
  const alt = escapeMarkdownImageAlt(decodeHtmlEntities(rawAlt).trim());
  const title = escapeMarkdownImageTitle(decodeHtmlEntities(rawTitle).trim());

  if (!src) {
    return "";
  }

  return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
}

function protectImageSegments(input: string): {
  content: string;
  restore: (value: string) => string;
} {
  const imageSegments: string[] = [];

  const tokenized = input.replace(HTML_IMAGE_TAG_PATTERN, (imageTag) => {
    const markdownImage = toMarkdownImageTag(imageTag);
    if (!markdownImage) {
      return "";
    }

    const index = imageSegments.push(markdownImage) - 1;
    return `${IMAGE_SEGMENT_TOKEN_PREFIX}${index}${IMAGE_SEGMENT_TOKEN_SUFFIX}`;
  });

  return {
    content: tokenized,
    restore: (value: string) =>
      value.replace(IMAGE_SEGMENT_TOKEN_PATTERN, (_match, rawIndex) => {
        const index = Number(rawIndex);
        return Number.isNaN(index) ? "" : (imageSegments[index] ?? "");
      }),
  };
}

function enforceImageTokenBlockBoundaries(value: string): string {
  return value
    .replace(FALLBACK_IMAGE_SEGMENT_TOKEN_PATTERN, "\n\n$&\n\n")
    .replace(/\n{3,}/g, "\n\n");
}

function normalizeEducationalListFormatting(markdown: string): string {
  const topLevelOrderedPattern = /^\s{0,3}\d+\.\s+/;
  const indentedAlphaPattern = /^\s{1,4}(?:\([A-Za-z]\)|[A-Za-z]\))\s+/;
  const indentedBulletPattern = /^\s{1,4}[-*+]\s+/;
  const indentedContentPattern = /^\s{1,4}\S/;
  const headingPattern = /^\s{0,3}#{1,6}\s+/;

  const lines = markdown.split("\n");
  const rewrittenLines: string[] = [];
  let insideTopLevelOrderedItem = false;

  for (const line of lines) {
    const trimmedLine = line.trimEnd();
    const compactLine = trimmedLine.trim();

    if (topLevelOrderedPattern.test(trimmedLine)) {
      insideTopLevelOrderedItem = true;
      rewrittenLines.push(trimmedLine);
      continue;
    }

    if (!insideTopLevelOrderedItem) {
      rewrittenLines.push(trimmedLine);
      continue;
    }

    if (compactLine === "") {
      rewrittenLines.push("");
      continue;
    }

    if (headingPattern.test(trimmedLine)) {
      insideTopLevelOrderedItem = false;
      rewrittenLines.push(trimmedLine);
      continue;
    }

    if (indentedAlphaPattern.test(trimmedLine)) {
      rewrittenLines.push(`    ${compactLine}`);
      continue;
    }

    if (indentedBulletPattern.test(trimmedLine)) {
      if (rewrittenLines[rewrittenLines.length - 1]?.trim()) {
        rewrittenLines.push("");
      }
      rewrittenLines.push(`    ${compactLine}`);
      continue;
    }

    if (indentedContentPattern.test(trimmedLine)) {
      rewrittenLines.push(`    ${compactLine}`);
      continue;
    }

    insideTopLevelOrderedItem = false;
    rewrittenLines.push(trimmedLine);
  }

  return rewrittenLines.join("\n");
}

function escapeAnswerBlanks(markdown: string): string {
  return markdown.replace(/_{5,}/g, (match) => match.split("").map(() => "\\_").join(""));
}

function normalizeMultipleChoiceOptions(markdown: string): string {
  const optionRegex = /(?:\(([A-Ea-e])\)|\b([A-Ea-e])\))\s+/g;
  const questionPrefixRegex = /^\s*(?:\d+[\).:-]|[-*])\s+/;

  const lines = markdown.split("\n");
  const rewrittenLines = lines.map((line) => {
    const matches = [...line.matchAll(optionRegex)];
    if (matches.length === 0) {
      return line;
    }

    // Reformat inline options: "Pergunta ... (A) ... (B) ..." -> one option per line.
    if (matches.length >= 2) {
      const first = matches[0];
      if (first.index === null) {
        return line;
      }

      const questionPart = line.slice(0, first.index).trimEnd();
      if (!questionPart || !questionPrefixRegex.test(questionPart)) {
        return line;
      }

      const options: string[] = [];
      for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const start = current.index;
        if (start === null) continue;
        const end = start + current[0].length;
        const nextStart = matches[i + 1]?.index ?? line.length;
        const optionText = line.slice(end, nextStart).trim();
        const optionLabel = (current[1] ?? current[2] ?? "").toUpperCase();
        if (!optionText) continue;
        options.push(`(${optionLabel}) ${optionText}`);
      }

      if (options.length === 0) {
        return line;
      }

      return `${questionPart}\n${options.join("\n")}`;
    }

    return line;
  });

  // Force markdown hard line-breaks before option lines so renderers never collapse them.
  return rewrittenLines
    .join("\n")
    .replace(/\n(\s*(?:\([A-Ea-e]\)|[A-Ea-e]\))\s+)/g, "  \n$1");
}

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
    const cleanMarkdown = escapeAnswerBlanks(
      normalizeMultipleChoiceOptions(
        normalizeEducationalListFormatting(codeProtected.content)
      )
    )
      // Remove any leaked internal image placeholder tokens from older buggy serializations.
      .replace(LEGACY_IMAGE_SEGMENT_TOKEN_PATTERN, "")
      .replace(FALLBACK_IMAGE_SEGMENT_TOKEN_PATTERN, "")
      // Remove invisible characters that can break markdown parsing (e.g., headings)
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
      // Ensure markdown headings have a space after #'s so all parsers render them consistently.
      .replace(/(^|\n)(\s{0,3}#{1,6})([^\s#])/g, "$1$2 $3")
      // Convert non-standard checkbox format ( ) to standard [ ]
      .replace(/- \( \)/g, "- [ ]")
      .replace(/- \(x\)/gi, "- [x]")
      // Remove plain markdown separators that should not render as literal syntax in the editor.
      .replace(/^\s*([-*_])(?:\s*\1){2,}\s*$/gm, "")
      // Normalize trailing spaces
      .replace(/[ \t]+\n/g, (match) => {
        const whitespace = match.slice(0, -1);
        return whitespace === "  " ? match : "\n";
      })
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
    const imageProtected = protectImageSegments(htmlProtected.content);

    // Pre-process HTML for better conversion
    const cleanHtml = enforceImageTokenBlockBoundaries(
      imageProtected.content
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Normalize repeated spaces/tabs without collapsing newlines
      .replace(/[ \t]{2,}/g, " ")
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
      .trim()
    );
    const restoredHtml = htmlProtected.restore(cleanHtml);

    // Convert HTML to markdown
    let markdown = converter.makeMarkdown(restoredHtml);
    const markdownProtected = protectSegments(markdown, MARKDOWN_CODE_FENCE_PATTERN);

    // Post-process markdown for consistency
    markdown = enforceImageTokenBlockBoundaries(
      markdownProtected.content
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
        "$1\n\n",
      )
      .trim()
    );
    markdown = markdownProtected.restore(markdown);
    markdown = imageProtected.restore(markdown);
    markdown = markdown
      // Safety net: never persist leaked internal image tokens.
      .replace(LEGACY_IMAGE_SEGMENT_TOKEN_PATTERN, "")
      .replace(FALLBACK_IMAGE_SEGMENT_TOKEN_PATTERN, "");

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
