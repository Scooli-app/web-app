import type { LessonSlotType } from "@/services/api/timetable.service";
import type {
  CheckInOutcome,
  CheckInResult,
  CheckInSubmission,
  MissingAmount,
  TeachingStatus,
} from "@/shared/types/check-in";

/** Slot types the backend accepts a check-in for. A holiday is never checkable. */
const CHECKABLE_SLOT_TYPES: readonly LessonSlotType[] = ["LESSON", "ASSESSMENT", "EXERCISE", "REVIEW"];

export interface TeachingSlotInput {
  slotType: LessonSlotType;
  /** YYYY-MM-DD */
  slotDate: string;
  status: string;
}

/** Keys of the `checkIns.mark` messages; each one is a short label for the glyph. */
export type TeachingMarkKey =
  | "taught"
  | "taughtWithDifficulties"
  | "partiallyTaught"
  | "notHeld"
  | "assumedTaught"
  | "unconfirmed";

/** What the teacher answered, as the slot keeps it (ENG-246). Only set for the answers that name outcomes. */
export interface SlotCheckInAnswer {
  checkInResult: CheckInResult;
  checkInOutcomeIds: string[];
  /** How much was left, for "ficou a meio" (ENG-253). */
  missingAmount: MissingAmount | null;
  /** The note the teacher wrote (ENG-253). */
  teachingNote: string | null;
}

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
 * "Com dificuldades" is stored as `taught`, so its amber "~" comes from the answer's own result.
 */
export function teachingMark(
  slot: TeachingSlotInput & { teachingStatus?: TeachingStatus; checkInResult?: CheckInResult | null },
  todayIso: string,
): TeachingMark | null {
  // A not-held lesson keeps its ✕ even once ENG-194 has marked it skipped; the check-in itself
  // still refuses skipped slots (see canCheckIn).
  const notHeldKept = slot.teachingStatus === "not_held" && isPastCheckableType(slot, todayIso);
  if (!notHeldKept && !isCheckableSlot(slot, todayIso)) return null;
  switch (slot.teachingStatus) {
    case "taught":
      return slot.checkInResult === "TAUGHT_WITH_DIFFICULTIES"
        ? { key: "taughtWithDifficulties", glyph: "~" }
        : { key: "taught", glyph: "✓" };
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

/**
 * The outcome texts a "com dificuldades" answer named, for the status tooltip. Empty for any other answer.
 * Only the ids the slot still lists are shown, so a text the slot no longer has is simply left out.
 */
export function difficultOutcomeTexts(slot: {
  checkInResult?: CheckInResult | null;
  checkInOutcomeIds?: string[];
  outcomes?: CheckInOutcome[];
}): string[] {
  if (slot.checkInResult !== "TAUGHT_WITH_DIFFICULTIES") return [];
  const ids = new Set(slot.checkInOutcomeIds ?? []);
  return (slot.outcomes ?? []).filter((outcome) => ids.has(outcome.id)).map((outcome) => outcome.text);
}

/** The answer as the slot keeps it locally, the same two fields the backend puts on a slot. */
export function slotCheckInAnswer(submission: CheckInSubmission): SlotCheckInAnswer {
  const ids =
    submission.result === "TAUGHT_WITH_DIFFICULTIES"
      ? submission.difficultOutcomeIds ?? []
      : submission.result === "PARTIAL"
        ? submission.uncoveredOutcomeIds ?? []
        : [];
  return {
    checkInResult: submission.result,
    checkInOutcomeIds: [...ids],
    missingAmount: submission.missingAmount ?? null,
    teachingNote: submission.note ?? null,
  };
}
