import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { docToText, textToDoc } from "./mathText";

describe("text with formulas", () => {
  it.each([
    ["a formula in a sentence", "Calcula $\\frac{3}{4}+\\frac{1}{8}$."],
    ["money, not a formula", "custa 5$ e 3$"],
    ["a display formula", "Resolve $$x^2 = 4$$ agora"],
    ["only a formula", "$x$"],
    ["nothing", ""],
    ["bold markers", "**Atenção:** usa $\\sqrt{2}$"],
  ])("gives back %s unchanged", (_, text) => {
    expect(docToText(textToDoc(text, false))).toBe(text);
  });

  it("keeps lines in a multi-line field", () => {
    const text = "linha 1\n\nlinha 3 com $x^2$";
    expect(docToText(textToDoc(text, true))).toBe(text);
  });

  it("splits formulas out as their own pieces", () => {
    const doc = textToDoc("a $x^2$ b", false);
    const nodes = doc.content?.[0]?.content ?? [];
    expect(nodes.map((n) => n.type)).toEqual(["text", "inlineMath", "text"]);
    expect(nodes[1]?.attrs?.latex).toBe("x^2");
  });

  // The node the editor changes: the formula, second piece of the first line.
  function formulaOf(doc: JSONContent): JSONContent {
    const node = doc.content?.[0]?.content?.[1];
    if (!node) throw new Error("no formula");
    return node;
  }

  it("writes an edited formula back between single dollars", () => {
    const doc = textToDoc("Resolve $$x^2 = 4$$ agora", false);
    const math = formulaOf(doc);
    math.attrs = { ...math.attrs, latex: "x^2 = 9" };
    expect(docToText(doc)).toBe("Resolve $x^2 = 9$ agora");
  });

  it("drops an emptied formula", () => {
    const doc = textToDoc("a $x$ b", false);
    formulaOf(doc).attrs = { latex: "", raw: "$x$" };
    expect(docToText(doc)).toBe("a  b");
  });
});

// The exercise sheet prints with its own rule (any $…$ pair is a formula); its fields must edit by the same rule.
describe("sheet rule", () => {
  it("reads formulas as the printed sheet does and gives text back unchanged", () => {
    const text = "Calcula $x$2 e $\\frac{1}{2}$";
    const doc = textToDoc(text, false, "sheet");
    expect((doc.content?.[0]?.content ?? []).filter((n) => n.type === "inlineMath")).toHaveLength(2);
    expect(docToText(doc, "sheet")).toBe(text);
  });
});

describe("edited formulas stay formulas when read back", () => {
  const edited = (latex: string, after: string): JSONContent => ({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "a " }, { type: "inlineMath", attrs: { latex } }, { type: "text", text: after }] }],
  });

  // Slides keep "custa $5" as money, so "$x$2" would come back as text: "$$x$$2" reads as a formula there.
  it("before a digit on a slide", () => {
    const text = docToText(edited("x", "2"), "slide");
    expect(text).toBe("a $$x$$2");
    expect(textToDoc(text, false, "slide").content?.[0]?.content?.[1]?.type).toBe("inlineMath");
  });

  it("before a digit on the sheet", () => {
    expect(docToText(edited("x", "2"), "sheet")).toBe("a $x$2");
  });

  // A dollar inside a formula would end it early under either rule.
  it("with a dollar sign inside", () => {
    const text = docToText(edited("5\\$", " b"), "sheet");
    expect(text).toBe("a $5\\text{\\textdollar}$ b");
    expect(textToDoc(text, false, "sheet").content?.[0]?.content?.[1]?.attrs?.latex).toBe("5\\text{\\textdollar}");
  });
});
