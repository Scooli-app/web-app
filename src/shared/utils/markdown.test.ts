import katex from "katex";
import { describe, expect, it } from "vitest";

import { markdownToHtml } from "./markdown";

// Lines as stored for the production quiz 9d44d7c6 and worksheet bd00c960 (4.º ano, "Frações",
// 2026-10-15), which showed students raw or garbled LaTeX. markdownToHtml feeds both the editor
// (TipTap renders each inline-math node with KaTeX) and the PDF export.
const QUIZ = [
  "Na fração $\\frac{3}{4}$, qual é o numerador?",
  "Qual das seguintes frações é equivalente a $\\frac{1}{2}\\?",
  "(A) $\\frac{2}{4}\\  ",
  "(B) $\\frac{3}{5}\\  ",
  "(C) $\\frac{5}{10}\\  ",
  "(D) Ambas  ",
  "(A) e (C)",
  "",
  "A fração $\\frac{5}{5}\\ é igual a 1.",
  "",
  "A fração $\\frac{2}{3}\\ é maior que $\\frac{3}{4}\\.",
].join("\n");

const WORKSHEET = [
  "Completa as frações equivalentes:",
  "",
  "a) \\frac{1}{2} = \\frac{___}{4}",
  "",
  "b) \\frac{3}{6} = \\frac{___}{12}",
  "",
  "Compara as frações. Usa os símbolos >, < ou =:",
  "",
  "a) $\\frac{1}{2}$ e $\\frac{2}{4}$: \\frac{1}{2} \\, ___ \\, \\frac{2}{4}",
].join("\n");

function mathNodes(html: string): string[] {
  return [...html.matchAll(/data-latex="([^"]*)"/g)].map((match) =>
    match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
  );
}

function textOutsideMath(html: string): string {
  return html
    .replace(/<span\b[^>]*data-type="inline-math"[^>]*><\/span>/g, " [math] ")
    .replace(/<[^>]+>/g, " ");
}

describe("markdownToHtml — maths in the repro documents", () => {
  it.each([
    ["quiz", QUIZ],
    ["worksheet", WORKSHEET],
  ])("renders every maths node of the %s with KaTeX", (_name, markdown) => {
    const html = markdownToHtml(markdown);
    const latex = mathNodes(html);

    expect(latex.length).toBeGreaterThan(0);
    for (const expression of latex) {
      expect(() => katex.renderToString(expression, { throwOnError: true })).not.toThrow();
    }
    const text = textOutsideMath(html);
    expect(text).not.toContain("\\");
    expect(text).not.toContain("$");
  });

  it("keeps Portuguese prose out of maths", () => {
    const latex = mathNodes(markdownToHtml(QUIZ));

    expect(latex).toEqual(
      expect.arrayContaining(["\\frac{1}{2}", "\\frac{2}{4}", "\\frac{5}{5}", "\\frac{2}{3}", "\\frac{3}{4}"]),
    );
    expect(latex.some((expression) => /maior|igual|é/.test(expression))).toBe(false);
  });

  it("boxes the blanks inside the worksheet fractions", () => {
    const latex = mathNodes(markdownToHtml(WORKSHEET));

    expect(latex).toContain("\\frac{1}{2} = \\frac{\\square}{4}");
    expect(latex).toContain("\\frac{1}{2} \\, \\square \\, \\frac{2}{4}");
  });

  it("puts an option's cross-reference back on its option line", () => {
    const html = markdownToHtml(QUIZ);

    expect(html).toContain("(D) Ambas (A) e (C)");
    expect(html).not.toMatch(/\(D\) Ambas\s*<br\s*\/?>\s*\(A\) e \(C\)/);
  });

  it("does not split an option that refers to other options", () => {
    const html = markdownToHtml(
      "1. Qual é equivalente a $\\frac{1}{2}$? (A) $\\frac{2}{4}$ (B) $\\frac{3}{5}$ (C) $\\frac{5}{10}$ (D) Ambas (A) e (C)",
    );

    expect(html).toContain("(D) Ambas (A) e (C)");
  });
});
