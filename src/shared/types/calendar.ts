import type { LessonSlot, Timetable } from "@/services/api/timetable.service";

/** A lesson slot enriched with its parent timetable — used throughout calendar UI. */
export interface SlotWithTimetable extends LessonSlot {
  timetable: Timetable;
}

export type DayMap = Map<string, SlotWithTimetable[]>;
