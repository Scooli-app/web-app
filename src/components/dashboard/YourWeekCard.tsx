"use client";

import { CheckInStrip } from "@/components/dashboard/CheckInStrip";
import { FocusDayList } from "@/components/dashboard/FocusDayList";
import { LessonDetailBlock } from "@/components/dashboard/LessonDetailBlock";
import { NextDaysStrip, type StripLesson } from "@/components/dashboard/NextDaysStrip";
import { WeekLessonDialog, type WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { preparationCost } from "@/components/dashboard/lessonSuggestions";
import { hasGeneratingDocument, pickFocusDay, weekTitle, windowDays } from "@/components/dashboard/weekWindow";
import { translateSubject } from "@/components/document-creation/constants";
import { PlanGenerationBanner } from "@/components/plan-generation/PlanGenerationBanner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadError } from "@/components/ui/load-error";
import { invalidatePlanLimits, useNewClassGate, usePlanLimits } from "@/hooks/usePlanLimits";
import { meService } from "@/services/api/me.service";
import { generateLesson } from "@/services/api/timetable.service";
import { Routes } from "@/shared/types";
import type { MyWeek, MyWeekClass, MyWeekLesson } from "@/shared/types/my-week";
import { isUpgradeReason } from "@/shared/types/plan-limits";
import { toIso } from "@/shared/utils/calendar";
import { formatClassName } from "@/shared/utils/className";
import { isListableSlot } from "@/shared/utils/lessonTopic";
import { addDaysIso } from "@/shared/utils/week";
import { generationStore } from "@/store/generationStore";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPlanGeneration } from "@/store/planGeneration/selectors";
import { openUpgradeModalForReason, setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useAuth } from "@clerk/nextjs";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

const POLL_MS = 3000;

interface DayLesson {
  klass: MyWeekClass;
  lesson: MyWeekLesson;
}

/**
 * The dashboard's week, today first: today's lessons in detail (objectives, documents, one-click
 * "+ Ficha / Quiz / …"), then the next 6 days at a glance. Clicking a lesson opens its pop-up.
 */
