/**
 * List items that already carry their own marker ("A) …", "b) …", "1. …"), such as
 * the multiple-choice options the presentation generator writes, must not get a second
 * number or bullet in front ("1. A) …").
 */
const OWN_MARKER = /^\s*(?:[A-H][).]|[a-h]\)|\d{1,2}[.)])\s/;

export function itemsCarryOwnMarkers(items: readonly string[]): boolean {
  return items.length > 0 && items.every((item) => OWN_MARKER.test(item));
}

/** Prefix to render before list item `index`: "1. ", "• " or "" when the items carry their own markers. */
export function listItemPrefix(ordered: boolean, items: readonly string[], index: number, bullet = "•"): string {
  if (itemsCarryOwnMarkers(items)) return "";
  return ordered ? `${index + 1}. ` : `${bullet} `;
}
