import { getPostHogClient } from "@/lib/posthog-server";
import { auth } from "@clerk/nextjs/server";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  type ParagraphChild,
  TextRun,
} from "docx";
import katex from "katex";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, type PDFPage, type PDFFont, rgb, StandardFonts } from "pdf-lib";

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

const IMAGE_REFERENCE_TOKEN_PATTERN =
  /^\{\{(?:DOCUMENT_IMAGE|IMAGE_PLACEHOLDER):([^}]+)\}\}$/;
const MARKDOWN_IMAGE_LINE_PATTERN = /^!\[(.*?)\]\((.+?)\)\s*$/;
const MARKDOWN_IMAGE_PREFIX_PATTERN = /^!\[(.*?)\]\((.+?)\)\s*(.*)$/;
const HTML_IMAGE_LINE_PATTERN = /^<img\b[^>]*>$/i;
const DATA_URI_PATTERN = /^data:([^;]+);base64,(.+)$/;
const HTML_COMPLETE_COMMENT_PATTERN = /<!--[\s\S]*?-->/g;
const HTML_INCOMPLETE_COMMENT_PATTERN = /<!--[\s\S]*/g;
const HTML_BREAK_PATTERN = /<br\s*\/?>/gi;
const HTML_PARAGRAPH_OPEN_PATTERN = /<p\b[^>]*>/gi;
const HTML_PARAGRAPH_CLOSE_PATTERN = /<\/p>/gi;
const ESCAPED_ANSWER_BLANK_PATTERN = /(?:\\_){3,}/g;
const ANSWER_BLANK_PATTERN = /_{3,}/g;
const ANSWER_BLANK_TOKEN_PATTERN = /@@EXPORTBLANK(\d+)@@/g;
const BLOCK_MATH_PATTERN = /\$\$([^$]+)\$\$/g;
const INLINE_MATH_PATTERN = /\$([^$\n]+)\$/g;
const MATH_SEGMENT_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
const INLINE_MARKDOWN_SPECIAL_PATTERN = /[\*_`$]/;

type InlineMathSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; displayMode: boolean };

type InlineTextStyle = {
  size: number;
  bold?: boolean;
  italics?: boolean;
  font?: string;
  color?: string;
  noProof?: boolean;
  subScript?: boolean;
  superScript?: boolean;
  parseMath?: boolean;
};

type KatexParseNode = {
  type?: string;
  text?: string;
  body?: unknown;
  base?: unknown;
  sub?: unknown;
  sup?: unknown;
  numer?: unknown;
  denom?: unknown;
  index?: unknown;
  left?: unknown;
  right?: unknown;
  name?: unknown;
  family?: string;
};

type MathTextRenderOptions = {
  unicodeSuperscripts?: boolean;
  unicodeSubscripts?: boolean;
};

const DEFAULT_MATH_TEXT_RENDER_OPTIONS: Required<MathTextRenderOptions> = {
  unicodeSuperscripts: true,
  unicodeSubscripts: true,
};

const LATEX_SYMBOL_MAP: Record<string, string> = {
  "\\alpha": "\u03B1",
  "\\beta": "\u03B2",
  "\\gamma": "\u03B3",
  "\\delta": "\u03B4",
  "\\epsilon": "\u03B5",
  "\\zeta": "\u03B6",
  "\\eta": "\u03B7",
  "\\theta": "\u03B8",
  "\\lambda": "\u03BB",
  "\\mu": "\u03BC",
  "\\nu": "\u03BD",
  "\\xi": "\u03BE",
  "\\pi": "\u03C0",
  "\\rho": "\u03C1",
  "\\sigma": "\u03C3",
  "\\tau": "\u03C4",
  "\\phi": "\u03C6",
  "\\chi": "\u03C7",
  "\\psi": "\u03C8",
  "\\omega": "\u03C9",
  "\\Alpha": "\u0391",
  "\\Beta": "\u0392",
  "\\Gamma": "\u0393",
  "\\Delta": "\u0394",
  "\\Theta": "\u0398",
  "\\Lambda": "\u039B",
  "\\Pi": "\u03A0",
  "\\Sigma": "\u03A3",
  "\\Phi": "\u03A6",
  "\\Omega": "\u03A9",
  "\\pm": "\u00B1",
  "\\mp": "\u2213",
  "\\times": "\u00D7",
  "\\cdot": "\u00B7",
  "\\div": "\u00F7",
  "\\neq": "\u2260",
  "\\ne": "\u2260",
  "\\leq": "\u2264",
  "\\le": "\u2264",
  "\\geq": "\u2265",
  "\\ge": "\u2265",
  "\\approx": "\u2248",
  "\\equiv": "\u2261",
  "\\infty": "\u221E",
  "\\in": "\u2208",
  "\\notin": "\u2209",
  "\\subset": "\u2282",
  "\\subseteq": "\u2286",
  "\\supset": "\u2283",
  "\\supseteq": "\u2287",
  "\\cup": "\u222A",
  "\\cap": "\u2229",
  "\\forall": "\u2200",
  "\\exists": "\u2203",
  "\\neg": "\u00AC",
  "\\land": "\u2227",
  "\\lor": "\u2228",
  "\\rightarrow": "\u2192",
  "\\leftarrow": "\u2190",
  "\\leftrightarrow": "\u2194",
  "\\Rightarrow": "\u21D2",
  "\\Leftarrow": "\u21D0",
  "\\Leftrightarrow": "\u21D4",
  "\\ldots": "\u2026",
  "\\cdots": "\u22EF",
  "\\quad": " ",
  "\\qquad": "  ",
  "\\,": " ",
  "\\!": "",
  "\\%": "%",
  "\\{": "{",
  "\\}": "}",
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  "0": "\u2070",
  "1": "\u00B9",
  "2": "\u00B2",
  "3": "\u00B3",
  "4": "\u2074",
  "5": "\u2075",
  "6": "\u2076",
  "7": "\u2077",
  "8": "\u2078",
  "9": "\u2079",
  "+": "\u207A",
  "-": "\u207B",
  "=": "\u207C",
  "(": "\u207D",
  ")": "\u207E",
  n: "\u207F",
  i: "\u2071",
};

const SUBSCRIPT_MAP: Record<string, string> = {
  "0": "\u2080",
  "1": "\u2081",
  "2": "\u2082",
  "3": "\u2083",
  "4": "\u2084",
  "5": "\u2085",
  "6": "\u2086",
  "7": "\u2087",
  "8": "\u2088",
  "9": "\u2089",
  "+": "\u208A",
  "-": "\u208B",
  "=": "\u208C",
  "(": "\u208D",
  ")": "\u208E",
  a: "\u2090",
  e: "\u2091",
  o: "\u2092",
  x: "\u2093",
  h: "\u2095",
  k: "\u2096",
  l: "\u2097",
  m: "\u2098",
  n: "\u2099",
  p: "\u209A",
  s: "\u209B",
  t: "\u209C",
};

const PDF_FONT_FILE_PATHS = {
  regular: join(
    process.cwd(),
    "node_modules",
    "katex",
    "dist",
    "fonts",
    "KaTeX_Main-Regular.ttf",
  ),
  bold: join(
    process.cwd(),
    "node_modules",
    "katex",
    "dist",
    "fonts",
    "KaTeX_Main-Bold.ttf",
  ),
  italic: join(
    process.cwd(),
    "node_modules",
    "katex",
    "dist",
    "fonts",
    "KaTeX_Main-Italic.ttf",
  ),
  mono: join(
    process.cwd(),
    "node_modules",
    "katex",
    "dist",
    "fonts",
    "KaTeX_Typewriter-Regular.ttf",
  ),
};

function isKatexNode(value: unknown): value is KatexParseNode {
  return typeof value === "object" && value !== null;
}

function toKatexNodeArray(value: unknown): KatexParseNode[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter(isKatexNode);
  }
  return isKatexNode(value) ? [value] : [];
}

function splitMathSegments(text: string): InlineMathSegment[] {
  const segments: InlineMathSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MATH_SEGMENT_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    const blockLatex = match[1];
    const inlineLatex = match[2];
    segments.push({
      type: "math",
      value: (blockLatex ?? inlineLatex ?? "").trim(),
      displayMode: blockLatex !== undefined,
    });

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

const katexParser = katex as typeof katex & {
  __parse?: (expression: string, options?: Record<string, unknown>) => unknown;
};

function parseLatexExpression(latex: string): KatexParseNode[] | null {
  if (typeof katexParser.__parse !== "function") {
    return null;
  }

  try {
    const parsed = katexParser.__parse(latex.trim(), {
      throwOnError: false,
      strict: "ignore",
      trust: false,
    });
    return Array.isArray(parsed) ? parsed.filter(isKatexNode) : null;
  } catch {
    return null;
  }
}

function mathTokenToText(token: string): string {
  if (!token) {
    return "";
  }

  if (LATEX_SYMBOL_MAP[token]) {
    return LATEX_SYMBOL_MAP[token];
  }

  if (token.startsWith("\\")) {
    return token.slice(1);
  }

  return token;
}

function toUnicodeScript(
  text: string,
  map: Record<string, string>,
): string | null {
  let result = "";

  for (const character of text) {
    const mapped = map[character];
    if (!mapped) {
      return null;
    }
    result += mapped;
  }

  return result;
}

function normalizeMathPlainText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?)\]}])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s*([=+\-×÷·±∓≈≡≤≥<>])\s*/g, " $1 ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeMathDelimiter(delimiter: unknown): string {
  if (typeof delimiter !== "string" || delimiter === ".") {
    return "";
  }

  return mathTokenToText(delimiter);
}

function formatLinearScript(prefix: "^" | "_", text: string): string {
  return text.length === 1 ? `${prefix}${text}` : `${prefix}(${text})`;
}

function renderKatexNodeToText(
  node: KatexParseNode,
  options: Required<MathTextRenderOptions>,
): string {
  switch (node.type) {
    case "mathord":
    case "textord":
      return mathTokenToText(node.text ?? "");
    case "atom": {
      const symbol = mathTokenToText(node.text ?? "");
      if (node.family === "bin" || node.family === "rel") {
        return ` ${symbol} `;
      }
      return symbol;
    }
    case "ordgroup":
    case "color":
    case "font":
    case "styling":
    case "mclass":
      return renderKatexNodesToText(node.body, options);
    case "text":
      return renderKatexNodesToText(node.body, {
        unicodeSuperscripts: false,
        unicodeSubscripts: false,
      });
    case "sqrt": {
      const body = renderKatexNodesToText(node.body, options);
      const index = renderKatexNodesToText(node.index, options);
      return index ? `${index}\u221A(${body})` : `\u221A(${body})`;
    }
    case "genfrac": {
      const numerator = renderKatexNodesToText(node.numer, options);
      const denominator = renderKatexNodesToText(node.denom, options);
      return `(${numerator}) / (${denominator})`;
    }
    case "supsub": {
      const base = renderKatexNodesToText(node.base, options);
      const subText = renderKatexNodesToText(node.sub, options);
      const supText = renderKatexNodesToText(node.sup, options);
      const unicodeSub =
        subText && options.unicodeSubscripts
          ? toUnicodeScript(subText, SUBSCRIPT_MAP)
          : null;
      const unicodeSup =
        supText && options.unicodeSuperscripts
          ? toUnicodeScript(supText, SUPERSCRIPT_MAP)
          : null;

      return `${base}${subText ? (unicodeSub ?? formatLinearScript("_", subText)) : ""}${supText ? (unicodeSup ?? formatLinearScript("^", supText)) : ""}`;
    }
    case "leftright": {
      const left = normalizeMathDelimiter(node.left);
      const right = normalizeMathDelimiter(node.right);
      const body = renderKatexNodesToText(node.body, options);
      return `${left}${body}${right}`;
    }
    case "accent":
    case "accentUnder":
    case "overline":
    case "underline":
      return renderKatexNodesToText(node.body, options);
    case "op":
      if (node.body) {
        return renderKatexNodesToText(node.body, options);
      }
      if (typeof node.name === "string") {
        return mathTokenToText(node.name);
      }
      return "";
    default:
      if (node.body) {
        return renderKatexNodesToText(node.body, options);
      }
      if (node.base) {
        return renderKatexNodesToText(node.base, options);
      }
      if (typeof node.text === "string") {
        return mathTokenToText(node.text);
      }
      return "";
  }
}

function renderKatexNodesToText(
  value: unknown,
  options: Required<MathTextRenderOptions> = DEFAULT_MATH_TEXT_RENDER_OPTIONS,
): string {
  return normalizeMathPlainText(
    toKatexNodeArray(value)
      .map((node) => renderKatexNodeToText(node, options))
      .join(""),
  );
}

function createTextRun(text: string, style: InlineTextStyle): TextRun {
  return new TextRun({
    text,
    size: style.size,
    ...(style.bold ? { bold: true } : {}),
    ...(style.italics ? { italics: true } : {}),
    ...(style.font ? { font: style.font } : {}),
    ...(style.color ? { color: style.color } : {}),
    ...(style.noProof ? { noProof: true } : {}),
    ...(style.subScript ? { subScript: true } : {}),
    ...(style.superScript ? { superScript: true } : {}),
  });
}

function createDocxMathTextRun(text: string, style: InlineTextStyle): TextRun[] {
  if (!text) {
    return [];
  }

  return [
    createTextRun(text, {
      ...style,
      font: style.font ?? "Cambria Math",
      noProof: true,
    }),
  ];
}

function renderKatexNodeToDocxTextRuns(
  node: KatexParseNode,
  style: InlineTextStyle,
): TextRun[] {
  switch (node.type) {
    case "mathord":
    case "textord":
      return createDocxMathTextRun(mathTokenToText(node.text ?? ""), style);
    case "atom": {
      const symbol = mathTokenToText(node.text ?? "");
      if (node.family === "bin" || node.family === "rel") {
        return createDocxMathTextRun(` ${symbol} `, style);
      }
      return createDocxMathTextRun(symbol, style);
    }
    case "ordgroup":
    case "color":
    case "font":
    case "styling":
    case "mclass":
      return renderKatexNodesToDocxTextRuns(node.body, style);
    case "text":
      return createDocxMathTextRun(
        renderKatexNodesToText(node.body, {
          unicodeSuperscripts: false,
          unicodeSubscripts: false,
        }),
        style,
      );
    case "sqrt":
      return [
        ...createDocxMathTextRun("\u221A(", style),
        ...renderKatexNodesToDocxTextRuns(node.body, style),
        ...createDocxMathTextRun(")", style),
      ];
    case "genfrac":
      return [
        ...createDocxMathTextRun("(", style),
        ...renderKatexNodesToDocxTextRuns(node.numer, style),
        ...createDocxMathTextRun(")/(", style),
        ...renderKatexNodesToDocxTextRuns(node.denom, style),
        ...createDocxMathTextRun(")", style),
      ];
    case "supsub": {
      return [
        ...renderKatexNodesToDocxTextRuns(node.base, style),
        ...renderKatexNodesToDocxTextRuns(node.sub, {
          ...style,
          subScript: true,
          superScript: false,
        }),
        ...renderKatexNodesToDocxTextRuns(node.sup, {
          ...style,
          superScript: true,
          subScript: false,
        }),
      ];
    }
    case "leftright":
      return [
        ...createDocxMathTextRun(normalizeMathDelimiter(node.left), style),
        ...renderKatexNodesToDocxTextRuns(node.body, style),
        ...createDocxMathTextRun(normalizeMathDelimiter(node.right), style),
      ];
    case "accent":
    case "accentUnder":
    case "overline":
    case "underline":
      return renderKatexNodesToDocxTextRuns(node.body, style);
    case "op":
      if (node.body) {
        return renderKatexNodesToDocxTextRuns(node.body, style);
      }
      if (typeof node.name === "string") {
        return createDocxMathTextRun(mathTokenToText(node.name), style);
      }
      return [];
    default:
      if (node.body) {
        return renderKatexNodesToDocxTextRuns(node.body, style);
      }
      if (node.base) {
        return renderKatexNodesToDocxTextRuns(node.base, style);
      }
      if (typeof node.text === "string") {
        return createDocxMathTextRun(mathTokenToText(node.text), style);
      }
      return [];
  }
}

function renderKatexNodesToDocxTextRuns(
  value: unknown,
  style: InlineTextStyle,
): TextRun[] {
  return toKatexNodeArray(value).flatMap((node) =>
    renderKatexNodeToDocxTextRuns(node, style),
  );
}

function buildDocxMathTextRuns(
  latex: string,
  style: InlineTextStyle,
): TextRun[] {
  const parsed = parseLatexExpression(latex);
  if (parsed && parsed.length > 0) {
    const runs = renderKatexNodesToDocxTextRuns(parsed, style);
    if (runs.length > 0) {
      return runs;
    }
  }

  const fallbackText = latexToText(latex);
  return createDocxMathTextRun(fallbackText || latex, style);
}

function appendInlineContent(
  children: ParagraphChild[],
  text: string,
  style: InlineTextStyle,
): void {
  if (!text) {
    return;
  }

  const parseMath = style.parseMath !== false;
  if (!parseMath) {
    children.push(createTextRun(text, style));
    return;
  }

  for (const segment of splitMathSegments(text)) {
    if (segment.type === "text") {
      if (segment.value) {
        children.push(createTextRun(segment.value, style));
      }
      continue;
    }

    const mathRuns = buildDocxMathTextRuns(segment.value, style);
    if (mathRuns.length > 0) {
      children.push(...mathRuns);
    }
  }
}

async function loadPdfFonts(pdfDoc: PDFDocument): Promise<{
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  mono: PDFFont;
  supportsUnicode: boolean;
}> {
  try {
    const fontkitModule =
      (await import("next/dist/compiled/@next/font/dist/fontkit")) as {
        default: (data: Uint8Array) => unknown;
      };

    const fontkit = {
      create: (data: Uint8Array) => fontkitModule.default(data),
    } as unknown as Parameters<PDFDocument["registerFontkit"]>[0];

    pdfDoc.registerFontkit(fontkit);

    const [regularBytes, boldBytes, italicBytes, monoBytes] = await Promise.all(
      [
        readFile(PDF_FONT_FILE_PATHS.regular),
        readFile(PDF_FONT_FILE_PATHS.bold),
        readFile(PDF_FONT_FILE_PATHS.italic),
        readFile(PDF_FONT_FILE_PATHS.mono),
      ],
    );

    const [regular, bold, italic, mono] = await Promise.all([
      pdfDoc.embedFont(regularBytes),
      pdfDoc.embedFont(boldBytes),
      pdfDoc.embedFont(italicBytes),
      pdfDoc.embedFont(monoBytes),
    ]);

    return { regular, bold, italic, mono, supportsUnicode: true };
  } catch (error) {
    console.warn("Failed to load custom PDF fonts for export:", error);

    const [regular, bold, italic, mono] = await Promise.all([
      pdfDoc.embedFont(StandardFonts.Helvetica),
      pdfDoc.embedFont(StandardFonts.HelveticaBold),
      pdfDoc.embedFont(StandardFonts.HelveticaOblique),
      pdfDoc.embedFont(StandardFonts.Courier),
    ]);

    return { regular, bold, italic, mono, supportsUnicode: false };
  }
}

/**
 * Convert a LaTeX expression to readable plain text for PDF/DOCX export.
 * Not a full renderer — handles the most common patterns teachers encounter.
 */
function latexToText(
  latex: string,
  options: Required<MathTextRenderOptions> = DEFAULT_MATH_TEXT_RENDER_OPTIONS,
): string {
  const parsed = parseLatexExpression(latex);
  if (parsed && parsed.length > 0) {
    const rendered = renderKatexNodesToText(parsed, options);
    if (rendered) {
      return rendered;
    }
  }

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
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    n: "ⁿ",
    "+": "⁺",
    "-": "⁻",
  };
  text = text.replace(/\^\{([^{}]+)\}/g, (_m, exp) => {
    if ([...exp].every((c) => superMap[c]))
      return [...exp].map((c) => superMap[c]).join("");
    return `^(${exp})`;
  });
  text = text.replace(/\^([0-9n])/g, (_m, c) => superMap[c] ?? `^${c}`);

  // Subscripts: _{n} → just the inner text (subscripts don't map to unicode cleanly)
  text = text.replace(/\_\{([^{}]+)\}/g, "_$1");

  // Greek letters
  const greek: Record<string, string> = {
    alpha: "α",
    beta: "β",
    gamma: "γ",
    delta: "δ",
    epsilon: "ε",
    zeta: "ζ",
    eta: "η",
    theta: "θ",
    lambda: "λ",
    mu: "μ",
    nu: "ν",
    xi: "ξ",
    pi: "π",
    rho: "ρ",
    sigma: "σ",
    tau: "τ",
    phi: "φ",
    chi: "χ",
    psi: "ψ",
    omega: "ω",
    Alpha: "Α",
    Beta: "Β",
    Gamma: "Γ",
    Delta: "Δ",
    Theta: "Θ",
    Lambda: "Λ",
    Pi: "Π",
    Sigma: "Σ",
    Phi: "Φ",
    Omega: "Ω",
  };
  text = text.replace(
    /\\([a-zA-Z]+)/g,
    (_m, name) =>
      greek[name] ??
      (
        {
          times: "×",
          cdot: "·",
          div: "÷",
          pm: "±",
          mp: "∓",
          neq: "≠",
          leq: "≤",
          geq: "≥",
          approx: "≈",
          equiv: "≡",
          infty: "∞",
          in: "∈",
          notin: "∉",
          subset: "⊂",
          cup: "∪",
          cap: "∩",
          forall: "∀",
          exists: "∃",
          neg: "¬",
          land: "∧",
          lor: "∨",
          rightarrow: "→",
          leftarrow: "←",
          Rightarrow: "⇒",
          Leftrightarrow: "⇔",
          ldots: "…",
          cdots: "…",
          left: "",
          right: "",
          text: "",
          quad: " ",
          qquad: "  ",
        } as Record<string, string>
      )[name] ??
      `\\${name}`,
  );

  // Strip remaining LaTeX grouping braces
  text = text.replace(/\{([^{}]*)\}/g, "$1");
  // Strip leftover backslashes before punctuation
  text = text.replace(/\\([{}%,;:])/g, "$1");

  // Normalise whitespace
  const normalized = text.replace(/\s{2,}/g, " ").trim();
  return normalized;
}

/**
 * Replace $...$ and $$...$$ in a line with plain-text equivalents.
 */
function convertMathToText(
  text: string,
  options: Required<MathTextRenderOptions> = DEFAULT_MATH_TEXT_RENDER_OPTIONS,
): string {
  return text
    .replace(BLOCK_MATH_PATTERN, (_m, latex) => latexToText(latex, options))
    .replace(INLINE_MATH_PATTERN, (_m, latex) => latexToText(latex, options));
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

function getConfiguredJwtTemplates(): string[] {
  return [
    process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE,
    process.env.CLERK_JWT_TEMPLATE,
  ].filter((value, index, values): value is string => {
    return Boolean(value) && values.indexOf(value) === index;
  });
}

function normalizeBackendBaseUrl(baseUrl: string): string {
  try {
    const normalizedUrl = new URL(baseUrl);
    if (normalizedUrl.hostname === "localhost") {
      normalizedUrl.hostname = "127.0.0.1";
    }
    return normalizedUrl.toString().replace(/\/$/, "");
  } catch {
    return baseUrl.replace(/\/$/, "");
  }
}

async function resolveBackendAuthToken(
  authContext: Awaited<ReturnType<typeof auth>>,
): Promise<string | null> {
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get("scooli_token")?.value;
  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  for (const template of getConfiguredJwtTemplates()) {
    try {
      const token = await authContext.getToken({ template });
      if (token) {
        return token;
      }
    } catch (error) {
      console.warn(
        `Failed to resolve Clerk token for template "${template}" in download route:`,
        error,
      );
    }
  }

  try {
    return await authContext.getToken();
  } catch (error) {
    console.warn(
      "Failed to resolve default Clerk token in download route:",
      error,
    );
    return null;
  }
}

async function resolveIsProUser(): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_API_URL;
  if (!baseUrl) {
    return false;
  }

  const normalizedBaseUrl = normalizeBackendBaseUrl(baseUrl);

  try {
    const authContext = await auth();
    const isActiveOrganizationMember = Boolean(authContext.orgId);
    const token = await resolveBackendAuthToken(authContext);
    if (!token) {
      return isActiveOrganizationMember;
    }

    const response = await fetch(`${normalizedBaseUrl}/entitlements/current`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn(
        `Entitlements lookup failed in download route with status ${response.status}; falling back to Clerk org context.`,
      );
      return isActiveOrganizationMember;
    }

    const entitlement =
      (await response.json()) as CurrentEntitlementResponse | null;

    return entitlement?.isPro === true || isActiveOrganizationMember;
  } catch (error) {
    console.warn("Failed to resolve entitlements for download:", error);
    try {
      const authContext = await auth();
      return Boolean(authContext.orgId);
    } catch {
      return false;
    }
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
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  return null;
}

function getImageDimensions(
  bytes: Buffer,
  contentType?: string | null,
): { width: number; height: number } | null {
  const normalizedContentType =
    normalizeContentType(contentType) ?? detectImageContentType(bytes);

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
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
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

/**
 * Removes HTML comments from a string, including malformed/incomplete ones.
 * Uses a two-pass approach to ensure complete sanitization and avoid
 * incomplete multi-character sanitization vulnerabilities.
 */
function removeHtmlComments(text: string): string {
  return text
    .replace(HTML_COMPLETE_COMMENT_PATTERN, "")
    .replace(HTML_INCOMPLETE_COMMENT_PATTERN, "");
}

function stripInlineMarkdown(
  text: string,
  mathOptions: Required<MathTextRenderOptions> = DEFAULT_MATH_TEXT_RENDER_OPTIONS,
): string {
  const blankProtected = protectAnswerBlanks(
    convertMathToText(text, mathOptions),
  );
  const withoutMarkdown = removeHtmlComments(blankProtected.content)
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
  return removeHtmlComments(normalizeEscapedAnswerBlanks(content))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(HTML_BREAK_PATTERN, "\n")
    .replace(HTML_PARAGRAPH_OPEN_PATTERN, "")
    .replace(HTML_PARAGRAPH_CLOSE_PATTERN, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const ASCII_PDF_CHARACTER_MAP: Record<string, string> = {
  "\u221A": "sqrt",
  "\u00B1": "+/-",
  "\u2213": "-/+",
  "\u00D7": "x",
  "\u00F7": "/",
  "\u00B7": "*",
  "\u2260": "!=",
  "\u2264": "<=",
  "\u2265": ">=",
  "\u2248": "~=",
  "\u2261": "===",
  "\u221E": "infinity",
  "\u2208": "in",
  "\u2209": "notin",
  "\u2282": "subset",
  "\u2286": "subseteq",
  "\u2283": "supset",
  "\u2287": "supseteq",
  "\u222A": "union",
  "\u2229": "intersect",
  "\u2200": "forall",
  "\u2203": "exists",
  "\u2227": "and",
  "\u2228": "or",
  "\u2192": "->",
  "\u2190": "<-",
  "\u2194": "<->",
  "\u21D2": "=>",
  "\u21D0": "<=",
  "\u21D4": "<=>",
  "\u03B1": "alpha",
  "\u03B2": "beta",
  "\u03B3": "gamma",
  "\u03B4": "delta",
  "\u03B5": "epsilon",
  "\u03B8": "theta",
  "\u03BB": "lambda",
  "\u03BC": "mu",
  "\u03C0": "pi",
  "\u03C3": "sigma",
  "\u03C6": "phi",
  "\u03C9": "omega",
  "\u2070": "^0",
  "\u00B9": "^1",
  "\u00B2": "^2",
  "\u00B3": "^3",
  "\u2074": "^4",
  "\u2075": "^5",
  "\u2076": "^6",
  "\u2077": "^7",
  "\u2078": "^8",
  "\u2079": "^9",
  "\u207A": "^+",
  "\u207B": "^-",
  "\u207C": "^=",
  "\u207D": "^(",
  "\u207E": "^)",
  "\u207F": "^n",
  "\u2080": "_0",
  "\u2081": "_1",
  "\u2082": "_2",
  "\u2083": "_3",
  "\u2084": "_4",
  "\u2085": "_5",
  "\u2086": "_6",
  "\u2087": "_7",
  "\u2088": "_8",
  "\u2089": "_9",
  "\u208A": "_+",
  "\u208B": "_-",
  "\u208C": "_=",
  "\u208D": "_(",
  "\u208E": "_)",
  "\u2090": "_a",
  "\u2091": "_e",
  "\u2092": "_o",
  "\u2093": "_x",
  "\u2095": "_h",
  "\u2096": "_k",
  "\u2097": "_l",
  "\u2098": "_m",
  "\u2099": "_n",
  "\u209A": "_p",
  "\u209B": "_s",
  "\u209C": "_t",
};

function toAsciiPdfText(text: string): string {
  return Array.from(text)
    .map((character) => ASCII_PDF_CHARACTER_MAP[character] ?? character)
    .join("");
}

function normalizePdfLine(
  text: string,
  supportsUnicode: boolean = true,
): string {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+/g, " ")
    .replace(/\u00A0/g, " ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "\u2022")
    .replace(/\u00E2\u20AC\u00A2/g, "-")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  if (supportsUnicode) {
    return normalized;
  }

  return toAsciiPdfText(normalized).replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function normalizePdfText(
  text: string,
  supportsUnicode: boolean = true,
): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ")
    .split("\n")
    .map((line) => normalizePdfLine(line, supportsUnicode))
    .join("\n");
}

type PdfLineFragment = {
  text: string;
  size: number;
  yOffset: number;
};

function parsePdfLineFragments(line: string, fontSize: number): PdfLineFragment[] {
  const fragments: PdfLineFragment[] = [];
  let buffer = "";

  const flushBuffer = () => {
    if (!buffer) {
      return;
    }
    fragments.push({
      text: buffer,
      size: fontSize,
      yOffset: 0,
    });
    buffer = "";
  };

  const pushScript = (text: string, isSuperScript: boolean) => {
    if (!text) {
      return;
    }
    fragments.push({
      text,
      size: Math.max(8, Math.round(fontSize * 0.7)),
      yOffset: isSuperScript ? fontSize * 0.32 : -fontSize * 0.16,
    });
  };

  let index = 0;
  while (index < line.length) {
    const current = line[index];
    const next = line[index + 1];
    const isScriptMarker = current === "^" || current === "_";

    if (!isScriptMarker || !next) {
      buffer += current;
      index += 1;
      continue;
    }

    const isSuperScript = current === "^";

    if (next === "(") {
      let depth = 1;
      let cursor = index + 2;
      let scriptText = "";

      while (cursor < line.length && depth > 0) {
        const character = line[cursor];
        if (character === "(") {
          depth += 1;
        } else if (character === ")") {
          depth -= 1;
          if (depth === 0) {
            cursor += 1;
            break;
          }
        }

        if (depth > 0) {
          scriptText += character;
        }
        cursor += 1;
      }

      if (scriptText) {
        flushBuffer();
        pushScript(scriptText, isSuperScript);
        index = cursor;
        continue;
      }
    }

    if (/[A-Za-z0-9+\-=]/.test(next)) {
      flushBuffer();
      pushScript(next, isSuperScript);
      index += 2;
      continue;
    }

    buffer += current;
    index += 1;
  }

  flushBuffer();
  return fragments;
}

function drawPdfLine(
  page: PDFPage,
  line: string,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>,
) {
  const fragments = parsePdfLineFragments(line, fontSize);
  let cursorX = x;

  for (const fragment of fragments) {
    if (!fragment.text) {
      continue;
    }

    page.drawText(fragment.text, {
      x: cursorX,
      y: y + fragment.yOffset,
      size: fragment.size,
      font,
      color,
    });
    cursorX += font.widthOfTextAtSize(fragment.text, fragment.size);
  }
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

function parseMarkdownImageLine(
  line: string,
): { alt: string; source: string } | null {
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

function parseHtmlImageLine(
  line: string,
): { alt: string; source: string } | null {
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

function buildImageLookup(
  images?: DownloadImagePayload[],
): Map<string, DownloadImagePayload> {
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
    const resolvedContentType =
      normalizeContentType(dataUriMatch[1]) ?? detectImageContentType(bytes);
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
    return {
      alt: block.alt,
      width: 1200,
      height: 900,
      error: "Invalid image URL",
    };
  }
  if (isInternalHost(parsedSourceUrl.hostname)) {
    return {
      alt: block.alt,
      width: 1200,
      height: 900,
      error: "Private image URLs are not allowed",
    };
  }

  // Require a valid public FQDN — blocks bare IPs, localhost variants, and malformed hosts
  if (
    !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
      parsedSourceUrl.hostname,
    )
  ) {
    return {
      alt: block.alt,
      width: 1200,
      height: 900,
      error: "Invalid image host",
    };
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

    if (
      !resolvedContentType ||
      !["image/png", "image/jpeg"].includes(resolvedContentType)
    ) {
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
  styleOverrides: Omit<InlineTextStyle, "size"> = {},
): ParagraphChild[] {
  const runs: ParagraphChild[] = [];
  const blankProtected = protectAnswerBlanks(text);
  let remaining = blankProtected.content;
  let match: RegExpMatchArray | null;

  const appendStyled = (
    value: string,
    overrides: Partial<InlineTextStyle> = {},
  ) => {
    appendInlineContent(runs, value, {
      size: baseSize,
      ...styleOverrides,
      ...overrides,
    });
  };

  while (remaining.length > 0) {
    if ((match = remaining.match(/^\$\$([\s\S]+?)\$\$/))) {
      appendStyled(blankProtected.restore(match[0]));
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^\$([^$\n]+)\$/))) {
      appendStyled(blankProtected.restore(match[0]));
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^\*\*(.+?)\*\*/))) {
      appendStyled(blankProtected.restore(match[1]), { bold: true });
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^[\*_](.+?)[\*_]/))) {
      appendStyled(blankProtected.restore(match[1]), { italics: true });
      remaining = remaining.substring(match[0].length);
      continue;
    }

    if ((match = remaining.match(/^`(.+?)`/))) {
      appendStyled(blankProtected.restore(match[1]), {
        font: "Courier New",
        size: baseSize - 2,
        parseMath: false,
      });
      remaining = remaining.substring(match[0].length);
      continue;
    }

    const nextSpecial = remaining.search(INLINE_MARKDOWN_SPECIAL_PATTERN);
    if (nextSpecial === -1) {
      appendStyled(blankProtected.restore(remaining));
      break;
    }
    if (nextSpecial > 0) {
      appendStyled(blankProtected.restore(remaining.substring(0, nextSpecial)));
      remaining = remaining.substring(nextSpecial);
      continue;
    }

    appendStyled(blankProtected.restore(remaining[0]));
    remaining = remaining.substring(1);
  }

  return runs.length > 0
    ? runs
    : [
        createTextRun(blankProtected.restore(blankProtected.content), {
          size: baseSize,
          ...styleOverrides,
        }),
      ];
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
              children: parseInlineFormatting(block.text, 48, {
                bold: true,
                color: "0B0D17",
              }),
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
              children: parseInlineFormatting(block.text, 36, {
                bold: true,
                color: "0B0D17",
              }),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            }),
          );
        }
        break;
      case "h1":
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.text, 36, {
              bold: true,
              color: "0B0D17",
            }),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
        );
        break;
      case "h2":
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.text, 28, {
              bold: true,
              color: "0B0D17",
            }),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 150 },
          }),
        );
        break;
      case "h3":
        children.push(
          new Paragraph({
            children: parseInlineFormatting(block.text, 24, {
              bold: true,
              color: "2E2F38",
            }),
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
            children: parseInlineFormatting(block.text, 22, {
              italics: true,
              color: "6C6F80",
            }),
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
  const {
    regular: helvetica,
    bold: helveticaBold,
    italic: helveticaOblique,
    mono: courier,
    supportsUnicode,
  } = await loadPdfFonts(pdfDoc);

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

  const pdfMathTextOptions: Required<MathTextRenderOptions> = {
    unicodeSuperscripts: false,
    unicodeSubscripts: false,
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
    const paragraphs = normalizePdfText(text, supportsUnicode).split("\n");

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
    const rawLines = normalizePdfText(text, supportsUnicode).split("\n");

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

    let displayText = stripInlineMarkdown(block.text, pdfMathTextOptions);
    if (block.type === "bullet") {
      displayText = `• ${stripInlineMarkdown(
        block.text.replace(/^[\*\-]\s/, ""),
        pdfMathTextOptions,
      )}`;
    } else if (block.type === "numbered") {
      displayText = stripInlineMarkdown(block.text, pdfMathTextOptions);
    }
    displayText = normalizePdfText(displayText, supportsUnicode);

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
      const safeLine = normalizePdfLine(wrappedLine, supportsUnicode);
      drawPdfLine(
        currentPage,
        safeLine,
        margin + indent,
        yPosition,
        font,
        fontSize,
        color,
      );
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
      .replace(/[^a-zA-Z0-9\u00C0-\u00FF\s\-_]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 100);

    const distinctId =
      request.headers.get("x-posthog-distinct-id") ?? "anonymous";
    const isProUser = await resolveIsProUser();

    if (format === "pdf") {
      const pdfBytes = (await generatePdf(
        content,
        images,
        isProUser,
      )) as Uint8Array;
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
          {
            error:
              "Exportacao DOCX disponivel apenas para utilizadores Scooli Pro",
          },
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

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 },
    );
  }
}

