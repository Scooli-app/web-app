/** "Como correu a aula?" check-in (class state). Contract: chalkboard PR #274. */

export type CheckInResult = "TAUGHT" | "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL" | "NOT_HELD";

export type CheckInSlotType = "LESSON" | "ASSESSMENT" | "EXERCISE" | "REVIEW";

/** The teaching status the backend keeps on a slot (`lesson_slots.teaching_status`). */
export type TeachingStatus = "planned" | "taught" | "partially_taught" | "not_held" | "assumed_taught";

export interface CheckInOutcome {
  id: string;
  text: string;
  topicPath: string[];
  source: string;
}

/** A past lesson still waiting for the teacher to say how it went. */
export interface PendingCheckIn {
  timetableId: string;
  turmaTitle: string;
  subject: string;
  gradeLevel: number;
  slotId: string;
  /** YYYY-MM-DD */
  slotDate: string;
  slotType: CheckInSlotType;
  sequenceNumber: number | null;
  topicTitle: string | null;
  outcomes: CheckInOutcome[];
}

export interface CheckInSubmission {
  result: CheckInResult;
  difficultOutcomeIds?: string[];
  uncoveredOutcomeIds?: string[];
}

export interface CheckInRecord {
  id: string;
  timetableId: string;
  teachingStatus: TeachingStatus;
  checkedInAt: string;
}

export interface ConfirmAllCheckInsResult {
  updated: number;
}

/** A reinforcement sheet requested for a lesson's difficult outcomes (ENG-208). */
export interface ReinforcementResult {
  /** The document created for the sheet, when the backend returns it. */
  documentId?: string | null;
}

/** Outcome of moving the lessons after a not-held lesson (ENG-194). */
export interface ShiftFollowingResult {
  /** Lessons whose content moved to a later slot. */
  shifted: number;
  /** Topic titles that no longer fit in the period. Nothing is deleted silently. */
  overflow: string[];
}
