"use client";

import { REPLAN_MAX_POLLS, REPLAN_POLL_MS, REPLAN_CHANGED_EVENT, pollUntilSettled, settledToast } from "@/components/replan/replanLogic";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { ApiRequestError, UpgradeLimitError } from "@/services/api/client";
import { replanService } from "@/services/api/replan.service";
import { useShiftFollowing } from "@/hooks/useShiftFollowing";
import { Routes } from "@/shared/types/routes";
import { selectHasEffectivePro } from "@/store/entitlements/selectors";
import { useAppSelector } from "@/store/hooks";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** The outcome arrives while the teacher may be elsewhere in the dialog; the default 4 s hides its "Ver" too soon. */
const OUTCOME_TOAST_MS = 15000;

/** Tells the turma banner (if open) to reload its state. */
function notifyChanged(timetableId: string) {
  window.dispatchEvent(new CustomEvent(REPLAN_CHANGED_EVENT, { detail: { timetableId } }));
}

/** The id of the latest proposal when it has already settled, so a watch ignores it. Null while one generates or none exists. */
async function settledProposalId(timetableId: string): Promise<string | null> {
  const proposal = await replanService.current(timetableId).catch(() => null);
  return proposal && proposal.status !== "generating" ? proposal.id : null;
}

/**
 * The replanning agent for the Pro plan (ENG-257). After a check-in "não houve aula", "ficou a meio" or "alguns tiveram
 * dificuldades" the backend may start a proposal by itself (the check-in answer says so with `replanStarted`);
 * `requestReplan` asks for one on demand; `watchAfterCheckIn` waits for the one that follows a check-in. A watch
 * toasts when the proposal is ready (or failed) and stops polling when the screen unmounts.
 */
export function useReplan() {
  const t = useTranslations("replan");
  const router = useRouter();
  const isPro = useAppSelector(selectHasEffectivePro);
  const { shift, offer } = useShiftFollowing();
  const { guard } = useAccountAccess();
  const watches = useRef(new Set<AbortController>());

  useEffect(() => {
    const active = watches.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  /** Polls until a proposal other than `skipId` settles, then toasts the outcome. */
  const watch = useCallback(
    (timetableId: string, skipId: string | null, onSettled?: () => void) => {
      notifyChanged(timetableId);
      const controller = new AbortController();
      watches.current.add(controller);
      void (async () => {
        try {
          const proposal = await pollUntilSettled(
            () => replanService.current(timetableId),
            (value) => value !== null && value.status !== "generating" && value.id !== skipId,
            { intervalMs: REPLAN_POLL_MS, maxAttempts: REPLAN_MAX_POLLS, signal: controller.signal },
          );
          if (!proposal) return;
          notifyChanged(timetableId);
          onSettled?.();
          const outcome = settledToast(proposal);
          if (outcome === "ready") {
            toast.success(t("readyToast"), {
              duration: OUTCOME_TOAST_MS,
              action: {
                label: t("readyAction"),
                onClick: () => router.push(`${Routes.CALENDAR}/${timetableId}`),
              },
            });
          } else if (outcome === "noChange") {
            toast.info(t("noChangeToast"), { duration: OUTCOME_TOAST_MS });
          } else {
            const { triggerSlotId } = proposal;
            toast.error(t("failedToast"), {
              duration: OUTCOME_TOAST_MS,
              action: triggerSlotId
                ? { label: t("shiftFallback"), onClick: () => void shift(timetableId, triggerSlotId) }
                : undefined,
            });
          }
        } catch {
          // The banner on the turma page shows the latest state on its next load.
        } finally {
          watches.current.delete(controller);
        }
      })();
    },
    [router, shift, t],
  );

  /** Pro, after a check-in that started a replan: the backend is already replanning, so only wait for it. */
  const watchAfterCheckIn = useCallback(
    async (timetableId: string) => {
      const skipId = await settledProposalId(timetableId);
      watch(timetableId, skipId);
    },
    [watch],
  );

  /** Asks for a proposal now (the lesson dialog's "Reajustar", the turma header, next steps). Resolves true when started; the caller says so. */
  const requestReplan = useCallback(
    async (
      timetableId: string,
      body: { triggerSlotId?: string; note?: string } = {},
      onSettled?: () => void,
    ): Promise<boolean> => {
      // Read-only account (ENG-321): a replan is an AI generation; the paywall opens instead.
      if (!guard("generate")) return false;
      const skipId = await settledProposalId(timetableId);
      try {
        const started = await replanService.start(timetableId, body);
        watch(timetableId, skipId, onSettled);
        return started.status === "generating";
      } catch (error) {
        // The API client already opened the upgrade modal (lock, free-plan limit).
        if (error instanceof UpgradeLimitError) return false;
        const proRequired = error instanceof ApiRequestError && error.code === "pro_required";
        toast.error(t(proRequired ? "proRequired" : "requestError"));
        return false;
      }
    },
    [guard, t, watch],
  );

  /**
   * After a saved check-in: when it started a replan, say so and wait for it; otherwise, after "não houve aula", the
   * offer to move the following lessons (no Pro, or no replan could start).
   */
  const offerAfterCheckIn = useCallback(
    (
      timetableId: string,
      slotId: string,
      { replanStarted, notHeld }: { replanStarted: boolean; notHeld: boolean },
      onShifted?: () => void,
    ) => {
      if (replanStarted) {
        toast(t("notHeldInProgress"));
        void watchAfterCheckIn(timetableId);
      } else if (notHeld) {
        offer(timetableId, slotId, onShifted);
      }
    },
    [offer, t, watchAfterCheckIn],
  );

  return { isPro, requestReplan, watchAfterCheckIn, offerAfterCheckIn, shift };
}
