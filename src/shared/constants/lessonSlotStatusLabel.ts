import type { LessonSlotStatus } from "@/services/api/timetable.service";

/**
 * Class State introduces a classroom outcome alongside the existing slot status.
 * While the feature is enabled, make it explicit that this status describes only
 * lesson-plan generation. The legacy labels remain untouched while the flag is off.
 */
export function getLessonSlotStatusTranslationKey(
  status: LessonSlotStatus,
  classStateEnabled: boolean,
): `status.${LessonSlotStatus}` | `generationStatus.${LessonSlotStatus}` {
  return classStateEnabled
    ? `generationStatus.${status}`
    : `status.${status}`;
}
