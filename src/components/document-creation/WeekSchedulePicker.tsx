"use client";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAY_ORDER,
  weekScheduleLessonsPerWeek,
  type DayKey,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { cn } from "@/shared/utils/utils";
import { Minus, Plus } from "lucide-react";

const DAY_LABELS: Record<DayKey, { label: string; short: string }> = {
  mon: { label: "Segunda", short: "Seg" },
  tue: { label: "Terça", short: "Ter" },
  wed: { label: "Quarta", short: "Qua" },
  thu: { label: "Quinta", short: "Qui" },
  fri: { label: "Sexta", short: "Sex" },
  sat: { label: "Sábado", short: "Sáb" },
  sun: { label: "Domingo", short: "Dom" },
};

const DURATION_OPTIONS = [45, 50, 55, 60, 75, 90, 100, 120];

interface WeekSchedulePickerProps {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  maxPeriodsPerDay?: number;
  /** Show a per-day lesson-duration selector below the day grid (calendar/novo needs this; curriculum-plan/novo doesn't track per-lesson duration). */
  showDuration?: boolean;
}

/**
 * Shared weekly-schedule input (day toggles + periods-per-day stepper, plus
 * an optional per-day duration selector), used by both curriculum-plan/novo
 * and calendar/novo so the "how many lessons a week" question is asked and
 * answered identically in both wizards.
 */
export function WeekSchedulePicker({
  schedule,
  onChange,
  maxPeriodsPerDay = 10,
  showDuration = false,
}: WeekSchedulePickerProps) {
  function toggle(key: DayKey) {
    onChange({ ...schedule, [key]: { ...schedule[key], enabled: !schedule[key].enabled } });
  }

  function adjust(key: DayKey, delta: number) {
    const next = Math.min(maxPeriodsPerDay, Math.max(1, schedule[key].periods + delta));
    onChange({ ...schedule, [key]: { ...schedule[key], periods: next } });
  }

  function setDuration(key: DayKey, durationMinutes: number) {
    onChange({ ...schedule, [key]: { ...schedule[key], durationMinutes } });
  }

  const total = weekScheduleLessonsPerWeek(schedule);
  const enabledDays = DAY_ORDER.filter((key) => schedule[key].enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Seleciona os dias e o número de tempos letivos por dia.
        </p>
        <Badge variant="secondary" className="text-sm font-semibold">
          {total} aula{total !== 1 ? "s" : ""}/semana
        </Badge>
      </div>

      <div className="grid gap-2">
        {DAY_ORDER.map((key) => {
          const day = schedule[key];
          const { label, short } = DAY_LABELS[key];
          return (
            <div
              key={key}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                day.enabled
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60"
              )}
            >
              <Checkbox checked={day.enabled} onCheckedChange={() => toggle(key)} className="shrink-0" />

              <span className="w-20 text-sm font-medium">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </span>

              {day.enabled && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjust(key, -1)}
                    disabled={day.periods <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">
                    {day.periods}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjust(key, 1)}
                    disabled={day.periods >= maxPeriodsPerDay}
                    className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="ml-1 w-14 text-xs text-muted-foreground">
                    tempo{day.periods !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showDuration && enabledDays.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Duração por aula
          </p>
          {enabledDays.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-sm text-muted-foreground">
                {DAY_LABELS[key].label}
              </span>
              <Select
                value={String(schedule[key].durationMinutes ?? 50)}
                onValueChange={(v) => setDuration(key, Number(v))}
              >
                <SelectTrigger className="h-8 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} min
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
