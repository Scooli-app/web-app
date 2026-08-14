/**
 * React renderer for the limited-Markdown inline text fields on the JSON block
 * model. The tokenizer itself lives in `@/shared/utils/inline-markdown` because
 * the Konva canvas renderer needs the same grammar with flat output.
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

import { tokenize, type Token } from "@/shared/utils/inline-markdown";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Fragment, type ReactNode } from "react";

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
