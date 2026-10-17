import type { MyWeek, MyWeekClass } from "@/shared/types/my-week";
import { SUBJECTS } from "./constants";

/** One lesson the teacher can attach a new document to ("Para que aula?"). */
export interface LessonChoice {
  timetableId: string;
  lessonId: string;
  slotDate: string;
  topicTitle: string;
  klass: MyWeekClass;
  gradeLevel: number;
  /** The form's subject id for the turma's subject, or null when the form doesn't know it. */
  subjectId: string | null;
  /** The lesson already has a live document of this type, so it can't take another. */
  disabled: boolean;
}

/** The teaching lessons in the window, by date, ready for the create form's lesson picker. */
export function lessonChoices(week: MyWeek, documentType: string): LessonChoice[] {
  const choices: LessonChoice[] = [];
  for (const klass of week.classes) {
    const subjectId = SUBJECTS.find((s) => s.value === klass.subject || s.id === klass.subject)?.id ?? null;
    for (const lesson of klass.lessons) {
      if (lesson.slotType === "HOLIDAY" || lesson.status === "skipped") continue;
      choices.push({
        timetableId: klass.timetableId,
        lessonId: lesson.id,
        slotDate: lesson.slotDate,
        topicTitle: lesson.topicTitle,
        klass,
        gradeLevel: klass.gradeLevel,
        subjectId,
        disabled: lesson.documents.some((d) => d.role === documentType && d.status !== "failed"),
      });
    }
  }
  return choices.sort((a, b) => a.slotDate.localeCompare(b.slotDate));
}
