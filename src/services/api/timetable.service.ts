/**
 * Timetable Service — Feature 2: Horário & Sequências de Aulas
 */

import apiClient from "./client";

export interface RecurringSlot {
  dayOfWeek: number; // 1=Mon..7=Sun (ISO)
  slotsPerDay?: number;
  durationMinutes?: number;
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
}

export interface UpdateTimetableParams {
  title?: string;
  color?: string;
  classLabel?: string;
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
export type LessonSlotType = "LESSON" | "ASSESSMENT" | "HOLIDAY";

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

export async function listLessonDocuments(
  timetableId: string,
  lessonId: string
): Promise<LessonDocument[]> {
  const response = await apiClient.get<LessonDocument[]>(
    `/timetable/${timetableId}/lessons/${lessonId}/documents`
  );
  return response.data;
}

// ─── TOPIC GENERATION ─────────────────────────────────────────────────

export async function generateTopics(timetableId: string): Promise<{ updated: number }> {
  const response = await apiClient.post<{ updated: number }>(`/timetable/${timetableId}/generate-topics`);
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
        case "done": callbacks.onDone?.(evt.data); break;
        case "error": callbacks.onError?.(evt.data); break;
        case "slot_start": callbacks.onSlotStart?.(evt.data); break;
        case "slot_done": callbacks.onSlotDone?.(evt.data); break;
        case "slot_error": callbacks.onSlotError?.(evt.data); break;
        case "total": callbacks.onTotal?.(Number(evt.data)); break;
        case "info": callbacks.onInfo?.(evt.data); break;
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
