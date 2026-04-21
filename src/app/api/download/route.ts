import { getPostHogClient } from "@/lib/posthog-server";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { auth } from "@clerk/nextjs/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { PDFDocument, type PDFFont, rgb, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

type DownloadFormat = "pdf" | "docx";

interface DownloadImagePayload {
  id: string;
  url?: string | null;
  alt?: string;
  status?: string;
  contentType?: string | null;
  placeholderToken?: string | null;
}

interface DownloadRequestBody {
  title: string;
  content: string;
  format: DownloadFormat;
  images?: DownloadImagePayload[];
}

interface CurrentEntitlementResponse {
  isPro?: boolean;
}

type TextBlockType =
  | "title"
  | "h1"
  | "h2"
  | "h3"
  | "paragraph"
  | "bullet"
  | "numbered"
  | "quote"
  | "code"
  | "empty";

type ExportBlock =
  | { type: TextBlockType; text: string }
  | { type: "image"; alt: string; source: string };

interface ResolvedImage {
  alt: string;
  bytes?: Buffer;
  contentType?: string | null;
  width: number;
  height: number;
  error?: string;
}

const IMAGE_REFERENCE_TOKEN_PATTERN = /^\{\{(?:DOCUMENT_IMAGE|IMAGE_PLACEHOLDER):([^}]+)\}\}$/;
const MARKDOWN_IMAGE_LINE_PATTERN = /^!\[(.*?)\]\((.+?)\)\s*$/;
const MARKDOWN_IMAGE_PREFIX_PATTERN = /^!\[(.*?)\]\((.+?)\)\s*(.*)$/;
const HTML_IMAGE_LINE_PATTERN = /^<img\b[^>]*>$/i;
const DATA_URI_PATTERN = /^data:([^;]+);base64,(.+)$/;
const HTML_COMMENT_PATTERN = /<!--(?:[\s\S]*?-->|[\s\S]*)/g;
const HTML_BREAK_PATTERN = /<br\s*\/?>/gi;
const HTML_PARAGRAPH_OPEN_PATTERN = /<p\b[^>]*>/gi;
const HTML_PARAGRAPH_CLOSE_PATTERN = /<\/p>/gi;
const ESCAPED_ANSWER_BLANK_PATTERN = /(?:\\_){3,}/g;
const ANSWER_BLANK_PATTERN = /_{3,}/g;
const ANSWER_BLANK_TOKEN_PATTERN = /@@EXPORTBLANK(\d+)@@/g;
const BLOCK_MATH_PATTERN = /\$\$([^$]+)\$\$/g;
const INLINE_MATH_PATTERN = /\$([^$\n]+)\$/g;

/**
 * Convert a LaTeX expression to readable plain text for PDF/DOCX export.
 * Not a full renderer — handles the most common patterns teachers encounter.
 */
