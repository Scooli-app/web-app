"use client";

import { WeekLessonDialog, type WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { Button } from "@/components/ui/button";
import {
  actionFor,
  formatStepDay,
  lessonOf,
  NEXT_STEPS_LIMIT,
  shouldLoadNextSteps,
  visibleSteps,
  weekStartOf,
  type NextStepAction,
} from "@/components/next-steps/nextSteps";
import { SHOW_CHECK_INS_EVENT } from "@/hooks/checkInSession";
import { useCheckInFollowUps } from "@/hooks/useCheckInFollowUps";
import { useShiftFollowing } from "@/hooks/useShiftFollowing";
import { getSuggestions, getTurmaSuggestions } from "@/services/api/suggestions.service";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { toIntlLocale } from "@/shared/utils/calendar";
import { cn } from "@/shared/utils/utils";
import type { Suggestion, SuggestionKind } from "@/shared/types/suggestions";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { CalendarClock, FilePlus, ListChecks, Target, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface NextStepsCardProps {
  /** One turma (the turma page). Omit on the dashboard, which lists the steps of every turma. */
  timetableId?: string;
  /** Bump to reload the steps, e.g. after a check-in. */
  refreshKey?: number;
}

/**
 * "O que fazer a seguir" (ENG-208): up to three next steps, each with one action. Only with the
 * `class_state_enabled` flag; with it off this renders nothing and does not call the endpoint. A failed
 * load renders nothing; an empty list renders nothing.
 */
export function NextStepsCard({ timetableId, refreshKey = 0 }: NextStepsCardProps) {
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const { shift } = useShiftFollowing();
  const { reinforce } = useCheckInFollowUps();
  const [reloadTick, setReloadTick] = useState(0);
  const [loaded, setLoaded] = useState<{ scope: string; items: Suggestion[] } | null>(null);
  const [failedScope, setFailedScope] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<WeekLessonTarget | null>(null);
  const scope = timetableId ?? "all";
  const shouldLoad = shouldLoadNextSteps(enabled);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    const request = timetableId ? getTurmaSuggestions(timetableId) : getSuggestions(NEXT_STEPS_LIMIT);
    request
      .then((items) => {
        if (cancelled) return;
        setFailedScope(null);
        setLoaded({ scope, items });
      })
      .catch(() => {
        // 403 (flag off on the backend) and 404 (not this teacher's turma) both end here: show nothing.
        if (!cancelled) setFailedScope(scope);
      });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad, timetableId, scope, refreshKey, reloadTick]);

  const reload = useCallback(() => setReloadTick((n) => n + 1), []);

  const onAction = async (item: Suggestion) => {
    const action = actionFor(item.kind);
    if (action === "view") {
      // The check-in strip (dashboard) shows itself, even after "Esconder por agora", and scrolls into view.
      window.dispatchEvent(new Event(SHOW_CHECK_INS_EVENT));
      return;
    }
    const lesson = lessonOf(item);
    if (!lesson) return;
    if (action === "prepare") {
      if (item.slotDate) {
        setOpenLesson({ timetableId: lesson.timetableId, lessonId: lesson.slotId, weekStart: weekStartOf(item.slotDate) });
      }
      return;
    }

    const key = stepKey(item);
    setBusyKey(key);
    try {
      if (action === "reschedule") {
        // useShiftFollowing reports its own success or failure; null means it failed.
        const result = await shift(lesson.timetableId, lesson.slotId);
        if (result) reload();
      } else if (action === "reinforce") {
        // The hook reports its own success (with "Abrir" on the pop-up here) or failure.
        const started = await reinforce(lesson.timetableId, lesson.slotId, item.outcomeIds, setOpenLesson);
        if (started) reload();
      }
    } finally {
      setBusyKey(null);
    }
  };

  if (!shouldLoad || failedScope === scope) return null;
  const steps = loaded?.scope === scope ? visibleSteps(loaded.items) : null;

  return (
    <>
      {steps === null ? (
        <NextStepsSkeleton />
      ) : (
        <NextStepsView
          items={steps}
          showTurma={!timetableId}
          busyKey={busyKey}
          onAction={(item) => void onAction(item)}
        />
      )}
      {/* Mounted even when the list empties: a finished prepare removes its step while the pop-up is still open. */}
      <WeekLessonDialog
        target={openLesson}
        onClose={() => {
          setOpenLesson(null);
          reload();
        }}
        onChanged={reload}
      />
    </>
  );
}

