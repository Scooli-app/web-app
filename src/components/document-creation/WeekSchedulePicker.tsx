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
  type SlotTypeOrAuto,
  type WeekSchedule,
} from "@/lib/timetable/planToTimetable";
import { cn } from "@/shared/utils/utils";
import { Plus, X } from "lucide-react";

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

const TYPE_OPTIONS: { value: SlotTypeOrAuto; label: string }[] = [
  { value: "AUTO", label: "Automático" },
  { value: "LESSON", label: "Aula" },
  { value: "EXERCISE", label: "Exercícios" },
  { value: "REVIEW", label: "Revisão" },
  { value: "ASSESSMENT", label: "Avaliação" },
];

interface WeekSchedulePickerProps {
  schedule: WeekSchedule;
  onChange: (schedule: WeekSchedule) => void;
  maxPeriodsPerDay?: number;
}

/**
 * Shared weekly-schedule input (day toggles + a per-period type/duration row
 * for each weekly class), used by both curriculum-plan/novo and calendar/novo
 * so the "how many lessons a week, and what kind" question is asked and
 * answered identically in both wizards.
 */
export function WeekSchedulePicker({
  schedule,
  onChange,
  maxPeriodsPerDay = 10,
}: WeekSchedulePickerProps) {
  function toggle(key: DayKey) {
    onChange({ ...schedule, [key]: { ...schedule[key], enabled: !schedule[key].enabled } });
  }

  function addPeriod(key: DayKey) {
    if (schedule[key].periods.length >= maxPeriodsPerDay) return;
    onChange({
      ...schedule,
      [key]: { ...schedule[key], periods: [...schedule[key].periods, { durationMinutes: 50, type: "AUTO" }] },
    });
  }

  function removePeriod(key: DayKey, index: number) {
    const periods = schedule[key].periods.filter((_, i) => i !== index);
    if (periods.length === 0) return;
    onChange({ ...schedule, [key]: { ...schedule[key], periods } });
  }

  function setPeriodDuration(key: DayKey, index: number, durationMinutes: number) {
    const periods = schedule[key].periods.map((p, i) => (i === index ? { ...p, durationMinutes } : p));
    onChange({ ...schedule, [key]: { ...schedule[key], periods } });
  }

  function setPeriodType(key: DayKey, index: number, type: SlotTypeOrAuto) {
    const periods = schedule[key].periods.map((p, i) => (i === index ? { ...p, type } : p));
    onChange({ ...schedule, [key]: { ...schedule[key], periods } });
  }

  const total = weekScheduleLessonsPerWeek(schedule);

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
                "space-y-2 rounded-lg border px-4 py-3 transition-colors",
                day.enabled
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <Checkbox checked={day.enabled} onCheckedChange={() => toggle(key)} className="shrink-0" />

                <span className="w-20 text-sm font-medium">
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </span>

                {day.enabled && (
                  <button
                    type="button"
                    onClick={() => addPeriod(key)}
                    disabled={day.periods.length >= maxPeriodsPerDay}
                    className="ml-auto flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                  >
                    <Plus className="h-3 w-3" />
                    tempo
                  </button>
                )}
              </div>

              {day.enabled && (
                <div className="space-y-1.5 pl-8">
                  {day.periods.map((period, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-4 shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
                      <Select
                        value={period.type}
                        onValueChange={(v) => setPeriodType(key, index, v as SlotTypeOrAuto)}
                      >
                        <SelectTrigger className="h-8 flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(period.durationMinutes)}
                        onValueChange={(v) => setPeriodDuration(key, index, Number(v))}
                      >
                        <SelectTrigger className="h-8 w-28 shrink-0">
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
                      <button
                        type="button"
                        onClick={() => removePeriod(key, index)}
                        disabled={day.periods.length <= 1}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
