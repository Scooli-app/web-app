export interface MyWeekLesson {
  id: string;
  slotDate: string;
  slotType: string;
  topicTitle: string;
  status: "pending" | "generating" | "completed" | "failed" | "skipped";
  documentId: string | null;
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
  weekStart: string;
  classes: MyWeekClass[];
}
