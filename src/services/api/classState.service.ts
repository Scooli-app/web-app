/**
 * Class State API — Feature 2: classroom-outcome persistence.
 *
 * Separate from lesson-plan generation status (`LessonSlot.status`). Absence
 * of a class-state record means UNCONFIRMED: expected to have happened but
 * not yet confirmed by the teacher — never treated as unfinished or skipped.
 */

import apiClient from "./client";

export type LessonOutcome = "AS_PLANNED" | "PARTIAL" | "NOT_HELD";

export interface ClassState {
  lessonId: string;
  /** False when no outcome has ever been recorded (UNCONFIRMED). */
  observed: boolean;
  outcome: "UNCONFIRMED" | LessonOutcome;
  note: string | null;
  /** 0 when unobserved; starts at 1 on first recorded outcome. */
  revision: number;
  eventId: string | null;
  recordedAt: string | null;
  recordedByUserId: string | null;
}

export class ClassStateConflictError extends Error {
  constructor(
    message: string,
    public readonly kind: "outcome_already_recorded" | "outcome_not_recorded" | "stale_revision",
    public readonly currentRevision?: number,
  ) {
    super(message);
    this.name = "ClassStateConflictError";
  }
}

function isConflictBody(
  data: unknown,
): data is { error: string; message: string; currentRevision?: number } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  );
}

async function unwrapConflict<T>(promise: Promise<{ data: T }>): Promise<T> {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response;
    if (response?.status === 409 && isConflictBody(response.data)) {
      const { error: kind, message, currentRevision } = response.data;
      if (kind === "outcome_already_recorded" || kind === "outcome_not_recorded" || kind === "stale_revision") {
        throw new ClassStateConflictError(message, kind, currentRevision);
      }
    }
    throw error;
  }
}

/** Current classroom-outcome state for a lesson. UNCONFIRMED (observed: false) when never recorded. */
export async function getClassState(timetableId: string, lessonId: string): Promise<ClassState> {
  const response = await apiClient.get<ClassState>(
    `/timetable/${timetableId}/lessons/${lessonId}/class-state`,
  );
  return response.data;
}

/** Full append-only correction history for a lesson, oldest revision first. */
export async function getClassStateHistory(
  timetableId: string,
  lessonId: string,
): Promise<ClassState[]> {
  const response = await apiClient.get<ClassState[]>(
    `/timetable/${timetableId}/lessons/${lessonId}/class-state/events`,
  );
  return response.data;
}

/**
 * Records the first observed outcome for a lesson. Throws
 * `ClassStateConflictError` (kind "outcome_already_recorded") if one already
 * exists — call `correctClassState` instead.
 */
export async function recordClassState(
  timetableId: string,
  lessonId: string,
  outcome: LessonOutcome,
  note?: string,
): Promise<ClassState> {
  return unwrapConflict(
    apiClient.post<ClassState>(`/timetable/${timetableId}/lessons/${lessonId}/class-state`, {
      outcome,
      note,
    }),
  );
}

/**
 * Corrects an existing outcome, appending a new revision rather than
 * overwriting history. `expectedRevision` implements optimistic concurrency:
 * pass the `revision` from the last-known `ClassState`. Omit `note` to
 * preserve the existing note; pass `note: null` to explicitly clear it.
 * Throws `ClassStateConflictError` on a stale revision or when no prior
 * outcome exists to correct.
 */
export async function correctClassState(
  timetableId: string,
  lessonId: string,
  outcome: LessonOutcome,
  expectedRevision: number,
  note?: string | null,
): Promise<ClassState> {
  const body: { outcome: LessonOutcome; expectedRevision: number; note?: string | null } = {
    outcome,
    expectedRevision,
  };
  if (note !== undefined) body.note = note;
  return unwrapConflict(
    apiClient.patch<ClassState>(`/timetable/${timetableId}/lessons/${lessonId}/class-state`, body),
  );
}
