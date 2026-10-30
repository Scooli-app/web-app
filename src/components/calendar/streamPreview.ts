/** How much of the end of the stream the lesson dialog shows while a lesson plan is written. */
const TAIL_LENGTH = 280;

/**
 * The end of a lesson plan stream as plain text. The stream arrives as JSON-escaped markdown (often escaped twice, so
 * a line break reads `\\n`); shown as is it looks like broken text. This turns the escapes back into characters, drops
 * the markdown marks and any JSON key it starts with, and keeps the last few lines, cut at a word.
 */
export function streamPreviewTail(stream: string, length: number = TAIL_LENGTH): string {
  const text = stream
    .replace(/^\s*\{\s*"[^"]*"\s*:\s*"/, "")
    .replace(/\\+r\\+n|\\+n/g, "\n")
    .replace(/\\+t/g, " ")
    .replace(/\\+(["'\\])/g, "$1")
    .replace(/\\+/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*|__|`/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length <= length) return text;
  const tail = text.slice(-length);
  const firstBreak = tail.search(/\s/);
  return `…${firstBreak >= 0 ? tail.slice(firstBreak + 1) : tail}`;
}
