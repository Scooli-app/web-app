"use client";

/**
 * CalendarDashboardWidget
 * Shows the next 5 upcoming lessons across all active sequences.
 * Spec: Feature 2, Phase 6 — only shown to Pro / Institucional users.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listTimetables,
  listLessons,
  generateLesson,
  listLessonDocuments,
  type LessonSlot,
  type LessonSlotStatus,
  type Timetable,
} from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  SkipForward,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useSyncExternalStore, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { generationStore } from "@/store/generationStore";

interface UpcomingLesson extends LessonSlot {
  timetable: Timetable;
}

/** Returns today's date as YYYY-MM-DD using local time (not UTC). */
function localIsoDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the ISO week-start (Monday) for the given date using local time. */
function isoWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun … 6=Sat
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return localIsoDate(d);
}

function isUpcoming(slot: LessonSlot): boolean {
  // Compare against local today so timezone offsets don't accidentally
  // exclude lessons that are still in the future locally.
  return (
    slot.slotDate >= localIsoDate() &&
    slot.slotType !== "HOLIDAY" &&
    slot.status !== "skipped"
  );
}

/** Human-friendly label: "Hoje", "Amanhã", or "Seg, 2 jun". */
function relativeDate(slotDate: string): string {
  const today = localIsoDate();
  if (slotDate === today) return "Hoje";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (slotDate === localIsoDate(tomorrow)) return "Amanhã";

  // Parse as local midnight to avoid UTC-shift
  return new Date(`${slotDate}T00:00:00`).toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

type BadgeCfg = { label: string; cls: string; icon: React.ReactNode };

const STATUS_CFG: Record<LessonSlot["status"], BadgeCfg> = {
  pending: {
    label: "Pendente",
    cls: "bg-muted text-muted-foreground border",
    icon: <Clock className="h-3 w-3" />,
  },
  generating: {
    label: "A gerar",
    cls: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  completed: {
    label: "Gerado",
    cls: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Falhou",
    cls: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  skipped: {
    label: "Ignorado",
    cls: "bg-muted text-muted-foreground/60 border",
    icon: <SkipForward className="h-3 w-3" />,
  },
};

export function CalendarDashboardWidget() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  /** Slot ID whose document is being fetched for navigation. */
  const [openingSlot, setOpeningSlot] = useState<string | null>(null);

  /** Persists across navigation — shared with the calendar page. */
  const generatingSlots = useSyncExternalStore(
    generationStore.subscribe,
    generationStore.getSnapshot,
    () => new Set<string>(),
  );

  /** Navigate to the document editor for a completed lesson. */
  const handleOpen = useCallback(
    async (lesson: UpcomingLesson, e: React.MouseEvent) => {
      e.stopPropagation();
      setOpeningSlot(lesson.id);
      try {
        const docs = await listLessonDocuments(lesson.timetable.id, lesson.id);
        const first = docs[0];
        if (first) {
          const base =
            first.documentRole === "quiz" ? Routes.QUIZ
            : first.documentRole === "test" ? Routes.TEST
            : first.documentRole === "worksheet" ? Routes.WORKSHEET
            : first.documentRole === "presentation" ? Routes.PRESENTATION
            : Routes.LESSON_PLAN;
          router.push(`${base}/${first.documentId}`);
        } else {
          router.push(Routes.CALENDAR);
        }
      } catch {
        router.push(Routes.CALENDAR);
      } finally {
        setOpeningSlot(null);
      }
    },
    [router]
  );

  const patchStatus = useCallback((slotId: string, status: LessonSlotStatus) => {
    setUpcoming((prev) =>
      prev.map((l) => (l.id === slotId ? { ...l, status } : l))
    );
  }, []);

  const handleGenerate = useCallback(
    async (lesson: UpcomingLesson) => {
      generationStore.start(lesson.id);
      patchStatus(lesson.id, "generating");
      try {
        await generateLesson(lesson.timetable.id, lesson.id, undefined, {
          onDone: () => {
            patchStatus(lesson.id, "completed");
            generationStore.finish(lesson.id);
          },
          onError: () => {
            patchStatus(lesson.id, "failed");
            generationStore.finish(lesson.id);
          },
        }, getToken);
      } catch {
        generationStore.finish(lesson.id);
      }
    },
    [getToken, patchStatus]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const timetables = await listTimetables();
      const active = timetables.filter((t) => t.status === "active");

      const thisWeek = isoWeekStart();
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeek = isoWeekStart(nextWeekDate);

      const rows = await Promise.all(
        active.map(async (t) => {
          try {
            const [a, b] = await Promise.all([
              listLessons(t.id, thisWeek),
              listLessons(t.id, nextWeek),
            ]);
            return [...a, ...b]
              .filter(isUpcoming)
              .map((s) => ({ ...s, timetable: t }));
          } catch {
            return [] as UpcomingLesson[];
          }
        })
      );

      const all = rows.flat().sort((a, b) => {
        if (a.slotDate !== b.slotDate) return a.slotDate < b.slotDate ? -1 : 1;
        return a.sequenceNumber - b.sequenceNumber;
      });
      setUpcoming(all.slice(0, 5));
    } catch {
      setUpcoming([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md sm:p-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            Próximas aulas
          </h2>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-primary">
          <Link href={Routes.CALENDAR}>
            Ver calendário <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
              style={{ borderLeft: "3px solid hsl(var(--muted))" }}
            >
              <div className="h-2 w-2 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 rounded bg-muted w-3/5" />
                <div className="h-2.5 rounded bg-muted/60 w-2/5" />
              </div>
              <div className="h-5 w-16 rounded-full bg-muted shrink-0" />
            </div>
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não tens aulas próximas.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href={Routes.CALENDAR_NEW}>
              <Plus className="mr-1 h-3 w-3" />
              Criar sequência
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((lesson) => {
            const cfg = STATUS_CFG[lesson.status];
            const dateLabel = relativeDate(lesson.slotDate);
            const isToday = lesson.slotDate === localIsoDate();
            return (
              <div
                key={lesson.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const weekStart = isoWeekStart(new Date(`${lesson.slotDate}T00:00:00`));
                  router.push(`${Routes.CALENDAR}?week=${weekStart}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    const weekStart = isoWeekStart(new Date(`${lesson.slotDate}T00:00:00`));
                    router.push(`${Routes.CALENDAR}?week=${weekStart}`);
                  }
                }}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{ borderLeft: `3px solid ${lesson.timetable.color || "#7F77DD"}` }}
              >
                {/* Color dot */}
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: lesson.timetable.color || "#7F77DD" }}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {lesson.topicTitle || "Sem tópico"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className={isToday ? "font-semibold text-primary" : ""}>
                      {dateLabel}
                    </span>
                    {" · "}
                    {lesson.timetable.subject}
                    {lesson.timetable.classLabel ? ` · ${lesson.timetable.classLabel}` : ""}
                  </p>
                </div>

                {/* Status + action */}
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={`gap-1 border text-xs ${cfg.cls}`}>
                    {cfg.icon}
                    {cfg.label}
                  </Badge>
                  {(lesson.status === "pending" || lesson.status === "failed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled={generatingSlots.has(lesson.id)}
                      onClick={(e) => { e.stopPropagation(); void handleGenerate(lesson); }}
                    >
                      {generatingSlots.has(lesson.id) ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-1 h-3 w-3" />
                      )}
                      Gerar
                    </Button>
                  )}
                  {lesson.status === "generating" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      disabled
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      A gerar…
                    </Button>
                  )}
                  {lesson.status === "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-primary"
                      disabled={openingSlot === lesson.id}
                      onClick={(e) => void handleOpen(lesson, e)}
                    >
                      {openingSlot === lesson.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Abrir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
