/**
 * Shared school-period preset builder, used by both the curriculum-plan and
 * calendar creation wizards so the 6 canonical Portuguese school periods
 * (períodos, semestres, ano letivo) only live in one place.
 */
import type { CurriculumPlanningType } from "@/shared/types";
import type { Locale } from "@/i18n/locales";
import { toIntlLocale } from "@/shared/utils/calendar";
import { translate } from "@/i18n/translate";

export interface SchoolPeriodPreset {
  label: string;
  planningType: CurriculumPlanningType;
  start: string; // ISO date
  end: string; // ISO date
}

export function currentSchoolYearBase(): number {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Builds the 6 canonical school-period presets. Labels are resolved via
 * `translate()` at call time (never cached in a module-level constant) so
 * they always reflect the interface locale active when the wizard renders.
 */
export function buildSchoolPeriodPresets(): SchoolPeriodPreset[] {
  const y = currentSchoolYearBase();
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
