"use client";

import { YourWeekClassBlock } from "@/components/dashboard/YourWeekClassBlock";
import { Button } from "@/components/ui/button";
import { useNewClassGate, usePlanLimits } from "@/hooks/usePlanLimits";
import { meService } from "@/services/api/me.service";
import { generateLesson, generateWeek } from "@/services/api/timetable.service";
import { userService } from "@/services/api/user.service";
import { Routes } from "@/shared/types";
import type { MyWeek, MyWeekLesson } from "@/shared/types/my-week";
import type { UpgradeReason } from "@/shared/types/plan-limits";
import { addDaysIso, defaultWeekStart } from "@/shared/utils/week";
import { useAppDispatch } from "@/store/hooks";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import posthog from "posthog-js";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";

function isUpgradeReason(code: string): code is UpgradeReason {
  return code === "free_class_limit" || code === "free_period_limit";
}

function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** "12 – 18 October" within one month, "27 Oct – 2 Nov" across two. */
function formatWeekRange(weekStart: string, locale: string): string {
  const start = parseIso(weekStart);
  const end = parseIso(addDaysIso(weekStart, 6));
  if (start.getMonth() === end.getMonth()) {
    const day = new Intl.DateTimeFormat(locale, { day: "numeric" });
    const month = new Intl.DateTimeFormat(locale, { month: "long" });
    return `${day.format(start)} – ${day.format(end)} ${month.format(end)}`;
  }
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const clean = (v: string) => v.replace(/\./g, "");
  return `${clean(short.format(start))} – ${clean(short.format(end))}`;
}