/** Each step kind's icon, the text tone of that icon, and the left accent of its row. */
const STEP_STYLE: Record<SuggestionKind, { icon: LucideIcon; tone: string; accent: string }> = {
  prepare_next: { icon: FilePlus, tone: "text-primary", accent: "border-l-primary" },
  replan_not_held: {
    icon: CalendarClock,
    tone: "text-amber-600 dark:text-amber-400",
    accent: "border-l-amber-500",
  },
  reinforce: { icon: Target, tone: "text-rose-600 dark:text-rose-400", accent: "border-l-rose-500" },
  check_in: {
    icon: ListChecks,
    tone: "text-emerald-600 dark:text-emerald-400",
    accent: "border-l-emerald-500",
  },
};

export interface NextStepsViewProps {
  /** Already filtered and cut to three (see visibleSteps). */
  items: Suggestion[];
  /** Name the turma on each step (the dashboard lists several). */
  showTurma: boolean;
  busyKey: string | null;
  onAction: (item: Suggestion) => void;
}

/** The card's content for loaded steps. Exported so the rendering can be tested without a fetch. */
export function NextStepsView({ items, showTurma, busyKey, onAction }: NextStepsViewProps) {
  const t = useTranslations("nextSteps");
  const rawLocale = useLocale();
  const intlLocale = toIntlLocale(isSupportedLocale(rawLocale) ? rawLocale : defaultLocale);
  const steps = visibleSteps(items);
  if (steps.length === 0) return null;

  const labels: Record<NextStepAction, string> = {
    prepare: t("actionPrepare"),
    reschedule: t("actionReschedule"),
    reinforce: t("actionReinforce"),
    view: t("actionView"),
  };

  const text = (item: Suggestion): string => {
    switch (item.kind) {
      case "prepare_next":
        return t("prepareNext", { day: formatStepDay(item.slotDate ?? "", intlLocale) });
      case "replan_not_held":
        return t("replanNotHeld");
      case "reinforce":
        return t("reinforce", { outcome: item.outcomeTexts[0] ?? item.topicTitle ?? "" });
      case "check_in":
        return t("checkIn", { count: item.count ?? 0 });
      default:
        return "";
    }
  };

  return (
    <section aria-label={t("title")} className="rounded-xl border bg-card p-3 sm:p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("title")}</h3>
      <ul className="divide-y">
        {steps.map((item, index) => {
          const key = stepKey(item);
          const action = actionFor(item.kind);
          const style = STEP_STYLE[item.kind];
          const Icon = style.icon;
          return (
            <li
              key={key}
              className={cn(
                "flex items-center justify-between gap-3 border-l-2 py-2 pl-3 first:pt-0 last:pb-0",
                style.accent,
              )}
            >
              <p className="flex min-w-0 items-center gap-2 text-sm">
                <Icon className={cn("h-4 w-4 shrink-0", style.tone)} aria-hidden />
                <span className="min-w-0 truncate">
                  {text(item)}
                  {showTurma && item.turmaTitle ? (
                    <span className="text-muted-foreground"> · {item.turmaTitle}</span>
                  ) : null}
                </span>
              </p>
              {action ? (
                <Button
                  size="sm"
                  variant={index === 0 ? "default" : "outline"}
                  className="shrink-0"
                  disabled={busyKey === key}
                  onClick={() => onAction(item)}
                >
                  {labels[action]}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NextStepsSkeleton() {
  const t = useTranslations("nextSteps");
  return (
    <div aria-busy="true" aria-label={t("loading")} className="animate-pulse rounded-xl border bg-card p-3 sm:p-4">
      <div className="h-3 w-28 rounded bg-muted-foreground/15" />
      <div className="mt-3 h-4 w-3/4 rounded bg-muted-foreground/15" />
      <div className="mt-2 h-4 w-1/2 rounded bg-muted-foreground/15" />
    </div>
  );
}

/** Stable per step: the same step keeps its busy state across a reload. */
export function stepKey(item: Suggestion): string {
  return [item.kind, item.slotId ?? item.count ?? "", item.outcomeIds.join(",")].join("|");
}
