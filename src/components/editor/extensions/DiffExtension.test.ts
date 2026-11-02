// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { DiffExtension } from "./DiffExtension";

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("rejectAllChanges", () => {
  // PostHog $exception "Applying a mismatched transaction" (Oct 2026): the restore
  // ran as a nested editor.commands call that dispatched before the outer transaction.
  it("restores the original document without a mismatched transaction", () => {
    const ed = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, DiffExtension],
      content: "<p>AI text</p>",
    });
    editor = ed;
    (ed.storage as unknown as { diff: { originalContent: string } }).diff.originalContent =
      "<p>Original text</p>";
    ed.commands.setDiffChanges([
      { id: "c1", type: "replace", fromA: 1, toA: 14, fromB: 1, toB: 8 },
    ]);

    expect(() => ed.commands.rejectAllChanges()).not.toThrow();
    expect(ed.getHTML()).toBe("<p>Original text</p>");
  });
});
