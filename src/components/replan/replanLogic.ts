import type { ReplanChange, ReplanItem, ReplanProposal } from "@/shared/types/replan";

/** Message key (under `replan`) of each change label. */
export const CHANGE_LABEL_KEY: Record<ReplanChange, string> = {
  retitled: "changeRetitled",
  extended: "changeExtended",
  merged: "changeMerged",
  reinforcement: "changeReinforcement",
};

/** Every lesson checked by default. */
export function initialSelection(items: ReplanItem[]): Set<string> {
  return new Set(items.map((item) => item.slotId));
}

/**
 * The `slotIds` body of accept: null when every change is checked (the backend reads that as "all"),
 * otherwise the checked lessons in timeline order.
 */
export function acceptPayload(items: ReplanItem[], selected: ReadonlySet<string>): string[] | null {
  if (items.every((item) => selected.has(item.slotId))) return null;
  return items.filter((item) => selected.has(item.slotId)).map((item) => item.slotId);
}

/** Outcomes the proposal adds to a lesson: the after list minus what the lesson already had. */
export function newOutcomes(item: ReplanItem): string[] {
  const before = new Set(item.before.outcomeTexts);
  return item.after.outcomeTexts.filter((text) => !before.has(text));
}

/** Items in date order, then by sequence number, so the timeline reads top to bottom. */
export function timelineOrder(items: ReplanItem[]): ReplanItem[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date) || a.sequenceNumber - b.sequenceNumber);
}

/** What the turma page's banner shows for the latest proposal. `null` means nothing to show. */
export type ReplanBannerState =
  | { kind: "generating" }
  | { kind: "pending"; count: number }
  | { kind: "noChange"; summary: string | null }
  | { kind: "failed"; triggerSlotId: string | null };

export function bannerState(proposal: ReplanProposal | null): ReplanBannerState | null {
  if (!proposal) return null;
  if (proposal.status === "generating") return { kind: "generating" };
  if (proposal.status === "pending") return { kind: "pending", count: proposal.items.length };
  if (proposal.status === "no_change") return { kind: "noChange", summary: proposal.summary };
  return { kind: "failed", triggerSlotId: proposal.triggerSlotId };
}

/** The toast a watch shows once a proposal settles: ready to review, nothing to change (info), or failed. */
export function settledToast(proposal: ReplanProposal): "ready" | "noChange" | "failed" {
  if (proposal.status === "pending") return "ready";
  if (proposal.status === "no_change") return "noChange";
  return "failed";
}

/**
 * Polls `load` until `isSettled` accepts a result. Resolves with that result, or undefined when the signal
 * aborts or `maxAttempts` run out. Checks at once unless `delayFirst` is set, for callers that already made
 * their first request. Never resolves after the signal aborts, so an unmounted screen stops polling.
 */
export async function pollUntilSettled<T>(
  load: () => Promise<T>,
  isSettled: (value: T) => boolean,
  {
    intervalMs,
    maxAttempts,
    signal,
    delayFirst = false,
  }: { intervalMs: number; maxAttempts: number; signal: AbortSignal; delayFirst?: boolean },
): Promise<T | undefined> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0 || delayFirst) await delay(intervalMs, signal);
    if (signal.aborted) return undefined;
    const value = await load();
    if (signal.aborted) return undefined;
    if (isSettled(value)) return value;
  }
  return undefined;
}

/** Resolves after `ms`, or at once when the signal aborts. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done);
  });
}

/** The banner and the toast check the proposal every 5 s; after 5 minutes they stop and the banner's next load takes over. */
export const REPLAN_POLL_MS = 5000;
export const REPLAN_MAX_POLLS = 60;

/** Fired on the window when a proposal is requested or settles, with `detail.timetableId`: the turma banner reloads. */
export const REPLAN_CHANGED_EVENT = "scooli:replan-changed";
