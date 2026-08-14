/**
 * Shared limited-Markdown tokenizer for inline text fields on the JSON block
 * model (PRESENTATIONS_NOTES.md decision #2).
 *
 * Lives here rather than in the React renderer because there are TWO consumers
 * with very different output targets:
 *
 *   - {@link InlineText} (`components/blocks/inline-text.tsx`) → React elements
 *   - {@link KonvaRichText} (`document-editor-v2/KonvaRichText.tsx`) → canvas
 *     draw calls, which need FLAT styled runs rather than a nested tree
 *
 * Before this module existed only the React path parsed markdown, so decks
 * rendered on the Konva canvas (the editor, the thumbnails and the fullscreen
 * presenter — i.e. everywhere a teacher actually looks at a deck) showed raw
 * `**asterisks**`.
 *
 * Grammar (everything else is literal text):
 *   - `**bold**`, `*italic*`, `` `code` ``, `[label](url)`, `$math$`
 */

/** Inline markdown tokens recognised by the parser. */
export type Token =
  | { type: "text"; value: string }
  | { type: "bold"; children: Token[] }
  | { type: "italic"; children: Token[] }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string }
  | { type: "math"; tex: string };

/**
 * Tokenise inline-formatted text. Recursive only for bold/italic which can
 * nest in each other; everything else is a leaf.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let buf = "";
  let i = 0;

  const flushBuf = () => {
    if (buf.length > 0) {
      tokens.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < input.length) {
    const c = input[i];
    const next = input[i + 1];

    // **bold** — must come before *italic* so the longer match wins.
    if (c === "*" && next === "*") {
      const end = input.indexOf("**", i + 2);
      if (end !== -1) {
        flushBuf();
        tokens.push({ type: "bold", children: tokenize(input.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    // *italic*
    if (c === "*") {
      const end = input.indexOf("*", i + 1);
      if (end !== -1) {
        flushBuf();
        tokens.push({ type: "italic", children: tokenize(input.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }

    // `code`
    if (c === "`") {
      const end = input.indexOf("`", i + 1);
      if (end !== -1) {
        flushBuf();
        tokens.push({ type: "code", value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // [label](url)
    if (c === "[") {
      const close = input.indexOf("]", i + 1);
      if (close !== -1 && input[close + 1] === "(") {
        const closeParen = input.indexOf(")", close + 2);
        if (closeParen !== -1) {
          flushBuf();
          tokens.push({
            type: "link",
            label: input.slice(i + 1, close),
            href: input.slice(close + 2, closeParen),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // $math$ — KaTeX inline. Skips when there's no closing $.
    if (c === "$") {
      const end = input.indexOf("$", i + 1);
      if (end !== -1) {
        flushBuf();
        tokens.push({ type: "math", tex: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    buf += c;
    i += 1;
  }

  flushBuf();
  return tokens;
}

/* -------------------------------------------------------------------------- */
/* Flat runs — for canvas renderers that cannot nest styles                    */
/* -------------------------------------------------------------------------- */

/** A contiguous stretch of text sharing one style. */
export interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
  /** `code` spans render in a monospace family. */
  code: boolean;
}

/**
 * Flatten a token tree into styled runs. Nested emphasis composes
 * (`**bold *and italic***` → one run with both flags).
 *
 * Links keep their label and drop the href — a canvas slide isn't clickable.
 * Math keeps its raw TeX: inline `$…$` inside a bullet is rare, and showing the
 * source beats swallowing the content. Block-level formulas go through the
 * dedicated `math` block, which is rendered by KaTeX.
 */
export function flattenToRuns(
  tokens: Token[],
  inherited: { bold?: boolean; italic?: boolean } = {},
): InlineRun[] {
  const runs: InlineRun[] = [];
  const bold = inherited.bold ?? false;
  const italic = inherited.italic ?? false;

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        runs.push({ text: token.value, bold, italic, code: false });
        break;
      case "bold":
        runs.push(...flattenToRuns(token.children, { bold: true, italic }));
        break;
      case "italic":
        runs.push(...flattenToRuns(token.children, { bold, italic: true }));
        break;
      case "code":
        runs.push({ text: token.value, bold, italic, code: true });
        break;
      case "link":
        runs.push({ text: token.label, bold, italic, code: false });
        break;
      case "math":
        runs.push({ text: token.tex, bold, italic, code: true });
        break;
    }
  }

  // Merge adjacent runs sharing a style so the renderer emits fewer nodes and
  // word-wrapping doesn't break mid-word at a style boundary that isn't one.
  const merged: InlineRun[] = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && last.bold === run.bold && last.italic === run.italic && last.code === run.code) {
      last.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged.filter((r) => r.text.length > 0);
}

/** Convenience: string → flat styled runs. */
export function parseInlineRuns(input: string): InlineRun[] {
  return flattenToRuns(tokenize(input));
}

/** Drop all formatting markers, keeping the visible text. */
export function stripInlineMarkdown(input: string): string {
  return parseInlineRuns(input)
    .map((r) => r.text)
    .join("");
}

