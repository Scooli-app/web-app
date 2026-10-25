import { describe, expect, it } from "vitest";
import { hasInlineMath, inlineMathTex, layoutInlineMath, replaceInlineMath, splitInlineMath } from "./inline-math";

const measure = (s: string) => s.length * 10;
const box = () => ({ width: 40, height: 30 });

describe("splitInlineMath", () => {
  it("separates text and formulas", () => {
    expect(splitInlineMath("Metade é $\\frac{2}{4}$ ou $$0{,}5$$.")).toEqual([
      { kind: "text", text: "Metade é " },
      { kind: "math", tex: "\\frac{2}{4}", raw: "$\\frac{2}{4}$" },
      { kind: "text", text: " ou " },
      { kind: "math", tex: "0{,}5", raw: "$$0{,}5$$" },
      { kind: "text", text: "." },
    ]);
  });

  it("leaves prices and lone dollars as text", () => {
    expect(hasInlineMath("Custa $5 e $6 no total")).toBe(false);
    expect(hasInlineMath("Só um $ aqui")).toBe(false);
    expect(hasInlineMath("Área: $x^2$")).toBe(true);
  });
});

describe("inlineMathTex / replaceInlineMath", () => {
  const text = "Se $a = 3$, então $a^2 = 9$ e custa $5 e $6.";

  it("reads and rewrites one formula by its number, leaving prices alone", () => {
    expect(inlineMathTex(text, 1)).toBe("a^2 = 9");
    expect(inlineMathTex(text, 2)).toBeUndefined();
    expect(replaceInlineMath(text, 1, "\\frac{a}{b}")).toBe("Se $a = 3$, então $\\frac{a}{b}$ e custa $5 e $6.");
  });
});

describe("layoutInlineMath", () => {
  it("numbers formulas across lines in reading order", () => {
    const lines = layoutInlineMath("$a$ x\n$b$ $c$", 500, measure, box, 20);
    const indexes = lines.flatMap((l) => l.items.flatMap((i) => (i.kind === "math" ? [i.index] : [])));
    expect(indexes).toEqual([0, 1, 2]);
  });

  it("wraps words and keeps formulas whole, growing the line for a tall formula", () => {
    const lines = layoutInlineMath("ab cd $x$ ef", 70, measure, box, 20);
    expect(lines.map((l) => l.items.map((i) => (i.kind === "text" ? i.text : `[${i.tex}]`)).join(""))).toEqual([
      "ab cd",
      "[x] ef",
    ]);
    expect(lines[0].height).toBe(20);
    expect(lines[1].height).toBe(30);
    expect(lines[0].width).toBe(50); // the trailing space before the break is dropped
  });

  it("starts a new line at every newline", () => {
    const lines = layoutInlineMath("• $a$\n• b", 500, measure, box, 20);
    expect(lines).toHaveLength(2);
    expect(lines[1].items.map((i) => (i.kind === "text" ? i.text : i.tex)).join("")).toBe("• b");
  });
});
