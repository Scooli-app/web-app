/**
 * Removes HTML tags, repeating until none are left so that a tag split by another one
 * (`<scr<b>ipt>`) cannot come back after a single pass. For plain text only (previews,
 * fallbacks): the result is still not safe to insert as HTML.
 */
export function stripHtmlTags(input: string): string {
  let previous: string;
  do {
    previous = input;
    input = input.replace(/<[^>]*>/g, "");
  } while (input !== previous);
  return input;
}