/** Dashboard card with the lessons of the week being planned, grouped by class. */
export function YourWeekCard() {
  const t = useTranslations("yourWeek");
  const tShared = useTranslations("calendar.shared");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const newClassGate = useNewClassGate();
  const { limits } = usePlanLimits();
  const hasClasses = (limits?.activeClasses ?? 0) > 0;

  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [week, setWeek] = useState<MyWeek | null>(null);
  const [failed, setFailed] = useState(false);
  const [preparing, setPreparing] = useState<Set<string>>(new Set());
  const viewedRef = useRef(false);
  const weekStartRef = useRef<string | null>(null);
  weekStartRef.current = weekStart;

  // The planning day decides which week opens first; fall back to the default (Sunday).
  useEffect(() => {
    let cancelled = false;
    userService
      .getCurrentUser()
      .then((user) => user.planningDay)
      .catch(() => null)
      .then((planningDay) => {
        if (!cancelled) setWeekStart(defaultWeekStart(planningDay));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!weekStart) return;
    let cancelled = false;
    setWeek(null);
    setFailed(false);
    meService
      .getWeek(weekStart)
      .then((data) => {
        if (cancelled) return;
        setWeek(data);
        if (!viewedRef.current) {
          viewedRef.current = true;
          posthog.capture("your_week_card_viewed", {
            lesson_count: data.classes.reduce((sum, c) => sum + c.lessons.length, 0),
            class_count: data.classes.length,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const patchLesson = useCallback((id: string, status: MyWeekLesson["status"]) => {
    setWeek((prev) =>
      prev && {
        ...prev,
        classes: prev.classes.map((c) => ({
          ...c,
          lessons: c.lessons.map((l) => (l.id === id ? { ...l, status } : l)),
        })),
      },
    );
  }, []);

  const handleCreateLesson = async (timetableId: string, lessonId: string) => {
    if (!weekStart) return;
    const generatedWeek = weekStart;
    posthog.capture("your_week_create_lesson_clicked");
    patchLesson(lessonId, "generating");
    let problem = false;
    let done = false;
    try {
      await generateLesson(
        timetableId,
        lessonId,
        undefined,
        {
          onDone: () => {
            done = true;
          },
          onFreeLimit: (code) => {
            problem = true;
            if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
          },
          onQuotaExceeded: () => {
            problem = true;
            dispatch(setUpgradeModalOpen(true));
          },
          onError: () => {
            problem = true;
          },
        },
        getToken,
      );
    } catch (err) {
      problem = true;
      posthog.captureException(err);
    } finally {
      if (problem || !done) {
        patchLesson(lessonId, "failed");
        toast.error(t("createLessonError"));
      }
      meService
        .getWeek(generatedWeek)
        .then((data) => {
          if (weekStartRef.current === generatedWeek) setWeek(data);
        })
        .catch(() => toast.error(t("refreshError")));
    }
  };

  const handlePrepare = async (timetableId: string) => {
    if (!weekStart) return;
    const generatedWeek = weekStart;
    posthog.capture("your_week_prepare_clicked");
    setPreparing((prev) => new Set(prev).add(timetableId));
    // Lessons started but not yet reported done/failed by the stream.
    const inFlight = new Set<string>();
    let problem = false;
    let generated = 0;
    try {
      await generateWeek(
        timetableId,
        generatedWeek,
        {
          onSlotStart: (id) => {
            inFlight.add(id);
            patchLesson(id, "generating");
          },
          onSlotDone: (id) => {
            inFlight.delete(id);
            generated += 1;
            patchLesson(id, "completed");
          },
          onSlotError: (id) => {
            inFlight.delete(id);
            problem = true;
            patchLesson(id, "failed");
          },
          onFreeLimit: (code) => {
            problem = true;
            if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
          },
          onQuotaExceeded: () => {
            problem = true;
            dispatch(setUpgradeModalOpen(true));
          },
          onError: () => {
            problem = true;
          },
        },
        getToken,
      );
    } catch (err) {
      problem = true;
      posthog.captureException(err);
    } finally {
      // A stream that ended or broke mid-lesson must not leave rows spinning.
      inFlight.forEach((id) => patchLesson(id, "failed"));
      if (problem || inFlight.size > 0) toast.error(t("prepareError"));
      else if (generated === 0) toast.info(t("nothingToPrepare"));
      setPreparing((prev) => {
        const next = new Set(prev);
        next.delete(timetableId);
        return next;
      });
      // Reload so finished lessons get their document link, unless the teacher
      // moved to another week meanwhile (that week was already loaded).
      meService
        .getWeek(generatedWeek)
        .then((data) => {
          if (weekStartRef.current === generatedWeek) setWeek(data);
        })
        .catch(() => toast.error(t("refreshError")));
    }
  };

  const range = weekStart ? formatWeekRange(weekStart, locale) : "";

  const classes = week?.classes.filter((c) => c.lessons.length > 0) ?? [];
  const hasNoClasses = week !== null && week.classes.length === 0 && !hasClasses;

  return (
    <div className="flex max-h-80 flex-col rounded-2xl border border-border bg-card p-3 shadow-md sm:px-4 sm:py-3">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <h2 className="text-lg font-semibold leading-tight text-foreground sm:truncate sm:text-xl">
              {t("title")}
            </h2>
            {range && <span className="shrink-0 text-sm leading-tight text-muted-foreground">{range}</span>}
          </div>
        </div>
        {weekStart && (
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("previousWeek")}
              onClick={() => setWeekStart(addDaysIso(weekStart, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("nextWeek")}
              onClick={() => setWeekStart(addDaysIso(weekStart, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {failed ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("error")}</p>
      ) : !week ? (
        <div className="space-y-2.5" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border p-3">
              <div className="mb-3 h-3 w-1/3 rounded bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-4/5 rounded bg-muted/60" />
                <div className="h-3 w-3/5 rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      ) : hasNoClasses ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href={Routes.CALENDAR_NEW} onClick={newClassGate.onClick}>
              <Plus className="mr-1 h-3 w-3" aria-hidden />
              {tShared("createClass")}
            </Link>
          </Button>
        </div>
      ) : classes.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">{t("noLessons")}</p>
          {weekStart && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => setWeekStart(addDaysIso(weekStart, 7))}
            >
              {t("seeNextWeek")}
              <ChevronRight className="ml-1 h-3 w-3" aria-hidden />
            </Button>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {classes.map((klass) => (
            <YourWeekClassBlock
              key={`${weekStart}-${klass.timetableId}`}
              klass={klass}
              locale={locale}
              preparing={preparing.has(klass.timetableId)}
              onPrepare={() => void handlePrepare(klass.timetableId)}
              onCreateLesson={(lessonId) => void handleCreateLesson(klass.timetableId, lessonId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
