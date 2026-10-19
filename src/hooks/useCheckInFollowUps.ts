"use client";

import type { WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { weekStartOf } from "@/components/next-steps/nextSteps";
import { ApiRequestError, UpgradeLimitError } from "@/services/api/client";
import { checkInService } from "@/services/api/check-in.service";
import type { CheckInSubmission, CarryOverResult, ReinforcementRequested } from "@/shared/types/check-in";
import { Routes } from "@/shared/types/routes";
import { useAppDispatch } from "@/store/hooks";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

/** What a check-in offers next (ENG-236/237): only when the teacher picked outcomes. */
export type CheckInFollowUp =
  | { kind: "reinforcement"; outcomeIds: string[] }
  | { kind: "carryOver"; outcomeIds: string[] };

/**
 * The follow-up a saved check-in offers. "Some had difficulties" offers a reinforcement worksheet and
 * "Ficou a meio" offers carrying the uncovered outcomes over. Neither is offered without outcomes.
 */
export function followUpFor(body: CheckInSubmission): CheckInFollowUp | null {
  if (body.result === "TAUGHT_WITH_DIFFICULTIES" && body.difficultOutcomeIds?.length) {
    return { kind: "reinforcement", outcomeIds: body.difficultOutcomeIds };
  }
  if (body.result === "PARTIAL" && body.uncoveredOutcomeIds?.length) {
    return { kind: "carryOver", outcomeIds: body.uncoveredOutcomeIds };
  }
  return null;
}

/** "terça-feira, 20 de outubro" for a YYYY-MM-DD date, in the interface locale. */
export function formatLessonDay(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(year, month - 1, day),
  );
}

/** The lesson pop-up target for a lesson of a turma: the week that holds it, as the pop-up expects. */
export function lessonTarget(timetableId: string, lessonId: string, isoDate: string): WeekLessonTarget {
  return { timetableId, lessonId, weekStart: weekStartOf(isoDate) };
}

/**
 * Where a reinforcement worksheet's lesson is: the target of its lesson pop-up. A reinforcement is always written
 * for a lesson of the same turma, so the turma id is the request's.
 */
export function reinforcementTarget(timetableId: string, targetSlotId: string, targetDate: string): WeekLessonTarget {
  return lessonTarget(timetableId, targetSlotId, targetDate);
}

/**
 * The calendar page of a turma with one lesson opened: `?week` shows the lesson's week and `?lesson` opens the
 * lesson's pop-up once the week has loaded. Used when no pop-up is mounted where the action is.
 */
export function lessonCalendarHref(target: WeekLessonTarget): string {
  return `${Routes.CALENDAR}/${target.timetableId}?week=${target.weekStart}&lesson=${target.lessonId}`;
}

/**
 * The two follow-ups a check-in can start. Both report their own outcome: a success toast with an action that opens
 * the lesson, or the matching failure. A quota or free-plan refusal opens the upgrade modal (the API client does it),
 * so it is not repeated here. Both resolve to the result, or null when nothing started.
 */
export function useCheckInFollowUps() {
  const t = useTranslations("checkIns");
  const locale = useLocale();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const openCalendar = useCallback(
    (timetableId: string) => {
      router.push(`${Routes.CALENDAR}/${timetableId}`);
    },
    [router],
  );

  const reportFailure = useCallback(
    (err: unknown, fallbackKey: "reinforcementError" | "carryOverError") => {
      if (err instanceof UpgradeLimitError) return;
      if (err instanceof ApiRequestError && err.status === 409) {
        toast.error(err.code === "sem_proxima_aula" ? t("noNextLesson") : t("followUpInProgress"));
        return;
      }
      if (err instanceof ApiRequestError && err.status === 403) {
        dispatch(setUpgradeModalOpen(true));
        return;
      }
      toast.error(t(fallbackKey));
    },
    [dispatch, t],
  );

  /**
   * Asks for a reinforcement worksheet on the lesson after {@code lessonId}. The toast's "Abrir" calls {@code onOpen}
   * with the target lesson when the caller has a pop-up mounted, and otherwise opens the turma's calendar on it.
   */
  const reinforce = useCallback(
    async (
      timetableId: string,
      lessonId: string,
      outcomeIds: string[],
      onOpen?: (target: WeekLessonTarget) => void,
    ): Promise<ReinforcementRequested | null> => {
      try {
        const started = await checkInService.requestReinforcement(timetableId, lessonId, outcomeIds);
        const target = reinforcementTarget(timetableId, started.targetSlotId, started.targetDate);
        toast.success(t("reinforcementToast", { day: formatLessonDay(started.targetDate, locale) }), {
          action: {
            label: t("followUpOpenLesson"),
            onClick: () => (onOpen ? onOpen(target) : router.push(lessonCalendarHref(target))),
          },
        });
        return started;
      } catch (err) {
        reportFailure(err, "reinforcementError");
        return null;
      }
    },
    [locale, reportFailure, router, t],
  );

  const carry = useCallback(
    async (timetableId: string, lessonId: string, outcomeIds: string[]): Promise<CarryOverResult | null> => {
      try {
        const result = await checkInService.carryOver(timetableId, lessonId, outcomeIds);
        toast.success(t("carryOverToast", { day: formatLessonDay(result.targetDate, locale) }), {
          action: { label: t("followUpOpenCalendar"), onClick: () => openCalendar(timetableId) },
        });
        return result;
      } catch (err) {
        reportFailure(err, "carryOverError");
        return null;
      }
    },
    [locale, openCalendar, reportFailure, t],
  );

  return { reinforce, carry };
}
