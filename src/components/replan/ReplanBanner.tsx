"use client";

import { Button } from "@/components/ui/button";
import { useReplan } from "@/hooks/useReplan";
import { replanService } from "@/services/api/replan.service";
import type { ReplanProposal } from "@/shared/types/replan";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ReplanReviewSheet } from "./ReplanReviewSheet";
import {
  REPLAN_CHANGED_EVENT,
  REPLAN_MAX_POLLS,
  REPLAN_POLL_MS,
  bannerState,
  pollUntilSettled,
  type ReplanBannerState,
} from "./replanLogic";

interface ReplanBannerProps {
  timetableId: string;
  /** Fires after a proposal was accepted, rejected, or replaced by the old shift, so the turma's lessons reload. */
  onChanged: () => void;
}

/**
 * The slim strip above the week view (ENG-257). Shows the latest proposal: being prepared (polled every 5 s),
 * waiting for a review, or failed (with the old shift as the way out). Renders nothing when there is none.
 */
export function ReplanBanner({ timetableId, onChanged }: ReplanBannerProps) {
  const { shift } = useReplan();
  const [proposal, setProposal] = useState<ReplanProposal | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  /** Bumped when a proposal is requested or settles, so the banner shows it without a page reload. */
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    const onChangedEvent = (event: Event) => {
      if ((event as CustomEvent<{ timetableId: string }>).detail.timetableId === timetableId) {
        setReloadTick((tick) => tick + 1);
      }
    };
    window.addEventListener(REPLAN_CHANGED_EVENT, onChangedEvent);
    return () => window.removeEventListener(REPLAN_CHANGED_EVENT, onChangedEvent);
  }, [timetableId]);

  useEffect(() => {
    const controller = new AbortController();
    const load = () => replanService.current(timetableId);
    void (async () => {
      try {
        const current = await load();
        if (controller.signal.aborted) return;
        setProposal(current);
        if (current?.status === "generating") {
          const settled = await pollUntilSettled(load, (value) => value !== null && value.status !== "generating", {
            intervalMs: REPLAN_POLL_MS,
            maxAttempts: REPLAN_MAX_POLLS,
            signal: controller.signal,
            delayFirst: true,
          });
          if (settled && !controller.signal.aborted) setProposal(settled);
        }
      } catch {
        // Not Pro, or the request failed: no banner.
        if (!controller.signal.aborted) setProposal(null);
      }
    })();
    return () => controller.abort();
  }, [timetableId, reloadTick]);

  const state = bannerState(proposal);
  if (!state || dismissed) return null;

  const onDecided = () => {
    setReviewOpen(false);
    setProposal(null);
    onChanged();
  };

  const shiftFallback = async (triggerSlotId: string) => {
    const result = await shift(timetableId, triggerSlotId);
    if (!result) return;
    setDismissed(true);
    onChanged();
  };

  return (
    <>
      <ReplanBannerView
        state={state}
        onReview={() => setReviewOpen(true)}
        onShiftFallback={(triggerSlotId) => void shiftFallback(triggerSlotId)}
      />

      {proposal?.status === "pending" && (
        <ReplanReviewSheet
          key={proposal.id}
          timetableId={timetableId}
          proposal={proposal}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onDecided={onDecided}
        />
      )}
    </>
  );
}

interface ReplanBannerViewProps {
  state: ReplanBannerState;
  onReview: () => void;
  onShiftFallback: (triggerSlotId: string) => void;
}

/** The three states of the banner. Presentational, so each state can be rendered and checked on its own. */
export function ReplanBannerView({ state, onReview, onShiftFallback }: ReplanBannerViewProps) {
  const t = useTranslations("replan");
  const fallbackSlotId = state.kind === "failed" ? state.triggerSlotId : null;

  const message =
    state.kind === "generating"
      ? t("bannerGenerating")
      : state.kind === "pending"
        ? t("bannerPending", { count: state.count })
        : t("bannerFailed");

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm"
    >
      <span className="flex min-w-0 items-center gap-2 text-foreground">
        {state.kind === "generating" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        )}
        <span>{message}</span>
      </span>
      {state.kind === "pending" && (
        <Button size="sm" className="h-8" onClick={onReview}>
          {t("review")}
        </Button>
      )}
      {fallbackSlotId && (
        <Button size="sm" variant="outline" className="h-8" onClick={() => onShiftFallback(fallbackSlotId)}>
          {t("shiftFallback")}
        </Button>
      )}
    </div>
  );
}
