"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Routes } from "@/shared/types";
import { selectIsHorarioPlanosEnabled } from "@/store/features/selectors";
import { fetchTimetables } from "@/store/timetable/timetableSlice";
import { useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store/store";
import { listLessons, type LessonSlot, type Timetable } from "@/services/api/timetable.service";
import { ArrowLeft, ArrowRight, CalendarDays, Plus } from "lucide-react";
import { toIso, addDays, getWeekStart as getIsoWeekStart, DAY_LABELS } from "@/shared/utils/calendar";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMonthStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function formatMonthHeader(d: Date): string {
  const label = d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  // Capitalize only the first letter; don't use CSS capitalize (uppercases every word)
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DayInfo {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  slots: Array<{ timetable: Timetable; slot: LessonSlot }>;
}

export default function CalendarMonthPage() {
  const enabled = useSelector(selectIsHorarioPlanosEnabled);
  const { timetables, isLoading: timetablesLoading } = useSelector(
    (state: RootState) => state.timetable,
  );
  const dispatch = useAppDispatch();
  const router = useRouter();

  const [monthStart, setMonthStart] = useState<Date>(() => getMonthStart());
  const [slotsByDate, setSlotsByDate] = useState<Map<string, Array<{ timetable: Timetable; slot: LessonSlot }>>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      router.replace(Routes.DASHBOARD);
      return;
    }
    dispatch(fetchTimetables());
  }, [enabled, dispatch, router]);

  // Compute the 5–6 week-starts that cover this month
  const weekStarts = useMemo<string[]>(() => {
    const starts: string[] = [];
    let cursor = getIsoWeekStart(monthStart);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    while (cursor <= monthEnd) {
      starts.push(toIso(cursor));
      cursor = addDays(cursor, 7);
    }
    return starts;
  }, [monthStart]);

  const activeTimetables = useMemo(
    () => timetables.filter((t) => t.status === "active"),
    [timetables],
  );

  const load = useCallback(async () => {
    if (activeTimetables.length === 0) { setSlotsByDate(new Map()); return; }
    setLoading(true);
    try {
      const map = new Map<string, Array<{ timetable: Timetable; slot: LessonSlot }>>();
      const results = await Promise.all(
        activeTimetables.flatMap((t) =>
          weekStarts.map(async (ws) => {
            try {
              const slots = await listLessons(t.id, ws);
              return { timetable: t, slots };
            } catch {
              return { timetable: t, slots: [] as LessonSlot[] };
            }
          }),
        ),
      );
      for (const { timetable, slots } of results) {
        for (const slot of slots) {
          if (!map.has(slot.slotDate)) map.set(slot.slotDate, []);
          const dayEntries = map.get(slot.slotDate);
          if (dayEntries) dayEntries.push({ timetable, slot });
        }
      }
      setSlotsByDate(map);
    } finally {
      setLoading(false);
    }
  }, [activeTimetables, weekStarts]);

  useEffect(() => {
    if (!timetablesLoading) void load();
  }, [timetablesLoading, load]);

  // Build grid rows: Mon–Sun for each week covering the month
  const today = toIso(new Date());
  const gridDays = useMemo<DayInfo[][]>(() => {
    const rows: DayInfo[][] = [];
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    let cursor = getIsoWeekStart(monthStart);

    while (cursor <= monthEnd || rows.length === 0) {
      const row: DayInfo[] = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(cursor, i);
        const iso = toIso(day);
        row.push({
          date: day,
          iso,
          isCurrentMonth: day.getMonth() === monthStart.getMonth(),
          isToday: iso === today,
          slots: slotsByDate.get(iso) ?? [],
        });
      }
      rows.push(row);
      cursor = addDays(cursor, 7);
      if (cursor > monthEnd) break;
    }
    return rows;
  }, [monthStart, slotsByDate, today]);

  const handleDayClick = (day: DayInfo) => {
    const weekStart = toIso(getIsoWeekStart(day.date));
    router.push(`${Routes.CALENDAR}?week=${weekStart}`);
  };

  if (!enabled) return null;

  return (
    <div className="flex w-full flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur px-4 pt-2.5 pb-2">
        <div className="mx-auto max-w-[1400px] space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="mr-2 text-lg font-semibold">Calendário</h1>

            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border overflow-hidden">
              <Link
                href={Routes.CALENDAR}
                className="px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Semana
              </Link>
              <span className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground">
                Mês
              </span>
            </div>

            <Button variant="outline" size="sm" onClick={() => setMonthStart(getMonthStart())} className="h-8">
              Hoje
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthStart((p) => addMonths(p, -1))}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthStart((p) => addMonths(p, 1))}>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <span className="min-w-[160px] text-sm font-medium">
              {formatMonthHeader(monthStart)}
            </span>

            <div className="flex-1" />

            <Button variant="outline" size="sm" asChild className="h-8">
              <Link href={Routes.CALENDAR_SEQUENCES}>
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                Minhas sequências
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8">
              <Link href={Routes.CALENDAR_NEW}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Nova sequência
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Month grid */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-4">
        {(loading || timetablesLoading) && activeTimetables.length === 0 ? (
          // Full grid skeleton while data loads on first render
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-7 divide-x divide-border border-b bg-muted/20">
              {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map((d) => (
                <div key={d} className="py-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
            {Array.from({ length: 5 }, (_, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 divide-x divide-border border-b last:border-b-0">
                {Array.from({ length: 7 }, (_, colIdx) => (
                  <div key={colIdx} className="min-h-[100px] animate-pulse p-2">
                    <div className="mb-2 h-5 w-5 rounded-full bg-muted" />
                    {colIdx < 5 && rowIdx < 3 && (
                      <div className="space-y-1">
                        <div className="flex gap-0.5">
                          <div className="h-2 w-2 rounded-full bg-muted/60" />
                          <div className="h-2 w-2 rounded-full bg-muted/40" />
                        </div>
                        <div className="h-2.5 w-12 rounded bg-muted/60" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : activeTimetables.length === 0 && !timetablesLoading ? (
          <div className="py-20 text-center">
            <CalendarDays className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Nenhuma sequência de aulas</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Cria a tua primeira sequência para começar a planificar.
            </p>
            <Button asChild className="mt-5">
              <Link href={Routes.CALENDAR_NEW}>
                <Plus className="mr-2 h-4 w-4" />
                Criar sequência
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 divide-x divide-border border-b bg-muted/20">
              {DAY_LABELS.map((label) => (
                <div key={label} className="py-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Weeks */}
            {gridDays.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-7 divide-x divide-border border-b last:border-b-0">
                {row.map((day) => {
                  const lessonCount = day.slots.filter(
                    (s) => s.slot.slotType !== "HOLIDAY" && s.slot.status !== "skipped",
                  ).length;
                  const pendingCount = day.slots.filter((s) => s.slot.status === "pending").length;
                  const completedCount = day.slots.filter((s) => s.slot.status === "completed").length;

                  // Collect unique timetable colors for this day
                  const colors = [...new Set(day.slots.map((s) => s.timetable.color || "#7F77DD"))];

                  const isWeekday = day.date.getDay() >= 1 && day.date.getDay() <= 5;

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => handleDayClick(day)}
                      className={`min-h-[100px] p-2 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        !day.isCurrentMonth ? "bg-muted/20" : ""
                      } ${day.isToday ? "bg-primary/[0.04]" : ""}`}
                    >
                      {/* Day number */}
                      <div className="mb-1.5 flex items-center justify-between">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold leading-none ${
                            day.isToday
                              ? "bg-primary text-primary-foreground"
                              : day.isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground/40"
                          }`}
                        >
                          {day.date.getDate()}
                        </span>
                      </div>

                      {/* Skeleton while loading lesson slots */}
                      {loading && isWeekday && day.isCurrentMonth && (
                        <div className="animate-pulse space-y-1.5">
                          <div className="flex gap-1">
                            <div className="h-2 w-2 rounded-full bg-muted" />
                            <div className="h-2 w-2 rounded-full bg-muted/70" />
                          </div>
                          <div className="h-2.5 w-14 rounded bg-muted" />
                          <div className="h-2 w-10 rounded bg-muted/60" />
                        </div>
                      )}

                      {/* Lesson summary */}
                      {!loading && lessonCount > 0 && (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-0.5">
                            {colors.slice(0, 4).map((color, ci) => (
                              <span
                                key={ci}
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <p className="text-[11px] font-medium text-foreground">
                            {lessonCount} aula{lessonCount !== 1 ? "s" : ""}
                          </p>
                          {(pendingCount > 0 || completedCount > 0) && (
                            <p className="text-[10px] text-muted-foreground">
                              {completedCount > 0 && (
                                <span className="text-green-600 dark:text-green-400">
                                  {completedCount} gerada{completedCount !== 1 ? "s" : ""}
                                </span>
                              )}
                              {completedCount > 0 && pendingCount > 0 && " · "}
                              {pendingCount > 0 && (
                                <span className="text-muted-foreground">
                                  {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
