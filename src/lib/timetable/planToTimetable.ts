/**
 * Shared logic for turning a curriculum-plan (Planificação) Document into the
 * params needed to create a Timetable (Turma). Used by both the
 * calendar/novo "from_plan" wizard step and the one-click
 * CreateCalendarFromPlanButton, so the mapping only lives in one place.
 */
import { SUBJECTS } from "@/components/document-creation/constants";
import type {
  CreateTimetableParams,
  LessonSlotType,
  RecurringSlot,
} from "@/services/api/timetable.service";
import { getPortugueseHolidays } from "@/shared/constants/portugueseHolidays";
import type { Document } from "@/shared/types/document";

/** Alias of the single source of truth in timetable.service.ts, re-exported so existing imports of SlotType from this module keep working. */
export type SlotType = LessonSlotType;

export interface PreviewSlot {
  id: string;
  date: string; // ISO
  slotType: SlotType;
  sequenceNumber: number;
  durationMinutes: number;
}

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DaySchedule {
  enabled: boolean;
  periods: number;
  /** Minutes per lesson block on this day. Defaults to 50 when omitted (e.g. plans written before this field existed). */
  durationMinutes?: number;
}

/** Canonical weekly-schedule shape, shared by both creation wizards and persisted verbatim into metadata.additionalDetails.weekSchedule. */
export type WeekSchedule = Record<DayKey, DaySchedule>;

export const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DEFAULT_WEEK_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, periods: 1 },
  tue: { enabled: false, periods: 1 },
  wed: { enabled: true, periods: 1 },
  thu: { enabled: false, periods: 1 },
  fri: { enabled: true, periods: 1 },
  sat: { enabled: false, periods: 1 },
  sun: { enabled: false, periods: 1 },
};

const DAY_KEY_TO_ISO: Record<DayKey, number> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
};

const ISO_TO_DAY_KEY: Record<number, DayKey> = {
  1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 7: "sun",
};