function latexToText(latex: string): string {
  let text = latex.trim();

  // Fractions: \frac{a}{b} → a/b (handle nested by iterating)
  for (let i = 0; i < 6; i++) {
    const before = text;
    text = text.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, "($1)/($2)");
    if (text === before) break;
  }

  // Square root: \sqrt{x} → √(x)
  text = text.replace(/\\sqrt\s*\{([^{}]+)\}/g, "√($1)");
  text = text.replace(/\\sqrt\s+(\S+)/g, "√$1");

  // Superscripts: ^{2} → ², ^2 → ²
  const superMap: Record<string, string> = {
    "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
    "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
    "n": "ⁿ", "+": "⁺", "-": "⁻",
  };
  text = text.replace(/\^\{([^{}]+)\}/g, (_m, exp) => {
    if ([...exp].every(c => superMap[c])) return [...exp].map(c => superMap[c]).join("");
    return `^(${exp})`;
  });
  text = text.replace(/\^([0-9n])/g, (_m, c) => superMap[c] ?? `^${c}`);

  // Subscripts: _{n} → just the inner text (subscripts don't map to unicode cleanly)
  text = text.replace(/\_\{([^{}]+)\}/g, "_$1");

  // Greek letters
  const greek: Record<string, string> = {
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
    zeta: "ζ", eta: "η", theta: "θ", lambda: "λ", mu: "μ",
    nu: "ν", xi: "ξ", pi: "π", rho: "ρ", sigma: "σ",
    tau: "τ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
    Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Theta: "Θ",
    Lambda: "Λ", Pi: "Π", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
  };
  text = text.replace(/\\([a-zA-Z]+)/g, (_m, name) => greek[name] ?? (
    ({ times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓",
       neq: "≠", leq: "≤", geq: "≥", approx: "≈", equiv: "≡",
       infty: "∞", in: "∈", notin: "∉", subset: "⊂", cup: "∪",
       cap: "∩", forall: "∀", exists: "∃", neg: "¬", land: "∧",
       lor: "∨", rightarrow: "→", leftarrow: "←", Rightarrow: "⇒",
       Leftrightarrow: "⇔", ldots: "…", cdots: "…",
       left: "", right: "", text: "", quad: " ", qquad: "  ",
     } as Record<string, string>)[name] ?? `\\${name}`
  ));

  // Strip remaining LaTeX grouping braces
  text = text.replace(/\{([^{}]*)\}/g, "$1");
  // Strip leftover backslashes before punctuation
  text = text.replace(/\\([{}%,;:])/g, "$1");

  // Normalise whitespace
  return text.replace(/\s{2,}/g, " ").trim();
}

/**
 * Replace $...$ and $$...$$ in a line with plain-text equivalents.
 */
function convertMathToText(text: string): string {
  return text
    .replace(BLOCK_MATH_PATTERN, (_m, latex) => latexToText(latex))
    .replace(INLINE_MATH_PATTERN, (_m, latex) => latexToText(latex));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

async function captureDownloadEvent(
  distinctId: string,
  format: DownloadFormat,
  title: string,
): Promise<void> {
  const posthog = getPostHogClient();
  if (!posthog) {
    return;
  }

  try {
    posthog.capture({
      distinctId,
      event: "document_downloaded",
      properties: { format, document_title: title },
    });
    await posthog.shutdown();
  } catch (error) {
    console.error("PostHog capture failed in download route:", error);
  }
}

async function resolveIsProUser(): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
  if (!baseUrl) {
    return false;
  }

  try {
    const authContext = await auth();
    const template = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;
    const token = await authContext.getToken(
      template ? { template } : undefined,
    );
    if (!token) {
      return false;
    }

    const response = await fetch(`${baseUrl}/entitlements/current`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return false;
    }

    const entitlement =
      (await response.json()) as CurrentEntitlementResponse | null;

    return entitlement?.isPro === true;
  } catch (error) {
    console.warn("Failed to resolve entitlements for download:", error);
    return false;
  }
}

function normalizeContentType(contentType?: string | null): string | null {
  if (!contentType) {
    return null;
  }
  const normalized = contentType.split(";")[0].trim().toLowerCase();
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }
  return normalized;
}

function detectImageContentType(bytes: Buffer): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  return null;
}

function getImageDimensions(
  bytes: Buffer,
  contentType?: string | null,
): { width: number; height: number } | null {
  const normalizedContentType = normalizeContentType(contentType) ?? detectImageContentType(bytes);

  if (normalizedContentType === "image/png" && bytes.length >= 24) {
    return {
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  }

  if (normalizedContentType === "image/jpeg") {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }

      const marker = bytes[offset + 1];
      offset += 2;

      if (marker === 0xd8 || marker === 0x01) {
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) {
        break;
      }
      if (offset + 1 >= bytes.length) {
        break;
      }

      const segmentLength = bytes.readUInt16BE(offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) {
        break;
      }

      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3,
          0xc5, 0xc6, 0xc7,
          0xc9, 0xca, 0xcb,
          0xcd, 0xce, 0xcf,
        ].includes(marker)
      ) {
        return {
          height: bytes.readUInt16BE(offset + 3),
          width: bytes.readUInt16BE(offset + 5),
        };
      }

      offset += segmentLength;
    }
  }

  return null;
}

function scaleDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxWidth, height: Math.min(maxHeight, maxWidth) };
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function normalizeEscapedAnswerBlanks(text: string): string {
  return text.replace(ESCAPED_ANSWER_BLANK_PATTERN, (match) =>
    "_".repeat(Math.max(1, Math.floor(match.length / 2))),
  );
}

function protectAnswerBlanks(text: string): {
  content: string;
  restore: (value: string) => string;
} {
  const blanks: string[] = [];
  const normalized = normalizeEscapedAnswerBlanks(text);
  const content = normalized.replace(ANSWER_BLANK_PATTERN, (match) => {
    const index = blanks.push(match) - 1;
    return `@@EXPORTBLANK${index}@@`;
  });

  return {
    content,
    restore: (value: string) =>
      value.replace(ANSWER_BLANK_TOKEN_PATTERN, (_match, rawIndex) => {
        const index = Number(rawIndex);
        return Number.isNaN(index) ? "" : (blanks[index] ?? "");
      }),
  };
}

function stripInlineMarkdown(text: string): string {
  const blankProtected = protectAnswerBlanks(convertMathToText(text));
  const withoutMarkdown = blankProtected.content
    .replace(HTML_COMMENT_PATTERN, "")
    .replace(HTML_BREAK_PATTERN, " ")
    .replace(/<[^>]*>?/g, "")
    .replace(/</g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return blankProtected.restore(withoutMarkdown);
}

function normalizeExportContent(content: string): string {
  return normalizeEscapedAnswerBlanks(content)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(HTML_COMMENT_PATTERN, "")
    .replace(HTML_BREAK_PATTERN, "\n")
    .replace(HTML_PARAGRAPH_OPEN_PATTERN, "")
    .replace(HTML_PARAGRAPH_CLOSE_PATTERN, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizePdfLine(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u00E2\u20AC\u00A2/g, "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n")
    .map((line) => normalizePdfLine(line))
    .join("\n");
}

function normalizeImageSource(source: string): string {
  let normalized = source.trim();

  if (normalized.startsWith("<") && normalized.endsWith(">")) {
    normalized = normalized.slice(1, -1).trim();
  }

  const titleMatch = normalized.match(/^(\S+)\s+(?:"[^"]*"|'[^']*')$/);
  if (titleMatch) {
    normalized = titleMatch[1];
  }

  if (/%7B%7B(?:DOCUMENT_IMAGE|IMAGE_PLACEHOLDER):/i.test(normalized)) {
    try {
      normalized = decodeURIComponent(normalized);
    } catch {
      // Keep original source if decoding fails.
    }
  }

  return normalized.replace(/&amp;/g, "&").replace(/\\([{}])/g, "$1");
}

function parseMarkdownImageLine(line: string): { alt: string; source: string } | null {
  const imageMatch = line.match(MARKDOWN_IMAGE_LINE_PATTERN);
  if (!imageMatch) {
    return null;
  }

  return {
    alt: imageMatch[1] ?? "",
    source: normalizeImageSource(imageMatch[2] ?? ""),
  };
}

function parseMarkdownImagePrefix(line: string): {
  alt: string;
  source: string;
  remaining: string;
} | null {
  const imageMatch = line.match(MARKDOWN_IMAGE_PREFIX_PATTERN);
  if (!imageMatch) {
    return null;
  }

  return {
    alt: imageMatch[1] ?? "",
    source: normalizeImageSource(imageMatch[2] ?? ""),
    remaining: (imageMatch[3] ?? "").trimStart(),
  };
}

function parseHtmlImageLine(line: string): { alt: string; source: string } | null {
  if (!HTML_IMAGE_LINE_PATTERN.test(line)) {
    return null;
  }

  const srcMatch = line.match(/\ssrc=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const source = srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? "";
  if (!source) {
    return null;
  }

  const altMatch = line.match(/\salt=(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const alt = altMatch?.[1] ?? altMatch?.[2] ?? altMatch?.[3] ?? "";

  return {
    alt,
    source: normalizeImageSource(source),
  };
}

function parseMarkdownToBlocks(content: string): ExportBlock[] {
  const blocks: ExportBlock[] = [];
  const lines = normalizeExportContent(content).split("\n");
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let isFirstH1 = true;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        blocks.push({ type: "code", text: codeBlockContent.join("\n") });
        codeBlockContent = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    let trimmed = line.trim();
    if (/^([-*_])(?:\s*\1){2,}\s*$/.test(trimmed)) {
      continue;
    }

    const markdownImage = parseMarkdownImagePrefix(trimmed);
    if (markdownImage) {
      blocks.push({
        type: "image",
        alt: markdownImage.alt,
        source: markdownImage.source,
      });
      trimmed = markdownImage.remaining;
      if (!trimmed) {
        continue;
      }
    }

    const markdownImageLine = parseMarkdownImageLine(trimmed);
    if (markdownImageLine) {
      blocks.push({
        type: "image",
        alt: markdownImageLine.alt,
        source: markdownImageLine.source,
      });
      continue;
    }

    const htmlImage = parseHtmlImageLine(trimmed);
    if (htmlImage) {
      blocks.push({
        type: "image",
        alt: htmlImage.alt,
        source: htmlImage.source,
      });
      continue;
    }

    const normalizedTokenCandidate = normalizeImageSource(trimmed);
    if (IMAGE_REFERENCE_TOKEN_PATTERN.test(normalizedTokenCandidate)) {
      blocks.push({
        type: "image",
        alt: "",
        source: normalizedTokenCandidate,
      });
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({
        type: isFirstH1 ? "title" : "h1",
        text: trimmed.substring(2),
      });
      isFirstH1 = false;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.substring(3) });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.substring(4) });
      continue;
    }

    if (trimmed.match(/^[\*\-]\s/)) {
      blocks.push({ type: "bullet", text: trimmed });
      continue;
    }

    if (trimmed.match(/^\d+\.\s/)) {
      blocks.push({ type: "numbered", text: trimmed });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      blocks.push({ type: "quote", text: trimmed.substring(2) });
      continue;
    }

    if (trimmed === "") {
      blocks.push({ type: "empty", text: "" });
      continue;
    }

    blocks.push({ type: "paragraph", text: trimmed });
  }

  if (codeBlockContent.length > 0) {
    blocks.push({ type: "code", text: codeBlockContent.join("\n") });
  }

  return blocks;
}

function buildImageLookup(images?: DownloadImagePayload[]): Map<string, DownloadImagePayload> {
  const imageLookup = new Map<string, DownloadImagePayload>();
  for (const image of images ?? []) {
    if (image.id) {
      imageLookup.set(image.id, image);
    }
    if (image.placeholderToken) {
      imageLookup.set(image.placeholderToken, image);
    }
  }
  return imageLookup;
}

function isInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "::1") return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      a === 0 ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  return false;
}

