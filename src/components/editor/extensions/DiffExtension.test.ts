// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { Fragment, Slice } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";
import { registerTranslator } from "@/i18n/translate";
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

describe("large deletion widget", () => {
  function mountWithLargeDeletion() {
    const ed = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, DiffExtension],
      content: "<p>Kept text</p>",
    });
    editor = ed;
    const { schema } = ed.state;
    const deletedSlice = new Slice(
      Fragment.from([
        schema.node("paragraph", null, schema.text("First removed paragraph")),
        schema.node("paragraph", null, schema.text("Second removed paragraph")),
      ]),
      0,
      0,
    );
    ed.commands.setDiffChanges([
      { id: "del1", type: "delete", fromA: 0, toA: 52, fromB: 0, toB: 0, deletedSlice },
      { id: "ins1", type: "insert", fromA: 1, toA: 1, fromB: 1, toB: 5 },
    ]);
    return ed;
  }

  it("collapses to one line and the toggle shows the deleted content", () => {
    registerTranslator((key, values) =>
      key === "editor.diffExtension.paragraphCount" ? `${values?.count} parágrafos` : key,
    );
    const ed = mountWithLargeDeletion();
    const block = ed.view.dom.querySelector(".diff-delete-block") as HTMLElement;
    const content = block.querySelector(".diff-delete-content") as HTMLElement;
    const toggle = block.querySelector(".diff-delete-toggle") as HTMLElement;

    expect(content.hidden).toBe(true);
    expect(block.querySelector(".diff-delete-excerpt")?.textContent).toBe(
      "2 parágrafos: First removed paragraph Second removed paragraph",
    );

    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(content.hidden).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");

    toggle.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(content.hidden).toBe(true);
  });

  it("names the removed sections and counts their paragraphs", () => {
    registerTranslator((key, values) =>
      key === "editor.diffExtension.paragraphCount" ? `${values?.count} parágrafos` : key,
    );
    const ed = new Editor({
      element: document.createElement("div"),
      extensions: [StarterKit, DiffExtension],
      content: "<p>Kept text</p>",
    });
    editor = ed;
    const { schema } = ed.state;
    const h = (text: string) => schema.node("heading", { level: 2 }, schema.text(text));
    const p = (text: string) => schema.node("paragraph", null, schema.text(text));
    const deletedSlice = new Slice(Fragment.from([h("Leitura"), p("a"), p("b"), h("Análise"), p("c")]), 0, 0);
    ed.commands.setDiffChanges([{ id: "del1", type: "delete", fromA: 0, toA: 30, fromB: 0, toB: 0, deletedSlice }]);

    expect(ed.view.dom.querySelector(".diff-delete-excerpt")?.textContent).toBe("Leitura, Análise · 3 parágrafos");
  });

  it("puts the accept and reject buttons on the deletion's own line", () => {
    const ed = mountWithLargeDeletion();
    const header = ed.view.dom.querySelector(".diff-delete-header") as HTMLElement;

    expect(header.querySelector('[data-action="accept"][data-change-id="del1"]')).not.toBeNull();
    expect(ed.view.dom.querySelectorAll('[data-change-id="del1"][data-action="accept"]')).toHaveLength(1);

    (header.querySelector('[data-action="reject"]') as HTMLElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    expect(ed.view.dom.querySelector(".diff-delete-block")).toBeNull();
  });

  it("stays expanded when another change is resolved", () => {
    const ed = mountWithLargeDeletion();
    (ed.view.dom.querySelector(".diff-delete-toggle") as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));

    ed.commands.acceptChange("ins1");

    const content = ed.view.dom.querySelector(".diff-delete-content") as HTMLElement;
    expect(content.hidden).toBe(false);
  });
});