/** Converts a WeekSchedule into backend RecurringSlot[] (dropping disabled/empty days). */
export function weekScheduleToRecurringSlots(schedule: Partial<WeekSchedule>): RecurringSlot[] {
  return (Object.entries(schedule) as [DayKey, DaySchedule | undefined][])
    .filter((entry): entry is [DayKey, DaySchedule] => !!entry[1]?.enabled && (entry[1]?.periods ?? 0) > 0)
    .map(([key, v]) => ({
      dayOfWeek: DAY_KEY_TO_ISO[key],
      slotsPerDay: v.periods,
      durationMinutes: v.durationMinutes ?? 50,
    }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/** Converts backend RecurringSlot[] into a full WeekSchedule (all 7 days present, disabled by default). */
export function recurringSlotsToWeekSchedule(slots: RecurringSlot[]): WeekSchedule {
  const schedule: WeekSchedule = { ...DEFAULT_WEEK_SCHEDULE };
  for (const key of DAY_ORDER) schedule[key] = { enabled: false, periods: 1 };
  for (const slot of slots) {
    const key = ISO_TO_DAY_KEY[slot.dayOfWeek];
    if (key) {
      schedule[key] = {
        enabled: true,
        periods: slot.slotsPerDay ?? 1,
        durationMinutes: slot.durationMinutes ?? 50,
      };
    }
  }
  return schedule;
}

export function weekScheduleLessonsPerWeek(schedule: WeekSchedule): number {
  return Object.values(schedule).reduce((sum, d) => sum + (d.enabled ? d.periods : 0), 0);
}

export interface CurriculumPlanDetails {
  planningType?: string;
  periodStart?: string;
  periodEnd?: string;
  schoolYearLabel?: string;
  lessonsPerWeek?: number;
  totalLessonsEstimate?: number;
  weekSchedule?: Partial<WeekSchedule>;
}

/** Parses the JSON string stored in metadata.additionalDetails (written by curriculum-plan/novo). */
export function parsePlanDetails(plan: Document): CurriculumPlanDetails {
  const meta = plan.metadata as Record<string, unknown> | null;
  if (typeof meta?.additionalDetails === "string") {
    try {
      return JSON.parse(meta.additionalDetails) as CurriculumPlanDetails;
    } catch {
      return {};
    }
  }
  return {};
}

/** Converts the plan's mon..sun WeekSchedule into backend RecurringSlot[]. */
export function planRecurringSlots(details: CurriculumPlanDetails): RecurringSlot[] {
  if (!details.weekSchedule) return [];
  return weekScheduleToRecurringSlots(details.weekSchedule);
}

/** Resolves a plan's stored English subject value back to the internal SUBJECTS id. */
export function resolvePlanSubjectId(plan: Document): string {
  if (!plan.subject) return "";
  const config = SUBJECTS.find((s) => s.value === plan.subject) ?? SUBJECTS.find((s) => s.id === plan.subject);
  return config?.id ?? "";
}

export function inferSchoolYearLabel(details: CurriculumPlanDetails): string {
  if (details.schoolYearLabel) return details.schoolYearLabel;
  if (details.periodStart) {
    const yr = parseInt(details.periodStart.slice(0, 4), 10);
    const month = parseInt(details.periodStart.slice(5, 7), 10);
    const base = month >= 9 ? yr : yr - 1;
    return `${base}/${base + 1}`;
  }
  return "";
}

/** A plan can drive one-click calendar creation only if it has dates AND a weekly schedule. */
export function isPlanCalendarReady(details: CurriculumPlanDetails): boolean {
  return !!details.periodStart && !!details.periodEnd && planRecurringSlots(details).length > 0;
}

/** Expands a period + weekly recurring schedule into per-date preview slots, auto-marking Portuguese public holidays. */
export function expandSlotsLocally(
  periodStart: string,
  periodEnd: string,
  recurringSlots: RecurringSlot[]
): PreviewSlot[] {
  if (!periodStart || !periodEnd || recurringSlots.length === 0) return [];

  const dayMap = new Map<number, RecurringSlot>();
  for (const rs of recurringSlots) {
    dayMap.set(rs.dayOfWeek, rs);
  }

  const startYear = parseInt(periodStart.slice(0, 4), 10);
  const endYear = parseInt(periodEnd.slice(0, 4), 10);
  const holidays = getPortugueseHolidays(startYear, endYear);

  const slots: PreviewSlot[] = [];
  let seq = 1;
  const current = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);

  while (current <= end) {
    const isoDow = current.getDay() === 0 ? 7 : current.getDay();
    const rs = dayMap.get(isoDow);
    if (rs) {
      const count = rs.slotsPerDay ?? 1;
      // Use local date components — toISOString() converts to UTC, shifting dates for UTC+ timezones
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
      const isHoliday = holidays.has(dateStr);
      for (let s = 0; s < count; s++) {
        slots.push({
          id: `preview-${dateStr}-${s}`,
          date: dateStr,
          slotType: isHoliday ? "HOLIDAY" : "LESSON",
          sequenceNumber: seq++,
          durationMinutes: rs.durationMinutes ?? 50,
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }
  return slots;
}

const EXERCISE_EVERY_N_LESSONS = 4;

/**
 * Client-side mirror of TimetableService.applyExerciseAndReviewCadence (Java) —
 * keep both in sync. Flips the LESSON slot immediately before each targeted
 * ASSESSMENT slot to REVIEW (skipping back over HOLIDAYs, stopping if a
 * non-LESSON/non-HOLIDAY slot is hit first).
 *
 * `targetIds`, when passed, restricts the pass to only those ASSESSMENT
 * slots — used to react to a single newly-marked assessment in the wizard's
 * review step without re-suggesting REVIEW for assessments the teacher may
 * have already manually adjusted away from the suggestion.
 */
export function suggestReviewsBeforeAssessments(
  slots: PreviewSlot[],
  targetIds?: Set<string>
): PreviewSlot[] {
  const next = slots.map((s) => ({ ...s }));
  for (let i = 0; i < next.length; i++) {
    if (next[i].slotType !== "ASSESSMENT") continue;
    if (targetIds && !targetIds.has(next[i].id)) continue;
    for (let j = i - 1; j >= 0; j--) {
      const candidate = next[j];
      if (candidate.slotType === "LESSON") {
        candidate.slotType = "REVIEW";
        break;
      }
      if (candidate.slotType !== "HOLIDAY") break;
    }
  }
  return next;
}

/** Client-side mirror of the EXERCISE half of TimetableService.applyExerciseAndReviewCadence. */
export function applyExerciseCadence(slots: PreviewSlot[]): PreviewSlot[] {
  const next = slots.map((s) => ({ ...s }));
  let streak = 0;
  for (const slot of next) {
    if (slot.slotType !== "LESSON") continue;
    streak++;
    if (streak === EXERCISE_EVERY_N_LESSONS) {
      slot.slotType = "EXERCISE";
      streak = 0;
    }
  }
  return next;
}

/** Full auto-cadence (REVIEW pass first, then EXERCISE), for the wizard's initial preview. */
export function applyExerciseAndReviewCadence(slots: PreviewSlot[]): PreviewSlot[] {
  return applyExerciseCadence(suggestReviewsBeforeAssessments(slots));
}

export function buildPlanAutoTitle(plan: Document): string {
  const subjectId = resolvePlanSubjectId(plan);
  const label = SUBJECTS.find((s) => s.id === subjectId)?.label ?? plan.subject ?? "";
  const grade = plan.gradeLevel ? `${plan.gradeLevel}.º` : "";
  return [grade, label].filter(Boolean).join(" ") || "Nova Turma";
}

/**
 * Builds a full CreateTimetableParams from a curriculum-plan Document, ready
 * to dispatch directly. Returns null if the plan doesn't carry enough data
 * (e.g. an imported plan with no weekSchedule) — callers should fall back to
 * the calendar/novo wizard, pre-filled, in that case.
 */
export function buildCreateTimetableParamsFromPlan(plan: Document): CreateTimetableParams | null {
  const details = parsePlanDetails(plan);
  if (!isPlanCalendarReady(details)) return null;

  const recurringSlots = planRecurringSlots(details);
  const previewSlots = expandSlotsLocally(details.periodStart as string, details.periodEnd as string, recurringSlots);
  const holidays = previewSlots.filter((s) => s.slotType === "HOLIDAY").map((s) => s.date);

  const subjectId = resolvePlanSubjectId(plan);
  const subjectValue = SUBJECTS.find((s) => s.id === subjectId)?.value ?? plan.subject ?? "";

  return {
    title: buildPlanAutoTitle(plan),
    subject: subjectValue,
    gradeLevel: plan.gradeLevel ? Number(plan.gradeLevel) : 0,
    periodStart: details.periodStart as string,
    periodEnd: details.periodEnd as string,
    schoolYearLabel: inferSchoolYearLabel(details) || undefined,
    creationMode: "from_plan",
    linkedCurriculumPlan: plan.id,
    recurringSlots,
    holidays,
    assessmentDates: [],
  };
}
