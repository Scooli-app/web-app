"use client";

import { ChoiceChip } from "@/components/onboarding-v2/ChoiceChip";
import type { DayKey } from "@/lib/timetable/planToTimetable";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

export const CLASS_DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat"];
export const MAX_LESSONS_PER_DAY = 3;

/** Lessons per weekday; 0 means no class that day. */
export type LessonsByDay = Record<DayKey, number>;

interface WeekdayPickerProps {
  value: LessonsByDay;
  onChange: (value: LessonsByDay) => void;
  disabled?: boolean;
}

/** Weekday chips, each with a 1–3 stepper of lessons that day once selected. */
export function WeekdayPicker({ value, onChange, disabled }: WeekdayPickerProps) {
  const t = useTranslations("onboardingV2.class");

  const setDay = (day: DayKey, count: number) => onChange({ ...value, [day]: count });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CLASS_DAYS.map((day) => (
          <ChoiceChip
            key={day}
            selected={value[day] > 0}
            disabled={disabled}
            onClick={() => setDay(day, value[day] > 0 ? 0 : 1)}
            className="min-w-16"
          >
            {t(`days.${day}`)}
          </ChoiceChip>
        ))}
      </div>

      <ul className="space-y-2">
        {CLASS_DAYS.filter((day) => value[day] > 0).map((day) => (
          <li
            key={day}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2"
          >
            <span className="text-sm font-medium text-foreground">{t(`days.${day}`)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t("lessonsFewer")}
                disabled={disabled || value[day] <= 1}
                onClick={() => setDay(day, value[day] - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span
                className="min-w-20 text-center text-sm tabular-nums text-foreground"
                aria-live="polite"
              >
                {t("lessonsCount", { count: value[day] })}
              </span>
              <button
                type="button"
                aria-label={t("lessonsMore")}
                disabled={disabled || value[day] >= MAX_LESSONS_PER_DAY}
                onClick={() => setDay(day, value[day] + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
