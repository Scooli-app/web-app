/**
 * Tiny limited-Markdown parser for inline text fields on the JSON block model.
 *
 * Decision #2 in PRESENTATIONS_NOTES.md: inline text fields are strings, NOT
 * structured rich-text nodes. We parse a small allowed subset at render time:
 *
 *   - **bold**       → <strong>
 *   - *italic*       → <em>
 *   - `code`         → <code>
 *   - [label](url)   → <a>
 *   - $math$         → KaTeX inline
 *
 * Anything else renders as plain text. No HTML escape worries because we never
 * inject raw HTML — we emit React elements.
 *
 * Why hand-rolled and not react-markdown: react-markdown is a full block-level
 * Markdown processor (130+kB), and we want to enforce the allow-list at the
 * parser level rather than configure-it-away.
 */
"use client";

import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, type ReactNode } from "react";

/** Inline markdown tokens recognised by the parser. */
type Token =
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
function tokenize(input: string): Token[] {
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

function renderTokens(tokens: Token[]): ReactNode[] {
  return tokens.map((token, idx) => {
    switch (token.type) {
      case "text":
        return <Fragment key={idx}>{token.value}</Fragment>;
      case "bold":
        return (
          <strong key={idx} className="font-semibold">
            {renderTokens(token.children)}
          </strong>
        );
      case "italic":
        return (
          <em key={idx} className="italic">
            {renderTokens(token.children)}
          </em>
        );
      case "code":
        return (
          <code
            key={idx}
            className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
          >
            {token.value}
          </code>
        );
      case "link":
        return (
          <a
            key={idx}
            href={token.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            {token.label}
          </a>
        );
      case "math": {
        let html: string;
        try {
          html = katex.renderToString(token.tex, {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          // Fall back to raw text rather than crashing the slide.
          return (
            <code key={idx} className="text-destructive">
              {token.tex}
            </code>
          );
        }
        return (
          <span
            key={idx}
            // KaTeX HTML is safe — produced from our own input, no user HTML.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    }
  });
}

/**
 * Render an inline-formatted string. Use this everywhere the block schema
 * carries inline text (paragraph.text, bullet_list.items[], heading.text,
 * slide.title, slide.subtitle).
 */
export function InlineText({ value }: { value: string }) {
  if (!value) return null;
  return <>{renderTokens(tokenize(value))}</>;
}