/* -------------------------------------------------------------------------- */
/* List helpers                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Leading list marker the model sometimes writes INTO the item text:
 * `"1. "`, `"1) "`, `"- "`, `"• "`, `"* "`.
 */
const LEADING_MARKER = /^\s*(?:\d+[.)]\s+|[-•*]\s+)/;

/**
 * Strip a marker the model duplicated into the item body.
 *
 * The renderers prefix every item with their own `1. ` / `• `, so an item that
 * already starts with one renders as "1. 1. Erosão". Applied at render time
 * (not at generation) so decks already in the database are fixed too.
 *
 * Only ONE leading marker is removed — a genuine item like "2. lugar: prata"
 * keeps its meaning after the renderer's own marker is prepended.
 */
export function normalizeListItem(item: string): string {
  return item.replace(LEADING_MARKER, "");
}

/** The marker the renderer draws for item `index` of a list. */
export function listMarkerFor(type: "bullet_list" | "ordered_list", index: number): string {
  return type === "ordered_list" ? `${index + 1}. ` : "• ";
}

/* -------------------------------------------------------------------------- */
/* HTML round-trip — for WYSIWYG inline editing (contentEditable)             */
/* -------------------------------------------------------------------------- */

/**
 * These two functions let the canvas editor's inline edit boxes show real
 * bold/italic instead of literal `**asterisks**` while the teacher is typing —
 * a plain `<textarea>` has no notion of styled text, so it can only ever show
 * the raw markdown source. A `contentEditable` element can render actual
 * `<strong>`/`<em>` and take `document.execCommand("bold" | "italic")`, so the
 * edit box looks the same as the rendered slide. These convert one way in
 * (markdown → HTML, to seed the box) and back out (HTML → markdown, to
 * persist) around that.
 *
 * Known limitation: `[link](url)` and `$math$` are shown as their literal
 * source text rather than rendered — round-tripping a live KaTeX preview or an
 * editable link target inside a contenteditable box is a bigger feature than
 * this warrants, and neither appears in AI-generated slide content today.
 */

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function tokensToEditableHtml(tokens: Token[]): string {
  return tokens
    .map((token) => {
      switch (token.type) {
        case "text":
          return escapeHtml(token.value);
        case "bold":
          return `<strong>${tokensToEditableHtml(token.children)}</strong>`;
        case "italic":
          return `<em>${tokensToEditableHtml(token.children)}</em>`;
        case "code":
          return `<code>${escapeHtml(token.value)}</code>`;
        case "link":
          return escapeHtml(`[${token.label}](${token.href})`);
        case "math":
          return escapeHtml(`$${token.tex}$`);
      }
    })
    .join("");
}

/** Markdown string → HTML, for seeding a contentEditable box's innerHTML. */
export function inlineMarkdownToEditableHtml(text: string): string {
  if (!text) return "";
  return tokensToEditableHtml(tokenize(text));
}

/**
 * `**` immediately touching another `*` (3+ asterisks in a row) is ambiguous
 * for {@link tokenize}, which only recognises `**bold**` and `*italic*` as
 * distinct, non-combined markers — see the grammar note on {@link tokenize}.
 * Typing both Ctrl+B and Ctrl+I over the same selection produces exactly this
 * (`<strong><em>x</em></strong>` serializes to `***x***`), so a zero-width
 * space is inserted to break the run. It renders as nothing, but keeps the
 * text from corrupting into stray literal asterisks on the next parse.
 */
const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);
const NON_BREAKING_SPACE = String.fromCharCode(0x00a0);

function disambiguateAdjacentEmphasisMarkers(markdown: string): string {
  return markdown.replace(/\*{3,}/g, (run) => run.split("").join(ZERO_WIDTH_SPACE));
}

function domNodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // contentEditable renders consecutive spaces as NBSP so the browser
    // doesn't collapse them; normalize back to a plain space for storage.
    return (node.textContent ?? "").split(NON_BREAKING_SPACE).join(" ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const inner = Array.from(element.childNodes).map(domNodeToMarkdown).join("");
  if (inner.length === 0) return "";

  switch (element.tagName) {
    case "STRONG":
    case "B":
      return `**${inner}**`;
    case "EM":
    case "I":
      return `*${inner}*`;
    case "CODE":
      return `\`${inner}\``;
    case "BR":
      return " ";
    default:
      // DIV/P and anything else a browser inserts for a soft line break
      // inside a single logical line/item — keep the text, drop the wrapper.
      return inner;
  }
}

/**
 * A contentEditable element's live DOM → our limited-markdown string. Inverse
 * of {@link inlineMarkdownToEditableHtml}, reading the ACTUAL DOM (not the
 * HTML the box was seeded with) so it reflects whatever `execCommand` or the
 * browser's own editing behaviour produced.
 */
export function editableElementToMarkdown(root: HTMLElement): string {
  const raw = Array.from(root.childNodes).map(domNodeToMarkdown).join("");
  return disambiguateAdjacentEmphasisMarkers(raw);
}
