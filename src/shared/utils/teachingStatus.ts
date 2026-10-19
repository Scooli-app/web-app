import type { LessonSlotType } from "@/services/api/timetable.service";
import type { TeachingStatus } from "@/shared/types/check-in";

/** Slot types the backend accepts a check-in for. A holiday is never checkable. */
const CHECKABLE_SLOT_TYPES: readonly LessonSlotType[] = ["LESSON", "ASSESSMENT", "EXERCISE", "REVIEW"];

export interface TeachingSlotInput {
  slotType: LessonSlotType;
  /** YYYY-MM-DD */
  slotDate: string;
  status: string;
}

/** Keys of the `checkIns.mark` messages; each one is a short label for the glyph. */
export type TeachingMarkKey = "taught" | "partiallyTaught" | "notHeld" | "assumedTaught" | "unconfirmed";

export interface TeachingMark {
  key: TeachingMarkKey;
  glyph: string;
}

/**
 * A past, checkable, non-skipped slot: the only kind the backend takes a check-in for. Today and
 * future slots, skipped ones and holidays are not checkable. Dates are YYYY-MM-DD, so string order works.
 */
export function isCheckableSlot(slot: TeachingSlotInput, todayIso: string): boolean {
  return isPastCheckableType(slot, todayIso) && slot.status !== "skipped";
}

/** A past lesson of a checkable type, whatever its status (skipped included). */
function isPastCheckableType(slot: TeachingSlotInput, todayIso: string): boolean {
  return CHECKABLE_SLOT_TYPES.includes(slot.slotType) && slot.slotDate < todayIso;
}

/**
 * Whether the dialog offers "Como correu?": the flag is on and the slot is checkable.
 * With the flag off nothing about check-ins shows.
 */
export function canCheckIn(enabled: boolean, slot: TeachingSlotInput, todayIso: string): boolean {
  return enabled && isCheckableSlot(slot, todayIso);
}

/**
 * The small mark on a calendar card for a past lesson. Null when there is nothing to say: a future
 * or skipped slot, a holiday, or a type that is not checkable.
 * A checkable slot still `planned` gets the "por confirmar" dot.
 */
export function teachingMark(
  slot: TeachingSlotInput & { teachingStatus?: TeachingStatus },
  todayIso: string,
): TeachingMark | null {
  // A not-held lesson keeps its ✕ even once ENG-194 has marked it skipped; the check-in itself
  // still refuses skipped slots (see canCheckIn).
  const notHeldKept = slot.teachingStatus === "not_held" && isPastCheckableType(slot, todayIso);
  if (!notHeldKept && !isCheckableSlot(slot, todayIso)) return null;
  switch (slot.teachingStatus) {
    case "taught":
      return { key: "taught", glyph: "✓" };
    case "partially_taught":
      return { key: "partiallyTaught", glyph: "½" };
    case "not_held":
      return { key: "notHeld", glyph: "✕" };
    case "assumed_taught":
      return { key: "assumedTaught", glyph: "✓" };
    default:
      return { key: "unconfirmed", glyph: "•" };
  }
}
