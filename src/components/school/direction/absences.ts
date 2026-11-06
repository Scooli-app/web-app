import type { DirectionHandover } from "@/shared/types/school-direction";

/** Nothing here is sent or stored on the server: an absence is the handover it was registered with, kept for the session. */
export interface Absence {
  /** Teacher and day: registering the same pair again replaces the earlier one. */
  id: string;
  teacherName: string;
  substituteName: string;
  date: string;
  handover: DirectionHandover;
  /** Slots whose card was "sent". */
  sent: string[];
}

type Lesson = DirectionHandover["lessons"][number];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isString = (v: unknown): v is string => typeof v === "string";
const isOptionalString = (v: unknown) => v === null || v === undefined || isString(v);

/** A lesson with the fields the board reads; a missing `documents` is none. Null when anything else is off. */
function parseLesson(v: unknown): Lesson | null {
  if (!isObject(v)) return null;
  const lastLesson = v.lastLesson ?? null;
  const documents = v.documents ?? [];
  const valid =
    isString(v.slotId) &&
    typeof v.grade === "number" &&
    isString(v.classLabel) &&
    isString(v.subjectLabel) &&
    typeof v.sequenceNumber === "number" &&
    isOptionalString(v.topicTitle) &&
    (lastLesson === null ||
      (isObject(lastLesson) &&
        isString(lastLesson.date) &&
        isString(lastLesson.teachingStatus) &&
        isOptionalString(lastLesson.topicTitle) &&
        isOptionalString(lastLesson.note))) &&
    Array.isArray(documents) &&
    documents.every((d) => isObject(d) && isString(d.title));
  return valid ? ({ ...v, lastLesson, documents } as unknown as Lesson) : null;
}

/**
 * What sessionStorage gave back, as absences the board can render. Anything that is not the shape the board wrote
 * (an old build's, or edited by hand) is dropped, so a bad value can never crash the page.
 */
export function parseAbsences(raw: unknown): Absence[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): Absence[] => {
    if (!isObject(entry) || !isObject(entry.handover) || !Array.isArray(entry.handover.lessons)) return [];
    const { id, teacherName, substituteName, date, sent, handover } = entry;
    const lessons = (handover as { lessons: unknown[] }).lessons.map(parseLesson);
    if (
      !isString(id) ||
      !isString(teacherName) ||
      !isString(substituteName) ||
      !isString(date) ||
      !Array.isArray(sent) ||
      !sent.every(isString) ||
      lessons.some((lesson) => lesson === null)
    ) {
      return [];
    }
    return [
      { id, teacherName, substituteName, date, sent, handover: { ...handover, lessons } as unknown as DirectionHandover },
    ];
  });
}
