// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runFocusedChain } from "./runFocusedChain";

let editor: Editor | null = null;
let element: HTMLElement | null = null;

afterEach(() => {
  editor?.destroy();
  element?.remove();
  editor = null;
  element = null;
  vi.restoreAllMocks();
});

// jsdom has no layout, and ProseMirror measures the selection to scroll it into view.
const emptyRects = () => [] as unknown as DOMRectList;
const emptyRect = () => new DOMRect();
Range.prototype.getClientRects ??= emptyRects;
Range.prototype.getBoundingClientRect ??= emptyRect;

function mountEditor(content: string) {
  element = document.createElement("div");
  document.body.appendChild(element);
  editor = new Editor({ element, extensions: [StarterKit], content });
  return editor;
}

describe("runFocusedChain", () => {
  // PostHog $exception "Applying a mismatched transaction" (Nov 2026): on phones,
  // `chain().focus().toggleHeading()` focused the DOM inside the chain, and the
  // trailing paragraph landed before the chain's own transaction.
  it("toggles a heading on an unfocused Android editor without a mismatched transaction", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36",
    );
    const ed = mountEditor("<p>Intro</p><ul><li><p>Item</p></li></ul>");
    expect(ed.view.hasFocus()).toBe(false);

    expect(() =>
      runFocusedChain(ed, (chain) => chain.toggleHeading({ level: 1 })),
    ).not.toThrow();
    expect(ed.view.hasFocus()).toBe(true);
    expect(ed.getHTML()).toBe(
      "<h1>Intro</h1><ul><li><p>Item</p></li></ul><p></p>",
    );
  });

  it("keeps the selection when the editor already has focus", () => {
    const ed = mountEditor("<p>One</p><p>Two</p>");
    ed.view.focus();
    ed.commands.setTextSelection(7);

    runFocusedChain(ed, (chain) => chain.toggleHeading({ level: 2 }));

    expect(ed.getHTML()).toBe("<p>One</p><h2>Two</h2><p></p>");
  });
});
