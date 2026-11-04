import { SUBJECTS, translateSubject } from "@/components/document-creation/constants";
import type { Locale } from "@/i18n/locales";
import type { Department, DirectionTurma, TurmaState } from "@/shared/types/school-direction";
import { toIntlLocale } from "@/shared/utils/calendar";

/** A class as the school says it: "5.º B" in Portuguese, "Year 5 B" in English. */
export function formatClass(grade: number, classLabel: string, locale: string): string {
  // A label that did not normalize can already carry its year ("5.º B/C"): show it as typed.
  if (/^\d/.test(classLabel)) return classLabel;
  return locale.startsWith("pt") ? `${grade}.º ${classLabel}` : `Year ${grade} ${classLabel}`;
}

/**
 * A day in a sentence: "28 de outubro" / "28 October" ("28 de outubro de 2026" with `withYear`). Long month because
 * pt-PT's short form is "28/10". Takes a date or a timestamp; a timestamp shows its own calendar day.
 */
export function formatDay(iso: string, locale: string, withYear = false): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(toIntlLocale(locale as Locale), {
    day: "numeric",
    month: "long",
    ...(withYear && { year: "numeric" }),
  });
}

/** A run of days in one phrase: "16–20 de novembro" / "16 – 20 November". */
export function formatDayRange(startIso: string, endIso: string, locale: string): string {
  const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat(toIntlLocale(locale as Locale), { day: "numeric", month: "long" }).formatRange(
    day(startIso),
    day(endIso),
  );
}

/**
 * A subject in the interface language. Turmas store the English canonical name ("Mathematics"); the key is the
 * backend's normalized one, the label the name as typed, used when the key isn't a known subject.
 */
export function formatSubject(subjectKey: string, subjectLabel: string): string {
  return translateSubject(SUBJECTS.some((s) => s.value === subjectKey) ? subjectKey : subjectLabel);
}

/** The departments in the order the direction pages list them. */
export const DEPARTMENTS: Department[] = ["languages", "maths_science", "humanities", "arts_pe", "primary", "other"];

// The states with a confirmed lesson to measure against; the others have no execution figure.
const COUNTED_STATES: TurmaState[] = ["on_track", "watch", "behind"];

/**
 * Execution per department: the lessons held on plan over the lessons past, summed over its counted turmas (not an
 * average of their percents). A department with no counted turma has no figure and is left out.
 */
export function departmentExecution(turmas: DirectionTurma[]): { department: Department; percent: number }[] {
  return DEPARTMENTS.flatMap((department) => {
    const counted = turmas.filter((t) => t.department === department && COUNTED_STATES.includes(t.state));
    const past = counted.reduce((sum, t) => sum + t.lessonsPast, 0);
    const behind = counted.reduce((sum, t) => sum + t.lessonsBehind, 0);
    return past > 0 ? [{ department, percent: Math.round(((past - behind) * 100) / past) }] : [];
  });
}
