import { toLocalIso } from "@/components/onboarding-v2/freeWeek";
import { hasTopic } from "@/shared/utils/lessonTopic";

export interface WeekSlotLike {
  id: string;
  slotType: string;
  status: string;
  topicTitle?: string | null;
}

export interface WeekClassification {
  pendingIds: string[];
  failedIds: string[];
  /** Something is still pending, generating or failed. */
  needsWork: boolean;
  /** Every first-week lesson is completed: only then may the resume marker go. */
  canClearMarker: boolean;
}

/** Splits the first week's lessons into what still needs generating or retrying. */
export function classifyWeek(slots: WeekSlotLike[]): WeekClassification {
  const relevant = slots.filter(
    (slot) => slot.slotType !== "HOLIDAY" && slot.status !== "skipped" && hasTopic(slot),
  );
  const pendingIds = relevant
    .filter((slot) => slot.status === "pending" || slot.status === "generating")
    .map((slot) => slot.id);
  const failedIds = relevant.filter((slot) => slot.status === "failed").map((slot) => slot.id);
  const needsWork = pendingIds.length > 0 || failedIds.length > 0;
  return { pendingIds, failedIds, needsWork, canClearMarker: !needsWork };
}

/**
 * Retries failed lessons one by one (the week endpoint only picks pending ones).
 * `generateOne` resolves true when the lesson was generated. Never throws.
 */
export async function retryFailedLessons(
  ids: string[],
  generateOne: (id: string) => Promise<boolean>,
  options: { shouldStop?: () => boolean } = {},
): Promise<{ problem: boolean }> {
  let problem = false;
  for (const id of ids) {
    let ok = false;
    try {
      ok = await generateOne(id);
    } catch {
      ok = false;
    }
    if (!ok) problem = true;
    if (options.shouldStop?.()) break;
  }
  return { problem };
}

/**
 * The class's first lesson after the free week (its Sunday is weekStart + 6), for when that week has none left:
 * onboarding then prepares this one so the teacher always lands with the next lesson ready.
 */
export function nextLessonAfter<T extends WeekSlotLike & { slotDate: string }>(
  slots: T[],
  weekStart: string,
): T | null {
  const start = new Date(`${weekStart}T00:00:00`);
  const weekEnd = toLocalIso(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
  return (
    slots
      .filter(
        (slot) =>
          slot.slotType === "LESSON" &&
          slot.status !== "skipped" &&
          hasTopic(slot) &&
          slot.slotDate > weekEnd,
      )
      .sort((a, b) => a.slotDate.localeCompare(b.slotDate))[0] ?? null
  );
}
