import DiffMatchPatch from "diff-match-patch";

export interface DiffChange {
  type: "insert" | "delete" | "equal";
  text: string;
  startPos: number;
  endPos: number;
}

/**
 * Normalize markdown text for better diff comparison
 * Reduces noise from minor formatting differences
 */
function normalizeMarkdown(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    // Normalize multiple spaces to single space
    .replace(/ +/g, " ")
    // Normalize multiple newlines (but preserve paragraph breaks)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Computes the differences between two text strings
 */
export function computeDiff(oldText: string, newText: string): DiffChange[] {
  const dmp = new DiffMatchPatch();
  
  // Normalize both texts before comparing
  const normalizedOld = normalizeMarkdown(oldText);
  const normalizedNew = normalizeMarkdown(newText);
  
  // First, do a character-based diff
  const diffs = dmp.diff_main(normalizedOld, normalizedNew);
  
  // Clean up semantically - merges small changes into larger ones
  dmp.diff_cleanupSemantic(diffs);
  
  // Further cleanup to reduce noise - merge changes that are very close together
  dmp.diff_cleanupEfficiency(diffs);

  const changes: DiffChange[] = [];
  let position = 0;

  for (const [operation, text] of diffs) {
    const startPos = position;
    const endPos = position + text.length;

    if (operation === DiffMatchPatch.DIFF_INSERT) {
      changes.push({
        type: "insert",
        text,
        startPos,
        endPos,
      });
      position = endPos;
    } else if (operation === DiffMatchPatch.DIFF_DELETE) {
      changes.push({
        type: "delete",
        text,
        startPos,
        endPos,
      });
      // Don't advance position for deletes
    } else {
      // DIFF_EQUAL
      changes.push({
        type: "equal",
        text,
        startPos,
        endPos,
      });
      position = endPos;
    }
  }

  return changes;
}

/**
 * Applies accepted changes to get the new text
 */
export function applyDiffChanges(
  oldText: string,
  newText: string,
  acceptedChanges: Set<number>
): string {
  const changes = computeDiff(oldText, newText);
  let result = "";

  changes.forEach((change, index) => {
    if (change.type === "equal") {
      result += change.text;
    } else if (change.type === "insert") {
      if (acceptedChanges.has(index)) {
        result += change.text;
      }
    } else if (change.type === "delete") {
      if (!acceptedChanges.has(index)) {
        // If delete is rejected, keep the old text
        result += change.text;
      }
    }
  });

  return result;
}
