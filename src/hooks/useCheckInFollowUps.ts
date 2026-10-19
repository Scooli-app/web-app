"use client";

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

/**
 * The two follow-ups a check-in can start. Both report their own outcome: a success toast with an action to open
 * the turma's calendar, or the matching failure. A quota or free-plan refusal opens the upgrade modal (the API
 * client does it), so it is not repeated here. Both resolve to the result, or null when nothing started.
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

  const reinforce = useCallback(
    async (timetableId: string, lessonId: string, outcomeIds: string[]): Promise<ReinforcementRequested | null> => {
      try {
        const started = await checkInService.requestReinforcement(timetableId, lessonId, outcomeIds);
        toast.success(t("reinforcementToast", { day: formatLessonDay(started.targetDate, locale) }), {
          action: { label: t("followUpOpenCalendar"), onClick: () => openCalendar(timetableId) },
        });
        return started;
      } catch (err) {
        reportFailure(err, "reinforcementError");
        return null;
      }
    },
    [locale, openCalendar, reportFailure, t],
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
