/**
 * Shared school-period preset builder, used by both the curriculum-plan and
 * calendar creation wizards so the 6 canonical Portuguese school periods
 * (períodos, semestres, ano letivo) only live in one place.
 */
import type { CurriculumPlanningType } from "@/shared/types";

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

export function buildSchoolPeriodPresets(): SchoolPeriodPreset[] {
  const y = currentSchoolYearBase();
  return [
    { label: "1.º Período", planningType: "trimester", start: `${y}-09-16`, end: `${y}-12-19` },
    { label: "2.º Período", planningType: "trimester", start: `${y + 1}-01-06`, end: `${y + 1}-03-27` },
    { label: "3.º Período", planningType: "trimester", start: `${y + 1}-04-14`, end: `${y + 1}-06-19` },
    { label: "1.º Semestre", planningType: "semester", start: `${y}-09-16`, end: `${y + 1}-01-31` },
    { label: "2.º Semestre", planningType: "semester", start: `${y + 1}-02-01`, end: `${y + 1}-06-30` },
    { label: `Ano letivo ${y}/${y + 1}`, planningType: "annual", start: `${y}-09-16`, end: `${y + 1}-06-19` },
  ];
}

export function formatPresetRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("pt-PT", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}
