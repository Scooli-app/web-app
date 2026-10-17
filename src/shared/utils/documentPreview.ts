const MAX_LENGTH = 160;

/** Markdown to plain text: no tags, emphasis, links, images or backslash escapes. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/<[^>]*>/g, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, "$1");
}

function truncate(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_LENGTH ? `${clean.slice(0, MAX_LENGTH).trimEnd()}…` : clean;
}

function presentationTitles(content: string): string | null {
  if (!content.trimStart().startsWith("{")) return null;
  try {
    const obj = JSON.parse(content) as Record<string, unknown>;
    if (obj.documentType !== "presentation") return null;
    if (obj.schemaVersion === 2) {
      type V2Slide = { elements?: Array<{ type: string; role?: string; text?: string }> };
      return ((obj.slides as V2Slide[] | undefined) ?? [])
        .slice(0, 4)
        .map((s) => s.elements?.find((e) => e.type === "text" && e.role === "title")?.text ?? "")
        .filter(Boolean)
        .join(" · ");
    }
    type V1Block = { title?: string };
    return ((obj.blocks as V1Block[] | undefined) ?? [])
      .slice(0, 4)
      .map((b) => b.title ?? "")
      .filter(Boolean)
      .join(" · ");
  } catch {
    return null;
  }
}

/**
 * A short, distinguishing preview of a document for its card: the Sumário when
 * there is one, otherwise the first line of prose — never the "Disciplina: …"
 * identification fields every lesson plan starts with. Empty when there is nothing.
 */
export function getDocumentPreview(content: string): string {
  if (!content?.trim()) return "";

  const titles = presentationTitles(content);
  if (titles !== null) return titles;

  const lines = toPlainText(content).split("\n").map((l) => l.trim());

  const summary = lines.find((l) => /^[-•*]?\s*sum[aá]rio\s*:/i.test(l));
  if (summary) {
    const text = summary.replace(/^[-•*]?\s*sum[aá]rio\s*:\s*/i, "");
    if (text) return truncate(text);
  }

  const prose = lines.find(
    (l) =>
      l.length > 0 &&
      !/^#{1,6}\s/.test(l) &&
      // table rows and separators
      !l.startsWith("|") &&
      // "- Disciplina: Matemática" style identification fields
      !/^[-•*]?\s*[^:]{1,40}:\s*\S/.test(l) &&
      // a section number on its own, like "1. Identificação"
      !/^\d+\.\s+\S+$/.test(l),
  );
  return truncate((prose ?? lines.find((l) => l.length > 0) ?? "").replace(/^[-•*]\s+/, ""));
}
