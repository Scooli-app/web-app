/**
 * Shared school-period preset builder, used by both the curriculum-plan and
 * calendar creation wizards so each country's school periods only live in one place.
 *
 * - Portugal: the school year runs September to June, in three períodos (or two semestres).
 * - Brazil: the school year is the calendar year, February to December, usually in four
 *   bimestres (or two semestres), with a recess in July.
 *
 * The dates are typical values, not any network's official calendar: the teacher can
 * change both ends after picking a preset.
 */
import type { CurriculumPlanningType } from "@/shared/types";
import type { Locale } from "@/i18n/locales";
import type { CountryCode } from "@/lib/curriculum/countryCatalog";
import { toIntlLocale } from "@/shared/utils/calendar";
import { translate } from "@/i18n/translate";

export interface SchoolPeriodPreset {
  label: string;
  planningType: CurriculumPlanningType;
  start: string; // ISO date
  end: string; // ISO date
}

/**
 * The year the current (or next) school year starts in.
 * Portugal: from September it is this year's, before that last year's.
 * Brazil: the calendar year; from December on, the next one (planning for February).
 */
export function currentSchoolYearBase(country: CountryCode = "PT", now: Date = new Date()): number {
  if (country === "BR") {
    return now.getMonth() >= 11 ? now.getFullYear() + 1 : now.getFullYear();
  }
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/** "2026/2027" in Portugal, "2027" in Brazil. */
export function schoolYearLabelFor(country: CountryCode = "PT", now: Date = new Date()): string {
  const y = currentSchoolYearBase(country, now);
  return country === "BR" ? String(y) : `${y}/${y + 1}`;
}

/**
 * Builds the country's school-period presets. Labels are resolved via
 * `translate()` at call time (never cached in a module-level constant) so
 * they always reflect the interface locale active when the wizard renders.
 */
export function buildSchoolPeriodPresets(country: CountryCode = "PT", now: Date = new Date()): SchoolPeriodPreset[] {
  const y = currentSchoolYearBase(country, now);
  if (country === "BR") {
    return [
      { label: translate("calendar.periods.bimester1"), planningType: "trimester", start: `${y}-02-02`, end: `${y}-04-17` },
      { label: translate("calendar.periods.bimester2"), planningType: "trimester", start: `${y}-04-20`, end: `${y}-07-10` },
      { label: translate("calendar.periods.bimester3"), planningType: "trimester", start: `${y}-07-27`, end: `${y}-10-02` },
      { label: translate("calendar.periods.bimester4"), planningType: "trimester", start: `${y}-10-05`, end: `${y}-12-18` },
      { label: translate("calendar.periods.semester1"), planningType: "semester", start: `${y}-02-02`, end: `${y}-07-10` },
      { label: translate("calendar.periods.semester2"), planningType: "semester", start: `${y}-07-27`, end: `${y}-12-18` },
      {
        label: translate("calendar.periods.schoolYear", { range: String(y) }),
        planningType: "annual",
        start: `${y}-02-02`,
        end: `${y}-12-18`,
      },
    ];
  }
  return [
    { label: translate("calendar.periods.term1"), planningType: "trimester", start: `${y}-09-16`, end: `${y}-12-19` },
    { label: translate("calendar.periods.term2"), planningType: "trimester", start: `${y + 1}-01-06`, end: `${y + 1}-03-27` },
    { label: translate("calendar.periods.term3"), planningType: "trimester", start: `${y + 1}-04-14`, end: `${y + 1}-06-19` },
    { label: translate("calendar.periods.semester1"), planningType: "semester", start: `${y}-09-16`, end: `${y + 1}-01-31` },
    { label: translate("calendar.periods.semester2"), planningType: "semester", start: `${y + 1}-02-01`, end: `${y + 1}-06-30` },
    {
      label: translate("calendar.periods.schoolYear", { range: `${y}/${y + 1}` }),
      planningType: "annual",
      start: `${y}-09-16`,
      end: `${y + 1}-06-19`,
    },
  ];
}

export function formatPresetRange(start: string, end: string, locale: Locale): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(toIntlLocale(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
