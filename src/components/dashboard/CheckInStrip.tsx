"use client";

import { CheckInCard, checkInTurmaName } from "@/components/check-in/CheckInCard";
import { WeekLessonDialog, type WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { Button } from "@/components/ui/button";
import { confirmableCount, shouldShowCheckInStrip } from "@/hooks/checkInQueue";
import { CHECK_INS_CHANGED_EVENT, SHOW_CHECK_INS_EVENT, announceVisibleCheckIns, writeAsked } from "@/hooks/checkInSession";
import { followUpFor, lessonTarget, useCheckInFollowUps, type CheckInFollowUp } from "@/hooks/useCheckInFollowUps";
import { usePendingCheckIns } from "@/hooks/usePendingCheckIns";
import { useReplan } from "@/hooks/useReplan";
import type { CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { Routes } from "@/shared/types/routes";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const notifyChanged = () => window.dispatchEvent(new Event(CHECK_INS_CHANGED_EVENT));

/**
 * "Como correu a aula?": the past lessons still waiting for a check-in, one card at a time,
 * at the top of the week card. Hidden unless the `class_state_enabled` flag is on and something
 * is pending. Never a modal.
 */
export function CheckInStrip() {
  const t = useTranslations("checkIns");
  const tTimetable = useTranslations("timetable");
  const locale = useLocale();
  const router = useRouter();
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const { visible, loaded, dismissed, submit, confirmAll, skipForSession, dismiss, show } = usePendingCheckIns(enabled);
  useEffect(() => {
    if (!loaded) return;
    announceVisibleCheckIns(visible.length);
    return () => announceVisibleCheckIns(null);
  }, [loaded, visible.length]);
  const sectionRef = useRef<HTMLElement>(null);
  /** Set by "Ver": scroll to the strip once it has rendered (it may have been hidden until now). */
  const [scrollRequested, setScrollRequested] = useState(false);

  useEffect(() => {
    const onShow = () => {
      show();
      setScrollRequested(true);
    };
    window.addEventListener(SHOW_CHECK_INS_EVENT, onShow);
    return () => window.removeEventListener(SHOW_CHECK_INS_EVENT, onShow);
  }, [show]);
  const { offerAfterNotHeld } = useReplan();
  const { reinforce, carry } = useCheckInFollowUps();
  /** The lesson a reinforcement worksheet's "Abrir" opens. Mounted outside the strip, so it outlives the last card. */
  const [openTarget, setOpenTarget] = useState<WeekLessonTarget | null>(null);

  const showStrip = shouldShowCheckInStrip({ enabled, dismissed, visibleCount: visible.length });
  const current = visible[0];
  const currentSlotId = current?.slotId;

  // The strip has asked about this lesson, so the lesson dialog's previous-lesson prompt does not ask it again.
  useEffect(() => {
    if (showStrip && currentSlotId) writeAsked(currentSlotId);
  }, [showStrip, currentSlotId]);

  useEffect(() => {
    if (!scrollRequested || !showStrip) return;
    // scrollIntoView, not window.scrollTo: the dashboard scrolls inside its layout, not the window.
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollRequested(false);
  }, [scrollRequested, showStrip]);

  /** ENG-236/237: after "some had difficulties" or "half done" with outcomes picked, asks as a toast with an action. */
  const offerFollowUp = (item: PendingCheckIn, followUp: CheckInFollowUp) => {
    const reinforcement = followUp.kind === "reinforcement";
    toast(t(reinforcement ? "reinforcementQuestion" : "carryOverQuestion"), {
      duration: 15000,
      action: {
        label: t(reinforcement ? "reinforcementAction" : "carryOverAction"),
        onClick: () => {
          const started: Promise<unknown> = reinforcement
            ? reinforce(item.timetableId, item.slotId, followUp.outcomeIds, setOpenTarget)
            : carry(item.timetableId, item.slotId, followUp.outcomeIds);
          void started.then((result) => result && notifyChanged());
        },
      },
      cancel: { label: t("followUpKeep"), onClick: () => undefined },
    });
  };

  const handleSubmit = async (item: PendingCheckIn, body: CheckInSubmission) => {
    const saved = await submit(item, body);
    if (!saved) {
      toast.error(t("saveError"));
      return;
    }
    notifyChanged();
    if (body.result === "TAUGHT") {
      toast.success(t("taughtToast"), {
        action: {
          label: t("prepareNext"),
          onClick: () => router.push(`${Routes.CALENDAR}/${item.timetableId}`),
        },
      });
    }
    if (body.result === "NOT_HELD") {
      offerAfterNotHeld(item.timetableId, item.slotId);
    }
    const followUp = followUpFor(body);
    if (followUp) {
      offerFollowUp(item, followUp);
    } else if (body.result === "TAUGHT_WITH_DIFFICULTIES" || body.result === "PARTIAL") {
      // The card moves on to the next lesson: say what was saved, and how to change it.
      toast.success(t("savedToast", { result: t(body.result === "PARTIAL" ? "resultPartial" : "resultDifficulties") }), {
        description: checkInTurmaName(item, (grade) => tTimetable("gradeShort", { grade })),
        duration: 10000,
        action: {
          label: t("change"),
          onClick: () => setOpenTarget(lessonTarget(item.timetableId, item.slotId, item.slotDate)),
        },
      });
    }
  };

  const handleConfirmAll = async () => {
    const updated = await confirmAll();
    if (updated === null) {
      toast.error(t("confirmAllError"));
    } else {
      notifyChanged();
      toast.success(t("confirmAllToast", { count: updated }));
    }
  };

  return (
    <>
      {showStrip && (
        <section
          ref={sectionRef}
          aria-label={t("title")}
          className="mb-3 scroll-mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("pendingCount", { count: visible.length })}
            </span>
            <div className="flex items-center gap-1">
              {confirmableCount(visible) >= 2 && (
                <Button variant="link" size="sm" className="h-auto p-1 text-xs" onClick={() => void handleConfirmAll()}>
                  {t("confirmAll")}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t("dismiss")} onClick={dismiss}>
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
          <CheckInCard
            key={current.slotId}
            item={current}
            locale={locale}
            onSubmit={(body) => void handleSubmit(current, body)}
            onSkip={() => skipForSession(current)}
          />
        </section>
      )}
      <WeekLessonDialog target={openTarget} onClose={() => setOpenTarget(null)} onChanged={() => undefined} />
    </>
  );
}
