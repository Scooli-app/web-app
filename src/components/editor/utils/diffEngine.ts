/**
 * Diff Engine — Computes structural diffs between two ProseMirror documents.
 *
 * Pipeline:
 *   1. Convert AI markdown → HTML → ProseMirror Node (same schema as editor)
 *   2. Use recreateTransform to generate steps between baseDoc and aiDoc
 *   3. Feed steps into prosemirror-changeset to get Change[]
 *   4. Normalize into our DiffChange[] type
 */

import { markdownToHtml } from "@/shared/utils/markdown";
import { recreateTransform } from "@manuscripts/prosemirror-recreate-steps";
import type { Node, Schema } from "@tiptap/pm/model";
import { DOMParser as ProseMirrorDOMParser, Slice } from "@tiptap/pm/model";
import { ChangeSet, simplifyChanges } from "prosemirror-changeset";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiffChange {
  id: string;
  type: "insert" | "delete" | "replace";
  /** Position in the OLD document (baseDoc) */
  fromA: number;
  toA: number;
  /** Position in the NEW document (aiDoc / the doc shown in editor) */
  fromB: number;
  toB: number;
  /** Slice of inserted content (from aiDoc) */
  insertedSlice?: Slice;
  /** Slice of deleted content (from baseDoc) */
  deletedSlice?: Slice;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let changeCounter = 0;

function generateId(): string {
  return `diff-${Date.now()}-${++changeCounter}`;
}

/**
 * Convert a markdown string into a ProseMirror Node using the given schema.
 * Uses the same markdown→HTML pipeline as the editor so the structure matches.
 */
export function markdownToNode(markdown: string, schema: Schema): Node {
  const html = markdownToHtml(markdown);

  // Create a temporary DOM element to parse HTML
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  return ProseMirrorDOMParser.fromSchema(schema).parse(wrapper);
}

// ---------------------------------------------------------------------------
// Core diff computation
// ---------------------------------------------------------------------------

/**
 * Compute the structural diff between a base document and an AI-generated document.
 *
 * @param baseDoc  The current editor document (editor.state.doc)
 * @param aiDoc    The AI-generated document (already parsed as ProseMirror Node)
 * @returns        Normalized array of DiffChange objects
 */
export function computeDiff(baseDoc: Node, aiDoc: Node): DiffChange[] {
  // 1. Recreate the transform (steps) from baseDoc → aiDoc
  const tr = recreateTransform(baseDoc, aiDoc, /* complexSteps */ true, /* wordDiffs */ false);

  // 2. Build a ChangeSet from the steps
  const stepMaps = tr.steps.map((step) => step.getMap());
  const changeSet = ChangeSet.create(baseDoc).addSteps(aiDoc, stepMaps, "ai");

  // 3. Simplify changes for cleaner presentation
  const simplified = simplifyChanges(changeSet.changes, aiDoc);

  // 4. Normalize into our DiffChange format
  const changes = normalizeDiff(simplified, baseDoc, aiDoc);

  // 5. Group changes by block (paragraph/list item) to avoid multiple small widgets on one line
  return groupByBlock(changes, baseDoc, aiDoc);
}

/**
 * Convert raw Change objects into our normalized DiffChange array.
 */
function normalizeDiff(
  changes: ReturnType<typeof simplifyChanges>,
  baseDoc: Node,
  aiDoc: Node
): DiffChange[] {
  const result: DiffChange[] = [];

  for (const change of changes) {
    const { fromA, toA, fromB, toB } = change;

    const hasDeleted = toA - fromA > 0;
    const hasInserted = toB - fromB > 0;

    let type: DiffChange["type"];
    if (hasDeleted && hasInserted) {
      type = "replace";
    } else if (hasInserted) {
      type = "insert";
    } else {
      type = "delete";
    }

    const diffChange: DiffChange = {
      id: generateId(),
      type,
      fromA,
      toA,
      fromB,
      toB,
    };

    // Capture slices for accept/reject operations
    if (hasInserted) {
      try {
        diffChange.insertedSlice = aiDoc.slice(fromB, toB);
      } catch { /* skip */ }
    }

    if (hasDeleted) {
      try {
        diffChange.deletedSlice = baseDoc.slice(fromA, toA);
      } catch { /* skip */ }
    }

    // --- Optimization: Ignore trailing empty paragraph changes ---
    // If this is a deletion at the very end of the document, and it's just an empty block, ignore it.
    // ProseMirror positions: doc structure is [0, size]. A paragraph is [pos, pos + nodeSize].
    // An empty paragraph is essentially 2 positions (start/end tokens).
    if (type === "delete" && toA >= baseDoc.content.size - 2) {
      const text = diffChange.deletedSlice ? sliceToText(diffChange.deletedSlice).trim() : "";
      if (!text) continue; // Skip trailing empty line removal
    }
    
    // Similarly for insertions of empty lines at the end
    if (type === "insert" && toB >= aiDoc.content.size - 2) {
      const text = diffChange.insertedSlice ? sliceToText(diffChange.insertedSlice).trim() : "";
      if (!text) continue; // Skip trailing empty line insertion
    }

    result.push(diffChange);
  }

  return result;
}

/**
 * Group changes that belong to the same parent block node.
 * Changes within the same block are merged into a single "replace" change.
 */
export function groupByBlock(changes: DiffChange[], baseDoc: Node, aiDoc: Node): DiffChange[] {
  if (changes.length <= 1) return changes;

  const grouped: DiffChange[] = [];
  let current: DiffChange | null = null;

  for (const change of changes) {
    if (!current) {
      current = { ...change };
      continue;
    }

    // Check if both changes share the same parent block
    const currentParent = resolveBlockParent(aiDoc, current.fromB);
    const changeParent = resolveBlockParent(aiDoc, change.fromB);

    if (currentParent === changeParent && currentParent !== null) {
      // Merge into current
      const fromA = Math.min(current.fromA, change.fromA);
      const toA = Math.max(current.toA, change.toA);
      const fromB = Math.min(current.fromB, change.fromB);
      const toB = Math.max(current.toB, change.toB);

      current = {
        id: current.id,
        type: "replace",
        fromA,
        toA,
        fromB,
        toB,
      };

      // Re-extract slices for the merged range
      try {
        current.insertedSlice = aiDoc.slice(fromB, toB);
      } catch (e) { /* ignore */ }
      
      try {
        current.deletedSlice = baseDoc.slice(fromA, toA);
      } catch (e) { /* ignore */ }

    } else {
      grouped.push(current);
      current = { ...change };
    }
  }

  if (current) {
    grouped.push(current);
  }

  return grouped;
}

/**
 * Resolve the top-level block parent position for a given document position.
 * Returns the position of the block parent, or null if it can't be resolved.
 */
function resolveBlockParent(doc: Node, pos: number): number | null {
  try {
    const $pos = doc.resolve(pos);
    // Get the depth of the nearest block parent (depth 1 = direct child of doc)
    const depth = Math.max(1, $pos.depth);
    return $pos.before(depth);
  } catch {
    return null;
  }
}
/**
 * Extract plain text from a Slice.
 */
function sliceToText(slice: Slice): string {
  let text = "";
  slice.content.forEach((node) => {
    if (node.isText) {
      text += node.text || "";
    } else if (node.isBlock) {
      if (text.length > 0) text += " ";
      node.descendants((child) => {
        if (child.isText) {
          text += child.text || "";
        }
        return true;
      });
    }
  });
  return text;
}
