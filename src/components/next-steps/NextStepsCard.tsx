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
import { useShiftFollowing } from "@/hooks/useShiftFollowing";
import { ApiRequestError, UpgradeLimitError } from "@/services/api/client";
import { checkInService } from "@/services/api/check-in.service";
import { getSuggestions, getTurmaSuggestions } from "@/services/api/suggestions.service";
import { isSupportedLocale, defaultLocale } from "@/i18n/locales";
import { toIntlLocale } from "@/shared/utils/calendar";
import type { Suggestion } from "@/shared/types/suggestions";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
  const t = useTranslations("nextSteps");
  const { shift } = useShiftFollowing();
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
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        await checkInService.requestReinforcement(lesson.timetableId, lesson.slotId, item.outcomeIds);
        toast.success(t("reinforceToast"));
        reload();
      }
    } catch (err) {
      if (err instanceof UpgradeLimitError) {
        // The API client already opened the upgrade modal.
      } else if (err instanceof ApiRequestError && err.status === 409) {
        toast.info(t("reinforceBusy"));
      } else {
        toast.error(t("actionError"));
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
        {steps.map((item) => {
          const key = stepKey(item);
          const action = actionFor(item.kind);
          return (
            <li key={key} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <p className="min-w-0 truncate text-sm">
                {text(item)}
                {showTurma && item.turmaTitle ? (
                  <span className="text-muted-foreground"> · {item.turmaTitle}</span>
                ) : null}
              </p>
              {action ? (
                <Button
                  size="sm"
                  variant="outline"
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
      <div className="h-3 w-28 rounded bg-muted" />
      <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
    </div>
  );
}

/** Stable per step: the same step keeps its busy state across a reload. */
export function stepKey(item: Suggestion): string {
  return [item.kind, item.slotId ?? item.count ?? "", item.outcomeIds.join(",")].join("|");
}
