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
