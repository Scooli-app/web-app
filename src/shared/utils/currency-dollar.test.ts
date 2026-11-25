import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { splitBlanks } from "@/components/assessment-editor/model";
import { InlineText } from "@/components/blocks/inline-text";
import { splitInlineMath } from "@/components/document-editor-v2/inline-math";
import { docToText, textToDoc } from "@/components/math/mathText";
import {
  isCurrencyDollar,
  maskCurrencyDollars,
  nextMathDollar,
  unmaskCurrencyDollars,
} from "./currency-dollar";
import { markdownToHtml } from "./markdown";
import { normalizeMathMarkdown } from "./math-markdown";

/** The staging worksheet 3906ea3e (6º ano, "Porcentagem", 2026-11-23) that rendered prices as maths. */
const PRICE_THEN_FORMULA = "Uma mochila custa R$ 80,00. Qual é o valor de um desconto de $10\\%$ sobre esse preço?";

describe("isCurrencyDollar", () => {
  it("recognises Brazilian and US prices", () => {
    expect(isCurrencyDollar("R$ 80,00", 1)).toBe(true);
    expect(isCurrencyDollar("R$80", 1)).toBe(true);
    expect(isCurrencyDollar("(A) R$ 8,00", 5)).toBe(true);
    expect(isCurrencyDollar("US$ 5", 2)).toBe(true);
  });

  it("leaves formulas and other words alone", () => {
    expect(isCurrencyDollar("$x \\in \\mathbb{R}$ 5", 17)).toBe(false);
    expect(isCurrencyDollar("PR$ 5", 2)).toBe(false);
    expect(isCurrencyDollar("R$ x", 1)).toBe(false);
    expect(isCurrencyDollar("$10$", 0)).toBe(false);
  });

  it("masks without moving indices and unmasks back", () => {
    const masked = maskCurrencyDollars(PRICE_THEN_FORMULA);
    expect(masked).toHaveLength(PRICE_THEN_FORMULA.length);
    expect(masked.indexOf("$")).toBe(PRICE_THEN_FORMULA.indexOf("$10"));
    expect(unmaskCurrencyDollars(masked)).toBe(PRICE_THEN_FORMULA);
    expect(nextMathDollar(PRICE_THEN_FORMULA, 0)).toBe(PRICE_THEN_FORMULA.indexOf("$10"));
  });
});

describe("prices stay text in every renderer", () => {
  it("the exercise sheet (InlineText)", () => {
    const html = renderToStaticMarkup(createElement(InlineText, { value: PRICE_THEN_FORMULA }));
    expect(html).toContain("Uma mochila custa R$ 80,00. Qual é o valor de um desconto de ");
    expect((html.match(/class="katex"/g) ?? []).length).toBe(1);
    const option = renderToStaticMarkup(createElement(InlineText, { value: "R$ 8,00" }));
    expect(option).not.toContain("katex");
    expect(option).toContain("R$ 8,00");
  });

  it("the editor (sheet rule) round-trips the text unchanged", () => {
    const doc = textToDoc(PRICE_THEN_FORMULA, false, "sheet");
    expect(docToText(doc, "sheet")).toBe(PRICE_THEN_FORMULA);
    const maths = JSON.stringify(doc).match(/"latex":"[^"]*"/g) ?? JSON.stringify(doc).match(/"tex":"[^"]*"/g) ?? [];
    expect(maths.join()).not.toContain("80");
  });

  it("slides", () => {
    const segments = splitInlineMath("Custa R$80,00 e o desconto é $10\\%$.");
    expect(segments.filter((s) => s.kind === "math")).toHaveLength(1);
    expect(segments[0]).toEqual({ kind: "text", text: "Custa R$80,00 e o desconto é " });
  });

  it("the markdown repair and renderer", () => {
    expect(normalizeMathMarkdown(PRICE_THEN_FORMULA)).toBe(PRICE_THEN_FORMULA);
    const html = markdownToHtml(PRICE_THEN_FORMULA);
    expect(html).toContain("R$ 80,00");
    expect((html.match(/data-type="inline-math"/g) ?? []).length).toBe(1);
  });

  it("fill-the-gaps prompts", () => {
    const { parts, gaps } = splitBlanks("Custa R$ ___ com $10\\%$ de desconto.", (n) => `[${n}]`);
    expect(gaps).toEqual([0]);
    expect(parts).toEqual(["Custa R$ ", " com $10\\%$ de desconto."]);
  });
});
