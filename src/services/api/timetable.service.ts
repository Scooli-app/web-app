import type {
  CreateSessionRequest,
  CreateSlotRequest,
  GenerateLessonRequest,
  GenerateLessonResponse,
  GenerateTopicsResponse,
  LessonSlot,
  TimetableSession,
  TimetableSlot,
  UpdateLessonRequest,
  UpdateSessionRequest,
  UpdateSlotRequest,
} from "@/shared/types/timetable";
import apiClient from "./client";

// -------------------------------------------------------------------------
// Sessions
// -------------------------------------------------------------------------

export async function createSession(req: CreateSessionRequest): Promise<TimetableSession> {
  const response = await apiClient.post<TimetableSession>("/timetable", req);
  return response.data;
}

export async function listSessions(): Promise<TimetableSession[]> {
  const response = await apiClient.get<TimetableSession[]>("/timetable");
  return response.data;
}

export async function getSession(id: string): Promise<TimetableSession> {
  const response = await apiClient.get<TimetableSession>(`/timetable/${id}`);
  return response.data;
}

export async function updateSession(id: string, req: UpdateSessionRequest): Promise<TimetableSession> {
  const response = await apiClient.patch<TimetableSession>(`/timetable/${id}`, req);
  return response.data;
}

export async function deleteSession(id: string): Promise<void> {
  await apiClient.delete(`/timetable/${id}`);
}

// -------------------------------------------------------------------------
// Slots
// -------------------------------------------------------------------------

export async function createSlot(sessionId: string, req: CreateSlotRequest): Promise<TimetableSlot> {
  const response = await apiClient.post<TimetableSlot>(`/timetable/${sessionId}/slots`, req);
  return response.data;
}

export async function listSlots(sessionId: string): Promise<TimetableSlot[]> {
  const response = await apiClient.get<TimetableSlot[]>(`/timetable/${sessionId}/slots`);
  return response.data;
}

export async function updateSlot(sessionId: string, slotId: string, req: UpdateSlotRequest): Promise<TimetableSlot> {
  const response = await apiClient.patch<TimetableSlot>(`/timetable/${sessionId}/slots/${slotId}`, req);
  return response.data;
}

export async function deleteSlot(sessionId: string, slotId: string): Promise<void> {
  await apiClient.delete(`/timetable/${sessionId}/slots/${slotId}`);
}

// -------------------------------------------------------------------------
// Lessons
// -------------------------------------------------------------------------

export async function listLessons(sessionId: string, weekStart?: string): Promise<LessonSlot[]> {
  const params = weekStart ? { weekStart } : undefined;
  const response = await apiClient.get<LessonSlot[]>(`/timetable/${sessionId}/lessons`, { params });
  return response.data;
}

export async function getLesson(sessionId: string, lessonId: string): Promise<LessonSlot> {
  const response = await apiClient.get<LessonSlot>(`/timetable/${sessionId}/lessons/${lessonId}`);
  return response.data;
}

export async function updateLesson(
  sessionId: string,
  lessonId: string,
  req: UpdateLessonRequest
): Promise<LessonSlot> {
  const response = await apiClient.patch<LessonSlot>(
    `/timetable/${sessionId}/lessons/${lessonId}`,
    req
  );
  return response.data;
}

export async function skipLesson(sessionId: string, lessonId: string): Promise<LessonSlot> {
  const response = await apiClient.post<LessonSlot>(
    `/timetable/${sessionId}/lessons/${lessonId}/skip`,
    {}
  );
  return response.data;
}

// -------------------------------------------------------------------------
// Generation
// -------------------------------------------------------------------------

export async function generateTopics(sessionId: string): Promise<GenerateTopicsResponse> {
  const response = await apiClient.post<GenerateTopicsResponse>(
    `/timetable/${sessionId}/generate-topics`,
    {}
  );
  return response.data;
}

export async function generateLesson(
  sessionId: string,
  lessonId: string,
  req?: GenerateLessonRequest
): Promise<GenerateLessonResponse> {
  const response = await apiClient.post<GenerateLessonResponse>(
    `/timetable/${sessionId}/lessons/${lessonId}/generate`,
    req ?? {}
  );
  return response.data;
}

export async function regenerateLesson(
  sessionId: string,
  lessonId: string,
  req?: GenerateLessonRequest
): Promise<GenerateLessonResponse> {
  const response = await apiClient.post<GenerateLessonResponse>(
    `/timetable/${sessionId}/lessons/${lessonId}/regenerate`,
    req ?? {}
  );
  return response.data;
}
