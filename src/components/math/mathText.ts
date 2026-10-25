import type { JSONContent } from "@tiptap/core";
import { splitInlineMath } from "@/components/document-editor-v2/inline-math";

/**
 * A stored text field ("Calcula $\frac{3}{4}$.") as an editor document with formula nodes, and back. Same split rule
 * as rendering, so what shows as a formula is what edits as one. A formula keeps how it was written (`raw`) until
 * it is changed, so untouched text comes back byte for byte.
 */
export function textToDoc(text: string, multiline: boolean): JSONContent {
  const lines = multiline ? text.split("\n") : [text];
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line
        ? splitInlineMath(line).map((s) =>
            s.kind === "text"
              ? { type: "text", text: s.text }
              : { type: "inlineMath", attrs: { latex: s.tex, raw: s.raw } },
          )
        : undefined,
    })),
  };
}

function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  if (node.type === "inlineMath") {
    const latex = String(node.attrs?.latex ?? "").trim();
    if (!latex) return "";
    const raw = node.attrs?.raw as string | undefined;
    // Unchanged: as it was written. Changed: `$…$`, the form the rest of the app writes.
    return raw && splitInlineMath(raw)[0]?.kind === "math" && (splitInlineMath(raw)[0] as { tex: string }).tex === latex
      ? raw
      : `$${latex}$`;
  }
  return (node.content ?? []).map(nodeText).join("");
}

export function docToText(doc: JSONContent): string {
  return (doc.content ?? []).map(nodeText).join("\n");
}
