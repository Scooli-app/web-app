/**
 * Guard for AI-returned document content before it is allowed to replace the
 * document the user is editing.
 *
 * A chat turn that only answers a question must not touch the document. Besides
 * null/undefined/blank, this also rejects the literal strings "null" and
 * "undefined": those are what a JSON null degrades into when it is stringified
 * along the way, and letting one through replaces the whole document with four
 * characters.
 */
export function isUsableDocumentContent(
  content: string | null | undefined,
): content is string {
  if (typeof content !== "string") {
    return false;
  }
  const normalized = content.trim();
  if (!normalized) {
    return false;
  }
  return (
    normalized.toLowerCase() !== "null" && normalized.toLowerCase() !== "undefined"
  );
}
