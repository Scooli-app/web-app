"use client";

import { ReplanReviewSheet } from "@/components/replan/ReplanReviewSheet";
import { readDismissedProposals, writeDismissedProposal } from "@/components/replan/replanSession";
import { REPLAN_CHANGED_EVENT, REPLAN_MAX_POLLS, REPLAN_POLL_MS, pollUntilSettled } from "@/components/replan/replanLogic";
import { Button } from "@/components/ui/button";
import { defaultLocale, isSupportedLocale } from "@/i18n/locales";
import { useReplan } from "@/hooks/useReplan";
import { replanService } from "@/services/api/replan.service";
import { reviewFeedService } from "@/services/api/review-feed.service";
import type { ReplanProposal } from "@/shared/types/replan";
import type { ReviewItem, ReviewItemsResponse } from "@/shared/types/review-feed";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ReviewFeedRow } from "./ReviewFeedRow";
import {
  REVIEW_VISIBLE_ROWS,
  visibleReviewItems,
  withoutDismissed,
  type ReviewAction,
} from "./reviewFeedLogic";

interface ReviewFeedSectionProps {
  timetableId: string;
  /** Changes after any decision on the turma page; the list reloads then. */
  refreshKey: number;
  /** Opens a topic proposal's lesson in the lesson dialog, where the proposal is. */
  onOpenLesson: (slotId: string) => void;
  /** Fires after a replan was decided or replaced by the old shift, so the turma's lessons reload. */
  onChanged: () => void;
}

const isGeneratingReplan = (item: ReviewItem) => item.kind === "replan" && item.status === "generating";

/**
 * "Por rever" on the turma page (ENG-257): one list of what the AI proposed and waits for the teacher. Shows
 * nothing when the list is empty. Replaces the replan banner: a replan being prepared is polled until it settles.
 */
export function ReviewFeedSection({ timetableId, refreshKey, onOpenLesson, onChanged }: ReviewFeedSectionProps) {
  const t = useTranslations("reviewFeed");
  const rawLocale = useLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : defaultLocale;
  const router = useRouter();
  const { shift } = useReplan();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  /** Replan items the teacher dismissed in this session. Read after mount, so server and client markup match. */
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [replanReview, setReplanReview] = useState<ReplanProposal | null>(null);

  useEffect(() => {
    setDismissedIds(readDismissedProposals());
  }, []);

  useEffect(() => {
    let active = true;
    reviewFeedService
      .list(timetableId)
      .then((response) => {
        if (active) setItems(response.items);
      })
      .catch(() => {
        // The section stays hidden; the turma page still works without it.
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [timetableId, refreshKey, reloadTick]);

  // A replan requested or settled elsewhere on the page reloads the list.
  useEffect(() => {
    const onReplanChanged = (event: Event) => {
      if ((event as CustomEvent<{ timetableId: string }>).detail.timetableId === timetableId) {
        setReloadTick((tick) => tick + 1);
      }
    };
    window.addEventListener(REPLAN_CHANGED_EVENT, onReplanChanged);
    return () => window.removeEventListener(REPLAN_CHANGED_EVENT, onReplanChanged);
  }, [timetableId]);

  const replanGenerating = items?.some(isGeneratingReplan) ?? false;
  useEffect(() => {
    if (!replanGenerating) return;
    const controller = new AbortController();
    pollUntilSettled(
      () => reviewFeedService.list(timetableId),
      (response: ReviewItemsResponse) => !response.items.some(isGeneratingReplan),
      {
        intervalMs: REPLAN_POLL_MS,
        maxAttempts: REPLAN_MAX_POLLS,
        signal: controller.signal,
        delayFirst: true,
      },
    )
      .then((settled) => {
        if (settled && !controller.signal.aborted) setItems(settled.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [replanGenerating, timetableId]);

  const shown = useMemo(() => withoutDismissed(items ?? [], dismissedIds), [items, dismissedIds]);

  const reloadList = () => setReloadTick((tick) => tick + 1);

  const openReplanReview = async () => {
    const proposal = await replanService.current(timetableId).catch(() => null);
    if (proposal?.status === "pending") setReplanReview(proposal);
    else reloadList();
  };

  const shiftFollowing = async (item: ReviewItem) => {
    const proposal = await replanService.current(timetableId).catch(() => null);
    const triggerSlotId = proposal?.triggerSlotId;
    if (!triggerSlotId) {
      reloadList();
      return;
    }
    const result = await shift(timetableId, triggerSlotId);
    if (!result) return;
    setDismissedIds(writeDismissedProposal(item.id));
    onChanged();
  };

  const handleAction = (item: ReviewItem, action: ReviewAction) => {
    switch (action.kind) {
      case "openReplan":
        void openReplanReview();
        break;
      case "shiftFallback":
        void shiftFollowing(item);
        break;
      case "dismiss":
        setDismissedIds(writeDismissedProposal(item.id));
        break;
      case "openDocument":
        router.push(action.href);
        break;
      case "openLesson":
        onOpenLesson(action.slotId);
        break;
      default:
        break;
    }
  };

  if (shown.length === 0) return null;

  return (
    <section
      id="por-rever"
      aria-labelledby="por-rever-title"
      className="rounded-lg border border-primary/25 bg-primary/5"
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-3">
        <h2 id="por-rever-title" className="text-sm font-semibold text-foreground">
          {t("title")}
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {shown.length}
        </span>
      </div>

      <ul className="mt-2 divide-y divide-border">
        {visibleReviewItems(shown, expanded).map((item) => (
          <ReviewFeedRow key={`${item.kind}-${item.id}`} item={item} locale={locale} onAction={handleAction} />
        ))}
      </ul>

      {!expanded && shown.length > REVIEW_VISIBLE_ROWS && (
        <div className="border-t border-border px-3 py-2">
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setExpanded(true)}>
            {t("showAll", { count: shown.length })}
          </Button>
        </div>
      )}

      {replanReview && (
        <ReplanReviewSheet
          key={replanReview.id}
          timetableId={timetableId}
          proposal={replanReview}
          open
          onOpenChange={(open) => {
            if (!open) setReplanReview(null);
          }}
          onDecided={() => {
            setReplanReview(null);
            onChanged();
          }}
        />
      )}
    </section>
  );
}
