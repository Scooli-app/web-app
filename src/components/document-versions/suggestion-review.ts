/**
 * Pure rules behind the suggested-version review (ENG-255): which sections are reviewable, the selection
 * state, the apply payload, the word diff and the polling loop. Kept apart from the components so they can
 * be tested without rendering.
 */

import { diffWords } from "diff";
import type { SectionChange } from "@/shared/types/document-suggestions";

export const POLL_INTERVAL_MS = 5000;

/** Section key of a presentation's deck-level settings (theme, schema), which is not a slide. */
export const META_KEY = "_meta";

/** Long sections are clamped with a "Ver tudo" toggle after this many lines. */
export const CLAMP_LINES = 12;

/** Sections the teacher can act on, in document order. Unchanged sections are not reviewable. */
export function reviewableChanges(changes: SectionChange[]): SectionChange[] {
  return changes
    .filter((change) => change.type !== "unchanged")
    .sort((a, b) => a.position - b.position);
}

export function unchangedCount(changes: SectionChange[]): number {
  return changes.filter((change) => change.type === "unchanged").length;
}

/** Every reviewable section starts selected. */
export function initialSelection(changes: SectionChange[]): Set<string> {
  return new Set(reviewableChanges(changes).map((change) => change.key));
}

export function toggleSection(selection: Set<string>, key: string): Set<string> {
  const next = new Set(selection);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Selects all sections, or clears the selection when every section is already selected. */
export function toggleAll(changes: SectionChange[], selection: Set<string>): Set<string> {
  const keys = reviewableChanges(changes).map((change) => change.key);
  const allSelected = keys.every((key) => selection.has(key));
  return allSelected ? new Set() : new Set(keys);
}

/**
 * The `sectionKeys` body for the apply call. `null` when every reviewable section is selected, so the
 * backend applies the whole suggestion; otherwise the selected keys in document order.
 */
export function applyPayload(changes: SectionChange[], selection: Set<string>): string[] | null {
  const reviewable = reviewableChanges(changes);
  if (reviewable.every((change) => selection.has(change.key))) return null;
  return reviewable.filter((change) => selection.has(change.key)).map((change) => change.key);
}

export function selectedCount(changes: SectionChange[], selection: Set<string>): number {
  return reviewableChanges(changes).filter((change) => selection.has(change.key)).length;
}

/**
 * Markdown as the teacher reads it in a diff: heading hashes and bold markers are dropped so they do not
 * read as code. Line breaks stay.
 */
export function toReadableText(markdown: string | null): string {
  return (markdown ?? "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1");
}

export function isLongText(readable: string): boolean {
  return readable.split("\n").length > CLAMP_LINES;
}

export interface DiffSegment {
  value: string;
  added: boolean;
  removed: boolean;
}

/** Word-level diff of a markdown section. Empty sides (new or removed sections) are treated as "". */
export function diffSegments(before: string | null, after: string | null): DiffSegment[] {
  return diffWords(toReadableText(before), toReadableText(after)).map((part) => ({
    value: part.value,
    added: part.added === true,
    removed: part.removed === true,
  }));
}

interface PollOptions {
  /** Resolves true once there is nothing left to wait for; the loop then stops. */
  check: () => Promise<boolean>;
  intervalMs?: number;
}

/**
 * Runs `check` every `intervalMs` until it resolves true or the returned stop function is called.
 * A failed check is retried on the next tick. Returns the stop function.
 */
export function pollUntilDone({ check, intervalMs = POLL_INTERVAL_MS }: PollOptions): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    if (!stopped) timer = setTimeout(tick, intervalMs);
  };

  const tick = async () => {
    try {
      if (await check()) return;
    } catch {
      // Transient failure: try again on the next tick.
    }
    schedule();
  };

  schedule();
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
