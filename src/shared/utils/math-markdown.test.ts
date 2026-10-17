import { describe, expect, it } from "vitest";

import { normalizeMathMarkdown } from "./math-markdown";

// The broken inputs are the exact lines of the production quiz 9d44d7c6 and worksheet bd00c960
// (4.º ano, "Frações", 2026-10-15) that showed students raw or garbled LaTeX. The same cases are
// in chalkboard's MathMarkdownNormalizerTest; keep the two ports in step.

describe("normalizeMathMarkdown — closing $ mangled into a backslash (quiz 9d44d7c6)", () => {
  it.each([
    [
      "Qual das seguintes frações é equivalente a $\\frac{1}{2}\\?",
      "Qual das seguintes frações é equivalente a $\\frac{1}{2}$?",
    ],
    ["(A) $\\frac{2}{4}\\", "(A) $\\frac{2}{4}$"],
    ["(B) $\\frac{3}{5}\\", "(B) $\\frac{3}{5}$"],
    ["(C) $\\frac{5}{10}\\", "(C) $\\frac{5}{10}$"],
    ["A fração $\\frac{5}{5}\\ é igual a 1.", "A fração $\\frac{5}{5}$ é igual a 1."],
    // Before: "$\frac{2}{3}\ é maior que $" was one span, so the sentence rendered as maths italic.
    [
      "A fração $\\frac{2}{3}\\ é maior que $\\frac{3}{4}\\.",
      "A fração $\\frac{2}{3}$ é maior que $\\frac{3}{4}$.",
    ],
    [
      "A fração $\\frac{2}{3}\\$ é maior que $\\frac{3}{4}\\$.",
      "A fração $\\frac{2}{3}$ é maior que $\\frac{3}{4}$.",
    ],
    ["(A) $\\frac{2}{4}\\\\", "(A) $\\frac{2}{4}$"],
    [
      "Calcula $\\frac{1}{4} + \\frac{2}{4} e simplifica.",
      "Calcula $\\frac{1}{4} + \\frac{2}{4}$ e simplifica.",
    ],
    ["Quanto é $3 + 4?", "Quanto é $3 + 4$?"],
  ])("%s", (input, expected) => {
    expect(normalizeMathMarkdown(input)).toBe(expected);
  });
});

describe("normalizeMathMarkdown — prose inside a closed span", () => {
  it.each([
    [
      "V/F: $\\frac{2}{3} é maior que \\frac{3}{4}$",
      "V/F: $\\frac{2}{3}$ é maior que $\\frac{3}{4}$",
    ],
    ["$x é igual a 2$", "$x$ é igual a $2$"],
    ["Liga $\\frac{1}{2} e \\frac{2}{4}$", "Liga $\\frac{1}{2}$ e $\\frac{2}{4}$"],
  ])("%s", (input, expected) => {
    expect(normalizeMathMarkdown(input)).toBe(expected);
  });
});

describe("normalizeMathMarkdown — raw LaTeX and blanks (worksheet bd00c960)", () => {
  it.each([
    ["a) \\frac{1}{2} = \\frac{___}{4}", "a) $\\frac{1}{2} = \\frac{\\square}{4}$"],
    ["b) \\frac{3}{6} = \\frac{___}{12}", "b) $\\frac{3}{6} = \\frac{\\square}{12}$"],
    ["c) \\frac{2}{5} = \\frac{___}{10}", "c) $\\frac{2}{5} = \\frac{\\square}{10}$"],
    ["a) $\\frac{1}{2} = \\frac{___}{4}$", "a) $\\frac{1}{2} = \\frac{\\square}{4}$"],
    [
      "a) $\\frac{1}{2}$ e $\\frac{2}{4}$: \\frac{1}{2} \\, ___ \\, \\frac{2}{4}",
      "a) $\\frac{1}{2}$ e $\\frac{2}{4}$: $\\frac{1}{2} \\, \\square \\, \\frac{2}{4}$",
    ],
    [
      "b) $\\frac{3}{5}$ e $\\frac{4}{5}$: $\\frac{3}{5} \\, ___ \\, \\frac{4}{5}$",
      "b) $\\frac{3}{5}$ e $\\frac{4}{5}$: $\\frac{3}{5} \\, \\square \\, \\frac{4}{5}$",
    ],
    [
      "$\\frac{\\_\\_}{8}$ e $3 + \\_\\_ = 7$ e $\\frac{_}{8}$",
      "$\\frac{\\square}{8}$ e $3 + \\square = 7$ e $\\frac{\\square}{8}$",
    ],
    ["$$\\frac{1}{2} = \\frac{___}{4}$$", "$$\\frac{1}{2} = \\frac{\\square}{4}$$"],
    ["$$\n\\frac{1}{2} = \\frac{___}{4}\n$$", "$$\n\\frac{1}{2} = \\frac{\\square}{4}\n$$"],
    ["- \\frac{1}{2} (metade)", "- $\\frac{1}{2}$ (metade)"],
    ["| 1 | \\frac{1}{2} | ___ |", "| 1 | $\\frac{1}{2}$ | ___ |"],
    ["Calcula 3 \\times 4 = 12.", "Calcula $3 \\times 4 = 12$."],
  ])("%s", (input, expected) => {
    expect(normalizeMathMarkdown(input)).toBe(expected);
  });
});

describe("normalizeMathMarkdown — well-formed content is left alone", () => {
  it.each([
    "Na fração $\\frac{3}{4}$, qual é o numerador?",
    "$x^2 + bx + c = 0$",
    "$F_{atrito} = \\mu \\cdot N$ e $v = \\frac{d}{t}$",
    "$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
    "A área de $[ABCD]$ é $25\\%$ do total.",
    "$\\text{Área} = b \\times h$",
    "$5\\,\\text{cm}$ e $e^x$ e $\\sin x$ e $a\\ b$",
    "Completa: $\\frac{24}{\\square} = 6$",
    "$$F = m \\cdot a$$",
    "$$\n\\frac{a}{b} + \\frac{c}{d}\n$$",
    "Custa 5\\$ por pessoa.",
    "`$\\frac{1}{2}\\?` em código fica como está",
    "```\n$\\frac{1}{2}\\?\n```",
    "Escape de markdown: \\* e \\_ e \\#",
    "Resposta: ______________\n\\_\\_\\_\\_\\_",
    "Sem matemática nenhuma.",
  ])("%s", (input) => {
    expect(normalizeMathMarkdown(input)).toBe(input);
  });

  it("is idempotent on the repaired repro lines", () => {
    const doc = [
      "Qual das seguintes frações é equivalente a $\\frac{1}{2}\\?",
      "(A) $\\frac{2}{4}\\",
      "A fração $\\frac{2}{3}\\ é maior que $\\frac{3}{4}\\.",
      "a) \\frac{1}{2} = \\frac{___}{4}",
      "a) $\\frac{1}{2}$ e $\\frac{2}{4}$: \\frac{1}{2} \\, ___ \\, \\frac{2}{4}",
    ].join("\n");
    const once = normalizeMathMarkdown(doc);
    expect(normalizeMathMarkdown(once)).toBe(once);
  });
});
