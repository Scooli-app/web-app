"use client";

import { REPLAN_MAX_POLLS, REPLAN_POLL_MS, REPLAN_CHANGED_EVENT, pollUntilSettled } from "@/components/replan/replanLogic";
import { ApiRequestError } from "@/services/api/client";
import { replanService } from "@/services/api/replan.service";
import { useShiftFollowing } from "@/hooks/useShiftFollowing";
import { Routes } from "@/shared/types/routes";
import { selectHasEffectivePro } from "@/store/entitlements/selectors";
import { useAppSelector } from "@/store/hooks";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

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
 * The replanning agent for the Pro plan (ENG-257). After "não houve aula" the backend starts a proposal by itself;
 * `requestReplan` asks for one on demand; `watchAfterNotHeld` waits for the one that follows a check-in. A watch
 * toasts when the proposal is ready (or failed) and stops polling when the screen unmounts.
 */
export function useReplan() {
  const t = useTranslations("replan");
  const router = useRouter();
  const isPro = useAppSelector(selectHasEffectivePro);
  const { shift, offer } = useShiftFollowing();
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
    (timetableId: string, skipId: string | null) => {
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
          if (proposal.status === "pending") {
            toast.success(t("readyToast"), {
              action: {
                label: t("readyAction"),
                onClick: () => router.push(`${Routes.CALENDAR}/${timetableId}`),
              },
            });
          } else {
            const { triggerSlotId } = proposal;
            toast.error(t("failedToast"), {
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

  /** Pro, after a check-in said "não houve aula": the backend is already replanning, so only wait for it. */
  const watchAfterNotHeld = useCallback(
    async (timetableId: string) => {
      const skipId = await settledProposalId(timetableId);
      watch(timetableId, skipId);
    },
    [watch],
  );

  /** Asks for a proposal now (the lesson dialog's "Reajustar", the turma header, next steps). Resolves true when started; the caller says so. */
  const requestReplan = useCallback(
    async (timetableId: string, body: { triggerSlotId?: string; note?: string } = {}): Promise<boolean> => {
      const skipId = await settledProposalId(timetableId);
      try {
        const started = await replanService.start(timetableId, body);
        watch(timetableId, skipId);
        return started.status === "generating";
      } catch (error) {
        const proRequired = error instanceof ApiRequestError && error.code === "pro_required";
        toast.error(t(proRequired ? "proRequired" : "requestError"));
        return false;
      }
    },
    [t, watch],
  );

  /** "Não houve aula" without Pro: the existing shift offer; with Pro: the replanning agent. */
  const offerAfterNotHeld = useCallback(
    (timetableId: string, slotId: string, onShifted?: () => void) => {
      if (!isPro) {
        offer(timetableId, slotId, onShifted);
        return;
      }
      toast(t("notHeldInProgress"));
      void watchAfterNotHeld(timetableId);
    },
    [isPro, offer, t, watchAfterNotHeld],
  );

  return { isPro, requestReplan, watchAfterNotHeld, offerAfterNotHeld, shift };
}
