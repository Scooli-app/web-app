export interface MyWeekLesson {
  id: string;
  slotDate: string;
  slotType: string;
  topicTitle: string;
  status: "pending" | "generating" | "completed" | "failed" | "skipped";
  /** The lesson plan's id (kept for older callers); `documents` has every linked document. */
  documentId: string | null;
  sequenceNumber: number | null;
  /** The lesson's learning objectives, once its plan has been written. */
  description: string | null;
  durationMinutes: number | null;
  documents: MyWeekLessonDocument[];
}

export interface MyWeekLessonDocument {
  id: string;
  /** How the document belongs to the lesson: lessonPlan | worksheet | quiz | presentation | test */
  role: string;
  documentType: string;
  title: string;
  status: string;
}

export interface MyWeekClass {
  timetableId: string;
  title: string;
  classLabel: string;
  subject: string;
  gradeLevel: number;
  color: string;
  lessons: MyWeekLesson[];
}

export interface MyWeek {
  /** First day shown (a Monday for an ISO week, or today for the rolling window). */
  weekStart: string;
  classes: MyWeekClass[];
  /** Set only when the window has no lessons: the next day that has one. */
  nextLessonDate?: string | null;
}
