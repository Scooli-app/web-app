/**
 * Formulas are stored as LaTeX; the formula field (MathLive) shows them as maths. A fill-in-the-gaps blank is
 * "___" in storage and an empty box in the field.
 */
const BLANK = "___";
const BOX = "\\placeholder{}";

export function toFieldTex(tex: string): string {
  return tex.split(BLANK).join(BOX);
}

/** The field's LaTeX for storage. Untouched (apart from spacing): the original, byte for byte. */
export function fromFieldTex(fieldTex: string, original: string): string {
  const squash = (s: string) => s.replace(/\s+/g, "");
  if (squash(fieldTex) === squash(toFieldTex(original))) return original;
  return fieldTex.replace(/\\placeholder(\[[^\]]*\])?\{\s*\}/g, BLANK);
}
