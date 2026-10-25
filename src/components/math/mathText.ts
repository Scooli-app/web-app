import type { JSONContent } from "@tiptap/core";
import { splitInlineMath, type InlineSegment } from "@/components/document-editor-v2/inline-math";

/**
 * Which `$…$` are formulas follows the renderer of the text: "slide" keeps prices ("custa $5") as text
 * (inline-math.ts, slides and their exports); "sheet" is the exercise sheet's InlineText, where any `$…$` pair is a
 * formula. A field edits by its renderer's rule, so what shows as a formula is what edits as one.
 */
export type MathRule = "slide" | "sheet";

/** The exercise sheet's rule (components/blocks/inline-text.tsx): a `$` and the next `$` enclose a formula. */
function splitSheetMath(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let i = 0;
  let buf = "";
  while (i < text.length) {
    const end = text[i] === "$" ? text.indexOf("$", i + 1) : -1;
    if (end === -1) {
      buf += text[i];
      i += 1;
      continue;
    }
    if (buf) out.push({ kind: "text", text: buf });
    buf = "";
    out.push({ kind: "math", tex: text.slice(i + 1, end), raw: text.slice(i, end + 1) });
    i = end + 1;
  }
  if (buf) out.push({ kind: "text", text: buf });
  return out;
}

const split = (text: string, rule: MathRule) => (rule === "sheet" ? splitSheetMath(text) : splitInlineMath(text));

/**
 * A stored text field ("Calcula $\frac{3}{4}$.") as an editor document with formula nodes, and back. A formula keeps
 * how it was written (`raw`) until it is changed, so untouched text comes back byte for byte.
 */
export function textToDoc(text: string, multiline: boolean, rule: MathRule = "slide"): JSONContent {
  const lines = multiline ? text.split("\n") : [text];
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line
        ? split(line, rule).map((s) =>
            s.kind === "text"
              ? { type: "text", text: s.text }
              : { type: "inlineMath", attrs: { latex: s.tex, raw: s.raw } },
          )
        : undefined,
    })),
  };
}

/** An edited formula as text that reads back as the same formula under the rule. */
function writeFormula(latex: string, before: string, after: string, rule: MathRule): string {
  // A dollar inside would end the formula early.
  const safe = latex.replace(/\\\$/g, "\\text{\\textdollar}");
  // On slides a closing "$" before a digit reads as a price; "$$…$$" has no such exception there.
  const display = rule === "slide" && (/^\d/.test(after) || before.endsWith("$") || after.startsWith("$"));
  return display ? `$$${safe}$$` : `$${safe}$`;
}

function nodesText(nodes: JSONContent[], rule: MathRule): string {
  let out = "";
  nodes.forEach((node, i) => {
    if (node.type === "text") out += node.text ?? "";
    else if (node.type === "hardBreak") out += "\n";
    else if (node.type === "inlineMath") {
      const latex = String(node.attrs?.latex ?? "").trim();
      if (!latex) return;
      const raw = node.attrs?.raw as string | undefined;
      const first = raw ? split(raw, rule)[0] : undefined;
      // Unchanged: as it was written. Changed: written so it reads back as a formula.
      if (raw && first?.kind === "math" && first.tex.trim() === latex) out += raw;
      else out += writeFormula(latex, out, nodesText(nodes.slice(i + 1, i + 2), rule), rule);
    } else out += nodesText(node.content ?? [], rule);
  });
  return out;
}

export function docToText(doc: JSONContent, rule: MathRule = "slide"): string {
  return (doc.content ?? []).map((p) => nodesText(p.content ?? [], rule)).join("\n");
}
