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

/** Alias kept for the ENG-208 callers: the same response as ReinforcementRequested. */
export type ReinforcementResult = ReinforcementRequested;

/** Outcome of moving the lessons after a not-held lesson (ENG-194). */
export interface ShiftFollowingResult {
  /** Lessons whose content moved to a later slot. */
  shifted: number;
  /** Topic titles that no longer fit in the period. Nothing is deleted silently. */
  overflow: string[];
}

/** A reinforcement worksheet requested after a check-in (ENG-236). Contract: chalkboard feat/ENG-236-237. */
export interface ReinforcementRequested {
  documentId: string;
  /** The next lesson, which the worksheet is linked to. */
  targetSlotId: string;
  /** YYYY-MM-DD */
  targetDate: string;
  status: "generating";
}

/** Outcomes carried over to the next lesson (ENG-237). `carried` counts the ones that were not on it already. */
export interface CarryOverResult {
  targetSlotId: string;
  /** YYYY-MM-DD */
  targetDate: string;
  carried: number;
}