async function resolveImageBlock(
  block: Extract<ExportBlock, { type: "image" }>,
  imageLookup: Map<string, DownloadImagePayload>,
): Promise<ResolvedImage> {
  let source = normalizeImageSource(block.source);
  let contentType: string | null = null;

  const imageReferenceMatch = source.match(IMAGE_REFERENCE_TOKEN_PATTERN);
  if (imageReferenceMatch) {
    const image = imageLookup.get(imageReferenceMatch[1]);
    if (!image?.url) {
      return {
        alt: block.alt,
        width: 1200,
        height: 900,
        error: "Image URL unavailable",
      };
    }
    source = image.url;
    contentType = normalizeContentType(image.contentType);
  }

  const dataUriMatch = source.match(DATA_URI_PATTERN);
  if (dataUriMatch) {
    const bytes = Buffer.from(dataUriMatch[2], "base64");
    const resolvedContentType = normalizeContentType(dataUriMatch[1]) ?? detectImageContentType(bytes);
    const dimensions = getImageDimensions(bytes, resolvedContentType) ?? {
      width: 1200,
      height: 900,
    };
    return {
      alt: block.alt,
      bytes,
      contentType: resolvedContentType,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  if (!/^https?:\/\//i.test(source)) {
    return {
      alt: block.alt,
      width: 1200,
      height: 900,
      error: "Unsupported image source",
    };
  }

  let parsedSourceUrl: URL;
  try {
    parsedSourceUrl = new URL(source);
  } catch {
    return { alt: block.alt, width: 1200, height: 900, error: "Invalid image URL" };
  }
  if (isInternalHost(parsedSourceUrl.hostname)) {
    return { alt: block.alt, width: 1200, height: 900, error: "Private image URLs are not allowed" };
  }

  // Require a valid public FQDN — blocks bare IPs, localhost variants, and malformed hosts
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(parsedSourceUrl.hostname)) {
    return { alt: block.alt, width: 1200, height: 900, error: "Invalid image host" };
  }

  try {
    const response = await fetch(parsedSourceUrl.href, { cache: "no-store" });
    if (!response.ok) {
      return {
        alt: block.alt,
        width: 1200,
        height: 900,
        error: `Image request failed (${response.status})`,
      };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const resolvedContentType =
      normalizeContentType(response.headers.get("content-type")) ??
      contentType ??
      detectImageContentType(bytes);

    if (!resolvedContentType || !["image/png", "image/jpeg"].includes(resolvedContentType)) {
      return {
        alt: block.alt,
        width: 1200,
        height: 900,
        error: "Unsupported image format",
      };
    }

    const dimensions = getImageDimensions(bytes, resolvedContentType) ?? {
      width: 1200,
      height: 900,
    };

    return {
      alt: block.alt,
      bytes,
      contentType: resolvedContentType,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.error("Failed to fetch image for export:", error);
    return {
      alt: block.alt,
      width: 1200,
      height: 900,
      error: "Image fetch failed",
    };
  }
}

function parseInlineFormatting(
  text: string,
  baseSize: number = 22,
): InstanceType<typeof TextRun>[] {
  const runs: InstanceType<typeof TextRun>[] = [];
  const blankProtected = protectAnswerBlanks(text);
  let remaining = blankProtected.content;
  let match;

  while (remaining.length > 0) {
    if ((match = remaining.match(/^\*\*(.+?)\*\*/))) {
      runs.push(new TextRun({ text: blankProtected.restore(match[1]), bold: true, size: baseSize }));
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^[\*_](.+?)[\*_]/))) {
      runs.push(new TextRun({ text: blankProtected.restore(match[1]), italics: true, size: baseSize }));
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^`(.+?)`/))) {
      runs.push(
        new TextRun({
          text: blankProtected.restore(match[1]),
          font: "Courier New",
          size: baseSize - 2,
        }),
      );
      remaining = remaining.substring(match[0].length);
      continue;
    }

    const nextSpecial = remaining.search(/[\*_`]/);
    if (nextSpecial === -1) {
      runs.push(new TextRun({ text: blankProtected.restore(remaining), size: baseSize }));
      break;
    }
    if (nextSpecial > 0) {
      runs.push(
        new TextRun({
          text: blankProtected.restore(remaining.substring(0, nextSpecial)),
          size: baseSize,
        }),
      );
      remaining = remaining.substring(nextSpecial);
      continue;
    }

    runs.push(new TextRun({ text: blankProtected.restore(remaining[0]), size: baseSize }));
    remaining = remaining.substring(1);
  }

  return runs.length > 0
    ? runs
    : [new TextRun({ text: blankProtected.restore(blankProtected.content), size: baseSize })];
}

async function generateDocx(
  content: string,
  images?: DownloadImagePayload[],
): Promise<Buffer> {
  const blocks = parseMarkdownToBlocks(content);
  const imageLookup = buildImageLookup(images);
  const children: InstanceType<typeof Paragraph>[] = [];

  let isFirstTitle = true;

  for (const block of blocks) {
    if (block.type === "image") {
      const resolvedImage = await resolveImageBlock(block, imageLookup);
      if (resolvedImage.bytes && resolvedImage.contentType) {
        const size = scaleDimensions(
          resolvedImage.width,
          resolvedImage.height,
          520,
          360,
        );
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: resolvedImage.bytes,
                type: resolvedImage.contentType === "image/png" ? "png" : "jpg",
                transformation: size,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 220, after: 120 },
          }),
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Imagem: ${block.alt || "Ilustracao"}]`,
                italics: true,
                size: 20,
                color: "6C6F80",
              }),
            ],
            spacing: { before: 200, after: 200 },
          }),
        );
      }
      continue;
    }

    switch (block.type) {
      case "title":
        if (isFirstTitle) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: stripInlineMarkdown(block.text),
                  bold: true,
                  size: 48,
                  color: "0B0D17",
                }),
              ],
              heading: HeadingLevel.TITLE,
              spacing: { after: 120 },
            }),
          );
          children.push(
            new Paragraph({
              border: {
                bottom: {
                  color: "6753FF",
                  size: 24,
                  style: BorderStyle.SINGLE,
                  space: 1,
                },
              },
              spacing: { after: 400 },
            }),
          );
          isFirstTitle = false;
        } else {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: stripInlineMarkdown(block.text),
                  bold: true,
                  size: 36,
                  color: "0B0D17",
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
          );
        }
        break;
      case "h1":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: stripInlineMarkdown(block.text),
                bold: true,
                size: 36,
                color: "0B0D17",
              }),
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
        );
        break;
      case "h2":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: stripInlineMarkdown(block.text),
                bold: true,
                size: 28,
                color: "0B0D17",
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
        );
        break;
      case "h3":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: stripInlineMarkdown(block.text),
                bold: true,
                size: 24,
                color: "2E2F38",
              }),
            ],
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          }),
        );
        break;
      case "bullet":
        children.push(
          new Paragraph({
            children: parseInlineFormatting(
              block.text.replace(/^[\*\-]\s/, ""),
              22,
            ),
            bullet: { level: 0 },
            spacing: { after: 80 },
          }),
        );
        break;
      case "numbered":
        children.push(
          new Paragraph({
            children: parseInlineFormatting(
              block.text.replace(/^\d+\.\s/, ""),
              22,
            ),
            numbering: { reference: "default-numbering", level: 0 },
            spacing: { after: 80 },
          }),
        );
        break;
      case "quote":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: stripInlineMarkdown(block.text),
                italics: true,
                size: 22,
                color: "6C6F80",
              }),
            ],
            indent: { left: 720 },
            border: {
              left: {
                color: "6753FF",
                size: 18,
                style: BorderStyle.SINGLE,
                space: 10,
              },
            },
            spacing: { before: 200, after: 200 },
          }),
        );
        break;
      case "code":
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: block.text,
                font: "Courier New",
                size: 20,
              }),
            ],
            shading: { fill: "F4F5F8" },
            spacing: { before: 200, after: 200 },
          }),
        );
        break;
      case "empty":
        children.push(new Paragraph({ children: [], spacing: { after: 120 } }));
        break;
      case "paragraph":
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.text, 22),
            spacing: { after: 160, line: 276 },
          }),
        );
        break;
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal" as const,
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

