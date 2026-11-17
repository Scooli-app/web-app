"use client";

import { CheckInCard, checkInTurmaName } from "@/components/check-in/CheckInCard";
import { useCheckInNextStep } from "@/components/check-in/useCheckInNextStep";
import { Button } from "@/components/ui/button";
import { confirmableCount, shouldShowCheckInStrip } from "@/hooks/checkInQueue";
import { CHECK_INS_CHANGED_EVENT, SHOW_CHECK_INS_EVENT, announceVisibleCheckIns, writeAsked } from "@/hooks/checkInSession";
import { usePendingCheckIns } from "@/hooks/usePendingCheckIns";
import type { CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
  /** The one line left to answer after a check-in (the rest happens by itself), above the next card. */
  const nextStep = useCheckInNextStep({ onChanged: notifyChanged });

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

  const turmaName = (item: PendingCheckIn) => checkInTurmaName(item, (grade) => tTimetable("gradeShort", { grade }));

  const handleSubmit = async (item: PendingCheckIn, body: CheckInSubmission) => {
    const saved = await submit(item, body);
    if (!saved) {
      toast.error(t("saveError"));
      return;
    }
    notifyChanged();
    if (body.result === "TAUGHT") toast.success(t("taughtToast"));
    // The strip goes straight on to the next lesson; what is left to decide shows as one line above it.
    nextStep.afterSave(
      { timetableId: item.timetableId, slotId: item.slotId, slotType: item.slotType, label: turmaName(item) },
      body,
      saved,
    );
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
      {nextStep.row && !showStrip && <div className="mb-3">{nextStep.row}</div>}
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
          {nextStep.row && <div className="mb-2">{nextStep.row}</div>}
          <CheckInCard
            key={current.slotId}
            item={current}
            locale={locale}
            onSubmit={(body) => void handleSubmit(current, body)}
            onSkip={() => skipForSession(current)}
          />
        </section>
      )}
      {nextStep.sheet}
    </>
  );
}