export function YourWeekCard() {
  const t = useTranslations("yourWeek");
  const tShared = useTranslations("calendar.shared");
  const tTimetable = useTranslations("timetable");
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const newClassGate = useNewClassGate();
  const { limits } = usePlanLimits();
  const hasClasses = (limits?.activeClasses ?? 0) > 0;

  const todayIso = toIso(new Date());
  const [from, setFrom] = useState(todayIso);
  const [week, setWeek] = useState<MyWeek | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [preparing, setPreparing] = useState(false);
  const [confirmingPrepare, setConfirmingPrepare] = useState(false);
  const [openLesson, setOpenLesson] = useState<WeekLessonTarget | null>(null);
  // The next lesson day when it lies beyond the 7 days shown (a school break): loaded on its own.
  const [focusWeek, setFocusWeek] = useState<MyWeek | null>(null);
  const viewedRef = useRef(false);
  const fromRef = useRef(from);
  fromRef.current = from;
  const planGen = useAppSelector(selectPlanGeneration);
  const lastRefreshKeyRef = useRef(planGen.refreshKey);
  // Lesson plans being written anywhere (this card, the pop-up, the calendar).
  const generatingIds = useSyncExternalStore(
    generationStore.subscribe,
    generationStore.getSnapshot,
    generationStore.getServerSnapshot,
  );

  const reload = useCallback(() => {
    const target = fromRef.current;
    meService
      .getWindow(target)
      .then((data) => {
        if (fromRef.current === target) setWeek(data);
      })
      .catch(() => {
        /* the next poll or action retries; keep what is on screen */
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setWeek(null);
    setFailed(false);
    meService
      .getWindow(from)
      .then((data) => {
        if (cancelled) return;
        setWeek(data);
        if (!viewedRef.current) {
          viewedRef.current = true;
          posthog.capture("your_week_card_viewed", {
            lesson_count: data.classes.reduce((sum, c) => sum + c.lessons.length, 0),
            class_count: data.classes.length,
            layout: "today_first",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [from, attempt]);

  // Background plan generation (onboarding) finished something: show it without a refresh.
  useEffect(() => {
    if (planGen.refreshKey === lastRefreshKeyRef.current) return;
    lastRefreshKeyRef.current = planGen.refreshKey;
    reload();
  }, [planGen.refreshKey, reload]);

  // While any lesson document is still being written, poll until it's ready.
  const isPolling = week !== null && (hasGeneratingDocument(week) || generatingIds.size > 0);
  useEffect(() => {
    if (!isPolling) return;
    const id = window.setInterval(reload, POLL_MS);
    return () => window.clearInterval(id);
  }, [isPolling, reload]);

  const classLabel = useCallback(
    (klass: MyWeekClass) =>
      formatClassName(
        { gradeLevel: klass.gradeLevel, subject: klass.subject, classLabel: klass.classLabel, title: klass.title },
        { gradeShort: (grade) => tTimetable("gradeShort", { grade }), subject: translateSubject },
      ),
    [tTimetable],
  );

  const days = useMemo(() => windowDays(from), [from]);
  const lessonsByDay = useMemo(() => {
    const map = new Map<string, DayLesson[]>();
    const seen = new Set<string>();
    for (const klass of [...(week?.classes ?? []), ...(focusWeek?.classes ?? [])]) {
      for (const lesson of klass.lessons) {
        if (lesson.slotType === "HOLIDAY" || lesson.status === "skipped" || !isListableSlot(lesson)) continue;
        if (seen.has(lesson.id)) continue;
        seen.add(lesson.id);
        // A plan being written right now shows as "A preparar…" before the server has a document for it.
        const shown =
          generatingIds.has(lesson.id) && !lesson.documents.some((d) => d.role === "lessonPlan")
            ? {
                ...lesson,
                documents: [
                  { id: `pending-${lesson.id}`, role: "lessonPlan", documentType: "lessonPlan", title: "", status: "generating" },
                  ...lesson.documents,
                ],
              }
            : lesson;
        const list = map.get(lesson.slotDate) ?? [];
        list.push({ klass, lesson: shown });
        map.set(lesson.slotDate, list);
      }
    }
    return map;
  }, [week, focusWeek, generatingIds]);

  const focus = week ? pickFocusDay(from, week) : null;
  const focusIso = focus?.iso ?? null;
  const focusInWindow = focusIso !== null && days.includes(focusIso);
  useEffect(() => {
    setFocusWeek(null);
    if (!focusIso || focusInWindow) return;
    let cancelled = false;
    meService
      .getWindow(focusIso, 1)
      .then((data) => {
        if (!cancelled) setFocusWeek(data);
      })
      .catch(() => {
        /* the header still names the date */
      });
    return () => {
      cancelled = true;
    };
  }, [focusIso, focusInWindow]);
  const title = weekTitle(from, todayIso, focus);
  const focusLessons = focus ? lessonsByDay.get(focus.iso) ?? [] : [];
  // The focus day is shown in full above the strip; listing it again in "A seguir" repeats it.
  // Empty days are left out too: "Sem aulas" tiles only took room.
  const stripDays = days.slice(1).filter((iso) => iso !== focus?.iso && (lessonsByDay.get(iso)?.length ?? 0) > 0);
  // A plan made from the create form leaves the lesson "pending": a lesson with a plan document isn't.
  const pending = days
    .flatMap((d) => lessonsByDay.get(d) ?? [])
    .filter(
      (x) =>
        x.lesson.status === "pending" &&
        !x.lesson.documents.some((doc) => doc.role === "lessonPlan" && doc.status !== "failed"),
    );
  const hasNoClasses = week !== null && week.classes.length === 0 && !hasClasses && !week.nextLessonDate;

  const openPopup = (item: StripLesson | DayLesson) =>
    setOpenLesson({ timetableId: item.klass.timetableId, lessonId: item.lesson.id, weekStart: weekStartOf(item.lesson.slotDate) });

  // Prepare only the pending lessons the teacher can see, one at a time.
  const prepareCost = preparationCost(
    pending.map(({ lesson }) => ({ slotDate: lesson.slotDate, types: ["lessonPlan"] })),
    limits,
  );
  const handlePrepare = async () => {
    setConfirmingPrepare(false);
    if (preparing || pending.length === 0) return;
    posthog.capture("your_week_prepare_clicked", { lessons: pending.length });
    setPreparing(true);
    let problem = false;
    try {
      for (const { klass, lesson } of pending) {
        generationStore.start(lesson.id);
        let stop = false;
        try {
          await generateLesson(
            klass.timetableId,
            lesson.id,
            undefined,
            {
              onDone: () => undefined,
              onFreeLimit: (code) => {
                stop = true;
                if (isUpgradeReason(code)) dispatch(openUpgradeModalForReason(code));
              },
              onQuotaExceeded: () => {
                stop = true;
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
          generationStore.finish(lesson.id);
          reload();
        }
        if (stop) break;
      }
    } finally {
      setPreparing(false);
      invalidatePlanLimits(); // the first plan claims the free week
      if (problem) toast.error(t("prepareError"));
    }
  };

  // "seg 19": pt-PT's short weekday is the full word ("segunda"), so keep its first three letters.
  const shortDay = (iso: string) => {
    const date = new Date(`${iso}T00:00:00`);
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date).replace(/\./g, "");
    return `${weekday.slice(0, 3)} ${date.getDate()}`;
  };

  const dayTitle = (iso: string, long: boolean) =>
    new Intl.DateTimeFormat(locale, long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "short" })
      .format(new Date(`${iso}T00:00:00`))
      .replace(/\./g, "");

  return (
    <section className="rounded-2xl border border-border bg-card p-3 shadow-md sm:p-5">
      <CheckInStrip />
      {/* On a phone the title gets its own line: the actions never squeeze it away. */}
      <header className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-auto">
          <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <h2 className="min-w-0 text-lg font-semibold leading-tight text-foreground sm:truncate sm:text-xl">
            {title.kind === "today"
              ? t("todayTitle", { date: dayTitle(title.iso, true) })
              : title.kind === "focus"
                ? t("focusTitle", { date: dayTitle(title.iso, true) })
                : t("windowTitle", { from: dayTitle(from, false), to: dayTitle(days[days.length - 1], false) })}
            {focusLessons.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                · {t("lessonsCount", { count: focusLessons.length })}
              </span>
            )}
          </h2>
        </div>
        <div className="flex w-full shrink-0 items-center gap-1 sm:w-auto">
          {pending.length > 0 && (
            <Button size="sm" variant="outline" className="mr-auto h-8 sm:mr-0" disabled={preparing} onClick={() => setConfirmingPrepare(true)}>
              {preparing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden />}
              {t("prepareLessonPlans", { count: pending.length })}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("previousWeek")} onClick={() => setFrom(addDaysIso(from, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {from !== todayIso && (
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setFrom(todayIso)}>
              {t("backToToday")}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("nextWeek")} onClick={() => setFrom(addDaysIso(from, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <PlanGenerationBanner className="mb-3" />

      {failed ? (
        <LoadError message={t("error")} onRetry={() => setAttempt((n) => n + 1)} />
      ) : !week ? (
        <div className="space-y-3" aria-hidden>
          <div className="h-28 animate-pulse rounded-xl bg-muted/60" />
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/40" />
            ))}
          </div>
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
      ) : (
        <>
          {/* One lesson in full; a busier day is summarised, so the card keeps its height. */}
          {focusLessons.length === 1 ? (
            <LessonDetailBlock
              klass={focusLessons[0].klass}
              className={classLabel(focusLessons[0].klass)}
              lesson={focusLessons[0].lesson}
              onOpen={() => openPopup(focusLessons[0])}
              onChanged={reload}
            />
          ) : focusLessons.length > 1 ? (
            <FocusDayList
              lessons={focusLessons}
              classLabel={classLabel}
              onOpen={openPopup}
              weekStart={weekStartOf(focusLessons[0].lesson.slotDate)}
            />
          ) : (
            <p className="rounded-xl bg-background p-4 text-sm text-muted-foreground">
              {focus && !focusInWindow && !focusWeek ? t("loadingNextLesson") : t("noLessons")}
            </p>
          )}

          {stripDays.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-semibold text-muted-foreground">{t("next")}</h3>
              <NextDaysStrip days={stripDays} lessonsByDay={lessonsByDay} locale={locale} classLabel={classLabel} onOpen={openPopup} />
            </>
          )}
        </>
      )}

      <Dialog open={confirmingPrepare} onOpenChange={setConfirmingPrepare}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("prepareConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("prepareConfirmBody", { count: pending.length })}</DialogDescription>
          </DialogHeader>
          <ul className="mt-4 max-h-64 space-y-1.5 overflow-y-auto px-6 text-sm">
            {pending.map(({ klass, lesson }) => (
              <li key={lesson.id} className="flex items-baseline gap-2">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{shortDay(lesson.slotDate)}</span>
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{classLabel(klass)}</span>
                  {lesson.topicTitle ? <span className="text-muted-foreground"> · {lesson.topicTitle}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {prepareCost !== null && (
            <p className="mt-4 px-6 text-sm font-medium text-foreground">
              {prepareCost === 0 ? t("prepareCostFree") : t("prepareCost", { count: prepareCost })}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmingPrepare(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => void handlePrepare()}>
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
              {t("prepareConfirmAction", { count: pending.length })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WeekLessonDialog
        target={openLesson}
        onClose={() => {
          setOpenLesson(null);
          reload(); // documents may have been added from the pop-up
        }}
        onChanged={reload}
      />
    </section>
  );
}

/** The Monday of the ISO week a date falls in (the lesson pop-up loads lessons per ISO week). */
function weekStartOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const offset = (d.getDay() + 6) % 7;
  return addDaysIso(iso, -offset);
}