async function generatePdf(
  content: string,
  images?: DownloadImagePayload[],
  isProUser: boolean = false,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  const blocks = parseMarkdownToBlocks(content);
  const imageLookup = buildImageLookup(images);

  const fontSizes: Record<TextBlockType, number> = {
    title: 24,
    h1: 18,
    h2: 16,
    h3: 14,
    paragraph: 11,
    bullet: 11,
    numbered: 11,
    quote: 11,
    code: 10,
    empty: 11,
  };

  const lineHeights: Record<TextBlockType, number> = {
    title: 32,
    h1: 28,
    h2: 24,
    h3: 20,
    paragraph: 16,
    bullet: 16,
    numbered: 16,
    quote: 16,
    code: 14,
    empty: 12,
  };

  const colors: Record<TextBlockType, ReturnType<typeof rgb>> = {
    title: rgb(0.04, 0.05, 0.09),
    h1: rgb(0.04, 0.05, 0.09),
    h2: rgb(0.04, 0.05, 0.09),
    h3: rgb(0.18, 0.18, 0.22),
    paragraph: rgb(0.18, 0.18, 0.22),
    bullet: rgb(0.18, 0.18, 0.22),
    numbered: rgb(0.18, 0.18, 0.22),
    quote: rgb(0.42, 0.43, 0.5),
    code: rgb(0.18, 0.18, 0.22),
    empty: rgb(0, 0, 0),
  };

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  function ensureSpace(requiredHeight: number) {
    if (yPosition < margin + requiredHeight) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  }

  function wrapText(
    text: string,
    maxWidth: number,
    font: PDFFont,
    fontSize: number,
  ): string[] {
    const lines: string[] = [];
    const paragraphs = normalizePdfText(text).split("\n");

    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        lines.push("");
        continue;
      }

      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }
    return lines.length > 0 ? lines : [""];
  }

  function wrapCodeText(
    text: string,
    maxWidth: number,
    font: PDFFont,
    fontSize: number,
  ): string[] {
    const lines: string[] = [];
    const rawLines = normalizePdfText(text).split("\n");

    for (const rawLine of rawLines) {
      if (rawLine.length === 0) {
        lines.push("");
        continue;
      }

      let currentLine = "";
      for (const character of rawLine) {
        const testLine = `${currentLine}${character}`;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = character === " " ? "" : character;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
    }
    return lines.length > 0 ? lines : [""];
  }

  function drawTextBlock(block: Extract<ExportBlock, { type: TextBlockType }>) {
    if (block.type === "empty") {
      yPosition -= lineHeights.empty;
      ensureSpace(lineHeights.empty);
      return;
    }

    const fontSize = fontSizes[block.type];
    const lineHeight = lineHeights[block.type];
    const color = colors[block.type];

    let font: PDFFont = helvetica;
    if (["title", "h1", "h2", "h3"].includes(block.type)) {
      font = helveticaBold;
    } else if (block.type === "quote") {
      font = helveticaOblique;
    } else if (block.type === "code") {
      font = courier;
    }

    let displayText = stripInlineMarkdown(block.text);
    if (block.type === "bullet") {
      displayText = `• ${stripInlineMarkdown(block.text.replace(/^[\*\-]\s/, ""))}`;
    } else if (block.type === "numbered") {
      displayText = stripInlineMarkdown(block.text);
    }
    displayText = normalizePdfText(displayText);

    const indent =
      block.type === "bullet" || block.type === "numbered"
        ? 20
        : block.type === "quote"
          ? 30
          : block.type === "code"
            ? 20
            : 0;

    const wrappedLines =
      block.type === "code"
        ? wrapCodeText(displayText, contentWidth - indent, font, fontSize)
        : wrapText(displayText, contentWidth - indent, font, fontSize);

    if (["h1", "h2", "h3"].includes(block.type)) {
      yPosition -= 10;
    }

    ensureSpace(wrappedLines.length * lineHeight + 20);

    for (const wrappedLine of wrappedLines) {
      ensureSpace(lineHeight + 10);
      const safeLine = normalizePdfLine(wrappedLine);
      currentPage.drawText(safeLine, {
        x: margin + indent,
        y: yPosition,
        size: fontSize,
        font,
        color,
      });
      yPosition -= lineHeight;
    }

    if (block.type === "title") {
      currentPage.drawLine({
        start: { x: margin, y: yPosition + 8 },
        end: { x: margin + 150, y: yPosition + 8 },
        thickness: 2,
        color: rgb(0.4, 0.33, 1),
      });
      yPosition -= 15;
    }
  }

  for (const block of blocks) {
    if (block.type !== "image") {
      drawTextBlock(block);
      continue;
    }

    const resolvedImage = await resolveImageBlock(block, imageLookup);
    if (resolvedImage.bytes && resolvedImage.contentType) {
      const embeddedImage =
        resolvedImage.contentType === "image/png"
          ? await pdfDoc.embedPng(resolvedImage.bytes)
          : await pdfDoc.embedJpg(resolvedImage.bytes);
      const size = scaleDimensions(
        embeddedImage.width,
        embeddedImage.height,
        contentWidth,
        280,
      );

      ensureSpace(size.height + 40);
      currentPage.drawImage(embeddedImage, {
        x: margin + (contentWidth - size.width) / 2,
        y: yPosition - size.height,
        width: size.width,
        height: size.height,
      });
      yPosition -= size.height + 20;
      continue;
    }

    drawTextBlock({
      type: "quote",
      text: `[Imagem: ${block.alt || "Ilustracao"}]`,
    });
  }

  if (!isProUser) {
    let watermarkLogo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null =
      null;
    try {
      const logoPath = join(process.cwd(), "public", "logo-transparent.png");
      const logoBytes = await readFile(logoPath);
      watermarkLogo = await pdfDoc.embedPng(logoBytes);
    } catch (error) {
      console.warn("Failed to load logo watermark for PDF export:", error);
    }

    const footerText = "Gerado em scooli.app";
    for (const page of pdfDoc.getPages()) {
      page.drawText(footerText, {
        x: margin,
        y: 25,
        size: 9,
        font: helvetica,
        color: rgb(0.42, 0.43, 0.5),
      });

      if (watermarkLogo) {
        const watermarkSize = scaleDimensions(
          watermarkLogo.width,
          watermarkLogo.height,
          pageWidth * 0.5,
          pageHeight * 0.22,
        );

        page.drawImage(watermarkLogo, {
          x: (pageWidth - watermarkSize.width) / 2,
          y: (pageHeight - watermarkSize.height) / 2,
          width: watermarkSize.width,
          height: watermarkSize.height,
          opacity: 0.14,
        });
      }
    }
  }

  return (await pdfDoc.save()) as Uint8Array;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: DownloadRequestBody = await request.json();
    const { title, content, format, images } = body;

    if (!title || !content || !format) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const sanitizedTitle = title
      .replace(/[^a-zA-Z0-9Ã¡Ã Ã¢Ã£Ã©Ã¨ÃªÃ­Ã¯Ã³Ã´ÃµÃ¶ÃºÃ§Ã±ÃÃ€Ã‚ÃƒÃ‰ÃˆÃŠÃÃÃ“Ã”Ã•Ã–ÃšÃ‡Ã‘\s-_]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 100);

    const distinctId =
      request.headers.get("x-posthog-distinct-id") ?? "anonymous";
    const isProUser = await resolveIsProUser();

    if (format === "pdf") {
      const pdfBytes = (await generatePdf(content, images, isProUser)) as Uint8Array;
      await captureDownloadEvent(distinctId, "pdf", title);
      return new NextResponse(toArrayBuffer(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}.pdf"`,
        },
      });
    }

    if (format === "docx") {
      if (!isProUser) {
        return NextResponse.json(
          { error: "Exportacao DOCX disponivel apenas para utilizadores Scooli Pro" },
          { status: 403 },
        );
      }
      const docxBuffer = (await generateDocx(content, images)) as Buffer;
      await captureDownloadEvent(distinctId, "docx", title);
      return new NextResponse(toArrayBuffer(docxBuffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${sanitizedTitle}.docx"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Unsupported format" },
      { status: 400 },
    );
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 },
    );
  }
}
