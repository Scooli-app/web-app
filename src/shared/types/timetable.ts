/**
 * Timetable & Lesson Plans (Feature 2) — TypeScript types.
 * Mirror the Java entities and REST request/response shapes.
 */

export interface TimetableSession {
  id: string;
  userId: string;
  organizationId?: string;
  title: string;
  periodStart: string;        // ISO date "YYYY-MM-DD"
  periodEnd: string;          // ISO date "YYYY-MM-DD"
  schoolYearLabel?: string;   // e.g. "2024/2025"
  calendarSource?: string;
  outputConfig: Record<string, unknown>;
  curriculumPlanDocId?: string;
  status: TimetableSessionStatus;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type TimetableSessionStatus = "active" | "archived" | "deleted";

export interface TimetableSlot {
  id: string;
  timetableSessionId: string;
  subject: string;
  gradeLevel: number;         // e.g. 5
  cycle: number;              // e.g. 2 (2nd cycle)
  dayOfWeek: number;          // 1=Mon … 7=Sun
  startTime?: string;         // "HH:mm"
  durationMinutes: number;
  color?: string;             // hex e.g. "#4f46e5"
  recurrenceRule?: string;
}

export interface LessonSlot {
  id: string;
  timetableSessionId: string;
  timetableSlotId?: string;
  subject: string;
  gradeLevel: number;
  slotDate: string;           // ISO date
  slotStartTime?: string;     // "HH:mm"
  durationMinutes: number;
  sequenceNumber: number;
  topicTitle?: string;
  lessonType?: LessonType;
  topicsCovered?: string;
  contextSummary?: LessonContextSummary;
  interdisciplinary?: Record<string, unknown>;
  outputConfig?: Record<string, unknown>;
  status: LessonSlotStatus;
  errorMessage?: string;
  createdAt?: string;
}

export type LessonSlotStatus =
  | "pending"
  | "generating"
  | "generated"
  | "skipped"
  | "error";

export type LessonType =
  | "lesson"
  | "review"
  | "assessment"
  | "project"
  | "field_trip"
  | "other";

export interface LessonContextSummary {
  narrative?: string;
  aeCovered?: string[];
  topicsCovered?: string[];
}

export interface LessonSlotDocument {
  id: string;
  slotId: string;
  documentId: string;
  documentRole: string;
}

// -------------------------------------------------------------------------
// Request / response shapes
// -------------------------------------------------------------------------

export interface CreateSessionRequest {
  title: string;
  periodStart: string;
  periodEnd: string;
  schoolYearLabel?: string;
  calendarSource?: string;
  curriculumPlanDocId?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  periodStart?: string;
  periodEnd?: string;
  schoolYearLabel?: string;
  status?: TimetableSessionStatus;
  curriculumPlanDocId?: string;
}

export interface CreateSlotRequest {
  subject: string;
  gradeLevel: number;
  cycle: number;
  dayOfWeek: number;
  startTime?: string;
  durationMinutes?: number;
  color?: string;
  recurrenceRule?: string;
}

export interface UpdateSlotRequest {
  subject?: string;
  gradeLevel?: number;
  dayOfWeek?: number;
  startTime?: string;
  durationMinutes?: number;
  color?: string;
  recurrenceRule?: string;
}

export interface UpdateLessonRequest {
  topicTitle?: string;
  lessonType?: LessonType;
  status?: LessonSlotStatus;
}

export interface GenerateLessonRequest {
  message?: string;
}

export interface GenerateLessonResponse {
  documentId: string;
  message: string;
  streamUrl: string;
}

export interface GenerateTopicsResponse {
  updated: number;
  message: string;
}
