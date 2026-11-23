import {
  DEFAULT_COUNTRY_CODE,
  getCountryCatalog,
  type CountryCode,
} from "@/lib/curriculum/countryCatalog";
import { translateSubject } from "@/components/document-creation/constants";
import type { Locale } from "@/i18n/locales";
import type { Department, DirectionTurma, TurmaState } from "@/shared/types/school-direction";
import { toIntlLocale } from "@/shared/utils/calendar";

/**
 * A class as the school says it: "5.º B" in Portuguese, "Year 5 B" in English.
 * Brazil says "5º ano B" and, from the 10th year, "1ª série B".
 */
export function formatClass(
  grade: number,
  classLabel: string,
  locale: string,
  countryCode: CountryCode = DEFAULT_COUNTRY_CODE,
): string {
  // A label that did not normalize can already carry its year ("5.º B/C"): show it as typed.
  if (/^\d/.test(classLabel)) return classLabel;
  if (!locale.startsWith("pt")) return `Year ${grade} ${classLabel}`;
  if (getCountryCatalog(countryCode).countryCode === "BR") {
    return grade >= 10 ? `${grade - 9}ª série ${classLabel}` : `${grade}º ano ${classLabel}`;
  }
  return `${grade}.º ${classLabel}`;
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

/** The next Monday-to-Friday day after `from`: an absence registered on Friday or the weekend defaults to Monday. */
export function nextSchoolDay(from: Date): Date {
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  while (day.getDay() === 0 || day.getDay() === 6) day.setDate(day.getDate() + 1);
  return day;
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
export function formatSubject(
  subjectKey: string,
  subjectLabel: string,
  countryCode: CountryCode = DEFAULT_COUNTRY_CODE,
): string {
  const catalog = getCountryCatalog(countryCode);
  const known = catalog.subjects.some((s) => s.value === subjectKey);
  // Brazilian subjects are stored under their pt-BR name, which is already the display label.
  if (catalog.countryCode === "BR") return known ? subjectKey : subjectLabel;
  return translateSubject(known ? subjectKey : subjectLabel);
}

/** The departments in the order the direction pages list them. */
export const DEPARTMENTS: Department[] = ["languages", "maths_science", "humanities", "arts_pe", "primary", "other"];

// The states with a confirmed lesson to measure against; the others have no execution figure.
const COUNTED_STATES: TurmaState[] = ["on_track", "watch", "behind"];

/**
 * Execution per department: the lessons held on plan over the lessons past, summed over its counted turmas (not an
 * average of their percents). A department with no counted turma has no figure and is left out.
 */
export function departmentExecution(
  turmas: DirectionTurma[],
): { department: Department; percent: number; onPlan: number; past: number }[] {
  return DEPARTMENTS.flatMap((department) => {
    const counted = turmas.filter((t) => t.department === department && COUNTED_STATES.includes(t.state));
    const past = counted.reduce((sum, t) => sum + t.lessonsPast, 0);
    const onPlan = Math.max(0, past - counted.reduce((sum, t) => sum + t.lessonsBehind, 0));
    // As on the backend: with lessons behind, never round up to 100%.
    const percent = Math.round((onPlan * 100) / past);
    return past > 0 ? [{ department, percent: onPlan < past ? Math.min(99, percent) : percent, onPlan, past }] : [];
  });
}

/** Turmas with lessons past, and how many of them have a confirmed check-in (so their figures can be trusted). */
export function recordCoverage(turmas: DirectionTurma[]): { measured: number; expected: number } {
  const expected = turmas.filter((t) => t.state !== "not_started").length;
  return { measured: turmas.filter((t) => COUNTED_STATES.includes(t.state)).length, expected };
}
