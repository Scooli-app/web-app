import type { CompanionType } from "@/components/dashboard/weekWindow";
/**
 * Timetable Service — Feature 2: Horário & Planos Letivos
 */

import apiClient from "./client";
import { featureFeedbackTrigger } from "@/store/featureFeedbackTrigger";
import type { CheckInOutcome, CheckInResult, CheckInSlotType, TeachingStatus } from "@/shared/types/check-in";

export interface RecurringSlot {
  dayOfWeek: number; // 1=Mon..7=Sun (ISO)
  position: number;  // 0-indexed within the day
  durationMinutes?: number;
  /** Pins this weekly slot to a fixed type; omitted = eligible for the auto-cadence. */
  slotType?: LessonSlotType;
}

export interface CreateTimetableParams {
  title: string;
  subject: string;
  gradeLevel: number;
  classLabel?: string;
  color?: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  schoolYearLabel?: string;
  creationMode?: "from_plan" | "custom";
  linkedCurriculumPlan?: string;
  recurringSlots?: RecurringSlot[];
  holidays?: string[];     // ISO dates — HOLIDAY / skipped
  assessmentDates?: string[]; // ISO dates — ASSESSMENT slots
  exerciseDates?: string[]; // ISO dates — EXERCISE slots (explicit, overrides auto-cadence)
  reviewDates?: string[];   // ISO dates — REVIEW slots (explicit, overrides auto-cadence)
  /** What the teacher says was already taught, so the topics pick up from there (needs already_covered_enabled). */
  alreadyCoveredNotes?: string;
  /** Formação específica (true) / geral (false), for subjects the AE splits that way. */
  isSpecificComponent?: boolean;
  /** Curso profissional, with either a UC code or a sociocultural/científica subject name — as on document creation. */
  vocationalCourseCode?: string;
  vocationalUnitCode?: string;
  vocationalSchoolSubjectName?: string;
  /** Where the class was created, for analytics. Defaults to "calendar" on the server. */
  source?: "onboarding" | "calendar";
}

export interface UpdateTimetableParams {
  title?: string;
  color?: string;
  classLabel?: string;
  linkedCurriculumPlan?: string | null;
}

