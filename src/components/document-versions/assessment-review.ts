/**
 * Pure model of an assessment suggestion's review. The backend splits a test/worksheet/quiz into one section per
 * exercise or reading box (keyed by its id), one per group header (`group:<id>`: title and instructions) and the
 * document settings (`_meta`), so each exercise is accepted or rejected on its own.
 */

import { normalizeItem } from "@/components/assessment-editor/model";
import type { AssessmentItem } from "@/types/assessment";
import type { SectionChange } from "@/shared/types/document-suggestions";
import { META_KEY, TITLE_KEY, reviewableChanges } from "./suggestion-review";

export const GROUP_KEY_PREFIX = "group:";

/** A document-level or group field whose value changed: shown as "before → after". */
export interface FieldChange {
  field: "title" | "instructions" | "targetTotal" | "school" | "gradeClass" | "duration";
  before: string | null;
  after: string | null;
}

/** What differs between two versions of an exercise, for a one-line "what changes" summary. */
export type ItemPart = "type" | "prompt" | "content" | "answer" | "points" | "notes" | "media" | "goals";

const PART_FIELDS: Record<ItemPart, string[]> = {
  type: ["type", "kind"],
  prompt: ["prompt", "title", "body"],
  content: ["options", "table", "categories", "words", "labels", "grid", "answerSpace"],
  answer: ["answer"],
  points: ["points"],
  notes: ["explanation", "criteria"],
  media: ["media"],
  goals: ["aeOutcomeIds"],
};

export function changedParts(before: AssessmentItem, after: AssessmentItem): ItemPart[] {
  const b = before as unknown as Record<string, unknown>;
  const a = after as unknown as Record<string, unknown>;
  return (Object.keys(PART_FIELDS) as ItemPart[]).filter((part) =>
    PART_FIELDS[part].some((f) => JSON.stringify(b[f] ?? null) !== JSON.stringify(a[f] ?? null)));
}

export type AssessmentChangeView =
  | { kind: "title"; change: SectionChange }
  | { kind: "settings" | "group"; change: SectionChange; fields: FieldChange[] }
  | {
      kind: "item";
      change: SectionChange;
      before: AssessmentItem | null;
      after: AssessmentItem | null;
      /** Exercise number in the suggested version (in the current one for a removed exercise); null for reading boxes. */
      number: number | null;
      /** For a changed item: what differs. Only "points" (a rebalance) needs no before/after render. */
      parts: ItemPart[];
    };

function parse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseItem(raw: string | null): AssessmentItem | null {
  const value = parse(raw);
  return value && typeof value.id === "string" ? normalizeItem(value as unknown as AssessmentItem) : null;
}

const text = (value: unknown): string | null =>
  value === null || value === undefined || value === "" ? null : String(value);

function fieldChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  fields: FieldChange["field"][],
): FieldChange[] {
  return fields
    .map((field) => ({ field, before: text(before?.[field]), after: text(after?.[field]) }))
    .filter((f) => f.before !== f.after);
}

const header = (meta: Record<string, unknown> | null) => (meta?.header ?? null) as Record<string, unknown> | null;

/** The reviewable changes of an assessment suggestion, in document order, ready to render. */
export function assessmentChanges(changes: SectionChange[]): AssessmentChangeView[] {
  // Numbers follow document order over every item, unchanged ones included.
  const numbers = new Map<string, number>();
  let after = 0;
  let before = 0;
  for (const change of [...changes].sort((a, b) => a.position - b.position)) {
    if (change.key === TITLE_KEY || change.key === META_KEY || change.key.startsWith(GROUP_KEY_PREFIX)) continue;
    const isExercise = (raw: string | null) => parse(raw)?.kind === "exercise";
    if (change.type !== "added" && isExercise(change.before)) before++;
    if (change.type !== "removed" && isExercise(change.after)) after++;
    if (change.type === "removed" ? isExercise(change.before) : isExercise(change.after)) {
      numbers.set(change.key, change.type === "removed" ? before : after);
    }
  }

  return reviewableChanges(changes).map((change): AssessmentChangeView => {
    if (change.key === TITLE_KEY) return { kind: "title", change };
    if (change.key === META_KEY) {
      const b = parse(change.before);
      const a = parse(change.after);
      return {
        kind: "settings",
        change,
        fields: [
          ...fieldChanges(b, a, ["title", "targetTotal"]),
          ...fieldChanges(header(b), header(a), ["school", "gradeClass", "duration"]),
        ],
      };
    }
    if (change.key.startsWith(GROUP_KEY_PREFIX)) {
      return { kind: "group", change, fields: fieldChanges(parse(change.before), parse(change.after), ["title", "instructions"]) };
    }
    const b = parseItem(change.before);
    const a = parseItem(change.after);
    return {
      kind: "item",
      change,
      before: b,
      after: a,
      number: numbers.get(change.key) ?? null,
      parts: a && b ? changedParts(b, a) : [],
    };
  });
}