export interface Timetable {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  classLabel: string;
  color: string;
  periodStart: string;
  periodEnd: string;
  schoolYearLabel: string;
  creationMode: string;
  linkedCurriculumPlan: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type LessonSlotStatus = "pending" | "generating" | "completed" | "failed" | "skipped";
export type LessonSlotType = "LESSON" | "ASSESSMENT" | "HOLIDAY" | "EXERCISE" | "REVIEW";

export interface LessonSlot {
  id: string;
  timetableId: string;
  slotDate: string;
  slotType: LessonSlotType;
  sequenceNumber: number;
  topicTitle: string;
  description: string;
  durationMinutes: number;
  status: LessonSlotStatus;
  errorMessage: string;
  /** Set by the teacher's check-in ("Como correu a aula?"); `planned` until then. */
  teachingStatus?: TeachingStatus;
  /** ISO timestamp of the latest check-in, null until the teacher checks in. */
  checkedInAt?: string | null;
  /**
   * The latest answer's own result. "Com dificuldades" is stored as `taught`, so this is what tells it apart.
   * Null until the teacher checks in, and when the backend has no result for the slot.
   */
  checkInResult?: CheckInResult | null;
  /** Difficult outcome ids ("com dificuldades") or uncovered ones ("ficou a meio"); empty for the other answers. */
  checkInOutcomeIds?: string[];
  /** Outcomes (AE) this lesson covers, offered as chips in the check-in card. */
  outcomes?: CheckInOutcome[];
}

export interface UpdateSlotParams {
  topicTitle?: string;
  slotType?: LessonSlotType;
  description?: string;
  durationMinutes?: number;
  /** ISO date (YYYY-MM-DD) — used for drag-and-drop reordering. */
  slotDate?: string;
  /** Sequence number — used for within-day reordering. */
  sequenceNumber?: number;
}

export interface LessonDocument {
  id: string;
  documentId: string;
  documentRole: string;
  title: string;
  documentType?: string;
  /** generating | processing | completed | failed */
  status?: string;
}

export interface GenerateLessonStreamCallbacks {
  onStatus?: (status: string) => void;
  onChunk?: (chunk: string) => void;
  onTitle?: (title: string) => void;
  onDocumentId?: (documentId: string) => void;
  onDone?: (slotId: string) => void;
  onError?: (error: string) => void;
  onSlotStart?: (slotId: string) => void;
  onSlotDone?: (slotId: string) => void;
  onSlotError?: (slotId: string) => void;
  onTotal?: (total: number) => void;
  onInfo?: (info: string) => void;
  /** A free-plan limit (free_class_limit | free_period_limit) stopped the generation. */
  onFreeLimit?: (code: string) => void;
  /** The generation quota is used up. */
  onQuotaExceeded?: () => void;
}

// ─── CRUD ────────────────────────────────────────────────────────────

export async function createTimetable(params: CreateTimetableParams): Promise<Timetable> {
  const response = await apiClient.post<Timetable>("/timetable", params);
  return response.data;
}

export async function listTimetables(): Promise<Timetable[]> {
  const response = await apiClient.get<Timetable[]>("/timetable");
  return response.data;
}

export async function getTimetablesByLinkedPlan(planId: string): Promise<Timetable[]> {
  const response = await apiClient.get<Timetable[]>("/timetable", {
    params: { linkedCurriculumPlan: planId },
  });
  return response.data;
}

export async function getTimetable(id: string): Promise<Timetable> {
  const response = await apiClient.get<Timetable>(`/timetable/${id}`);
  return response.data;
}

export async function updateTimetable(id: string, params: UpdateTimetableParams): Promise<Timetable> {
  const response = await apiClient.patch<Timetable>(`/timetable/${id}`, params);
  return response.data;
}

export async function deleteTimetable(id: string, deleteDocuments?: boolean): Promise<void> {
  await apiClient.delete(`/timetable/${id}`, {
    params: deleteDocuments ? { deleteDocuments: true } : undefined,
  });
}

// ─── LESSON SLOTS ─────────────────────────────────────────────────────

export async function listLessons(timetableId: string, weekStart?: string): Promise<LessonSlot[]> {
  const params = weekStart ? { weekStart } : {};
  const response = await apiClient.get<LessonSlot[]>(`/timetable/${timetableId}/lessons`, { params });
  return response.data;
}

export async function updateLesson(
  timetableId: string,
  lessonId: string,
  params: UpdateSlotParams
): Promise<LessonSlot> {
  const response = await apiClient.patch<LessonSlot>(
    `/timetable/${timetableId}/lessons/${lessonId}`,
    params
  );
  return response.data;
}

export async function skipLesson(timetableId: string, lessonId: string): Promise<LessonSlot> {
  const response = await apiClient.post<LessonSlot>(
    `/timetable/${timetableId}/lessons/${lessonId}/skip`
  );
  return response.data;
}

/** The lesson before a slot, when it still needs its "Como correu?" answer (ENG-224). */
export interface PreviousLessonCheckIn {
  slotId: string;
  /** YYYY-MM-DD */
  date: string;
  topicTitle: string;
  slotType: CheckInSlotType;
  outcomes: CheckInOutcome[];
}

/**
 * Null when there is nothing to ask: no previous lesson, already answered, or the class-state flag is off
 * (the backend answers 204 for all of these).
 */
export async function getPreviousCheckIn(
  timetableId: string,
  lessonId: string
): Promise<PreviousLessonCheckIn | null> {
  const response = await apiClient.get<PreviousLessonCheckIn | "">(
    `/timetable/${timetableId}/lessons/${lessonId}/previous-check-in`
  );
  if (response.status === 204 || !response.data) return null;
  return response.data;
}

export async function listLessonDocuments(
  timetableId: string,
  lessonId: string
): Promise<LessonDocument[]> {
  const response = await apiClient.get<LessonDocument[]>(
    `/timetable/${timetableId}/lessons/${lessonId}/documents`
  );
  return response.data;
}

/**
 * One-click lesson document ("+ Ficha", "+ Quiz", …): the backend creates it from the lesson's
 * data and generates it server-side, so it finishes even if the teacher leaves the page.
 * 402 / free-plan 403 open the upgrade modal in the API client; 409 = already being prepared.
 */
/**
 * `outcomeIds` (ENG-209) is only sent for a test: the outcomes it must assess, chosen from the assessment's scope.
 * Left out, the backend uses the whole scope.
 */
export async function generateLessonDocument(
  timetableId: string,
  lessonId: string,
  documentType: CompanionType,
  outcomeIds?: string[],
): Promise<{ id: string }> {
  const body = outcomeIds ? { documentType, outcomeIds } : { documentType };
  const response = await apiClient.post<{ id: string; status: string }>(
    `/timetable/${timetableId}/lessons/${lessonId}/documents/generate`,
    body,
  );
  return { id: response.data.id };
}

/** One learning outcome an assessment can cover (ENG-209). `lessons` is how many lessons since the last test teach it. */
export interface AssessmentScopeOutcome {
  id: string;
  text: string;
  topicPath: string[];
  lessons: number;
}

/** What "Vai avaliar" shows for an assessment: the outcomes taught since `fromDate` (YYYY-MM-DD, or null). */
export interface AssessmentScope {
  fromDate: string | null;
  outcomes: AssessmentScopeOutcome[];
}

/**
 * The outcomes a test for this assessment should cover (ENG-209). Rejects when the flag is off (403), the slot is not
 * an assessment (400) or it is not the teacher's (404); callers treat a rejection as "no scope to show".
 */
export async function getAssessmentScope(timetableId: string, lessonId: string): Promise<AssessmentScope> {
  const response = await apiClient.get<AssessmentScope>(
    `/timetable/${timetableId}/lessons/${lessonId}/assessment-scope`
  );
  return response.data;
}

/** Puts a document made from the create form into one of the teacher's lessons (no credit). */
export async function linkLessonDocument(
  timetableId: string,
  lessonId: string,
  documentId: string,
): Promise<void> {
  await apiClient.post(`/timetable/${timetableId}/lessons/${lessonId}/documents/${documentId}/link`);
}

// ─── TOPIC GENERATION ─────────────────────────────────────────────────

export async function generateTopics(
  timetableId: string,
  contentLanguage?: string
): Promise<{ updated: number }> {
  const query = contentLanguage
    ? `?contentLanguage=${encodeURIComponent(contentLanguage)}`
    : "";
  const response = await apiClient.post<{ updated: number }>(
    `/timetable/${timetableId}/generate-topics${query}`
  );
  return response.data;
}

// ─── SSE STREAMING ────────────────────────────────────────────────────

function parseSseEvent(data: string): { event: string; data: string } | null {
  try {
    const parsed = JSON.parse(data);
    return { event: parsed.event ?? "", data: parsed.data ?? "" };
  } catch {
    return null;
  }
}

async function streamTimetableEndpoint(
  url: string,
  body: object | null,
  callbacks: GenerateLessonStreamCallbacks,
  getToken: () => Promise<string | null>
): Promise<void> {
  const token = await getToken();
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_API_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok || !response.body) {
    callbacks.onError?.(`HTTP ${response.status}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      const evt = parseSseEvent(raw);
      if (!evt) continue;

      switch (evt.event) {
        case "status": callbacks.onStatus?.(evt.data); break;
        case "chunk": callbacks.onChunk?.(evt.data); break;
        case "title": callbacks.onTitle?.(evt.data); break;
        case "documentId": callbacks.onDocumentId?.(evt.data); break;
        case "done":
          callbacks.onDone?.(evt.data);
          featureFeedbackTrigger.notifyCompletion(); // a lesson plan / week batch just finished
          break;
        case "error": callbacks.onError?.(evt.data); break;
        case "slot_start": callbacks.onSlotStart?.(evt.data); break;
        case "slot_done": callbacks.onSlotDone?.(evt.data); break;
        case "slot_error": callbacks.onSlotError?.(evt.data); break;
        case "total": callbacks.onTotal?.(Number(evt.data)); break;
        case "info": callbacks.onInfo?.(evt.data); break;
        case "free_limit": callbacks.onFreeLimit?.(evt.data); break;
        case "quota_exceeded": callbacks.onQuotaExceeded?.(); break;
      }
    }
  }
}

export async function generateLesson(
  timetableId: string,
  lessonId: string,
  message: string | undefined,
  callbacks: GenerateLessonStreamCallbacks,
  getToken: () => Promise<string | null>
): Promise<void> {
  return streamTimetableEndpoint(
    `/timetable/${timetableId}/lessons/${lessonId}/generate`,
    message ? { message } : {},
    callbacks,
    getToken
  );
}

export async function regenerateLesson(
  timetableId: string,
  lessonId: string,
  message: string | undefined,
  callbacks: GenerateLessonStreamCallbacks,
  getToken: () => Promise<string | null>
): Promise<void> {
  return streamTimetableEndpoint(
    `/timetable/${timetableId}/lessons/${lessonId}/regenerate`,
    message ? { message } : {},
    callbacks,
    getToken
  );
}

export async function generateWeek(
  timetableId: string,
  weekStart: string,
  callbacks: GenerateLessonStreamCallbacks,
  getToken: () => Promise<string | null>
): Promise<void> {
  return streamTimetableEndpoint(
    `/timetable/${timetableId}/generate-week?weekStart=${weekStart}`,
    null,
    callbacks,
    getToken
  );
}
