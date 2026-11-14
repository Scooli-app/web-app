"use client";

import { CheckInCard, checkInTurmaName } from "@/components/check-in/CheckInCard";
import { WeekLessonDialog, type WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { Button } from "@/components/ui/button";
import { confirmableCount, shouldShowCheckInStrip } from "@/hooks/checkInQueue";
import { CHECK_INS_CHANGED_EVENT, SHOW_CHECK_INS_EVENT, announceVisibleCheckIns, writeAsked } from "@/hooks/checkInSession";
import { formatLessonDay, lessonTarget, reinforcementTarget, useCheckInFollowUps } from "@/hooks/useCheckInFollowUps";
import { AfterSaveSteps, afterSaveFor, withReplanOutcome, type AfterSave } from "@/components/check-in/afterSave";
import type { ReplanProposal } from "@/shared/types/replan";
import { usePendingCheckIns } from "@/hooks/usePendingCheckIns";
import { useReplan } from "@/hooks/useReplan";
import { useAdjustNextLessons } from "@/components/replan/useAdjustNextLessons";
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
  const { watchAfterCheckIn, shift } = useReplan();
  /** What the teacher can do after the answer just saved; shown in place of the next card. */
  const [afterSave, setAfterSave] = useState<AfterSave | null>(null);
  /** "Propor ajustes às aulas seguintes": the request dialog, with an optional note. */
  const { adjust, dialog: adjustDialog } = useAdjustNextLessons({
    onStarted: () => setAfterSave((current) => current && { ...current, adjustAsk: false, replan: "generating" }),
    onSettled: (proposal) =>
      setAfterSave((current) =>
        current && current.item.slotId === proposal.triggerSlotId ? withReplanOutcome(current, proposal) : current,
      ),
  });
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

  /** Marks the panel's step done or busy, if the panel is still about that lesson. */
  const patchAfterSave = (slotId: string, patch: Partial<AfterSave>) =>
    setAfterSave((current) => (current && current.item.slotId === slotId ? { ...current, ...patch } : current));

  const watchReplan = (item: PendingCheckIn) => (proposal: ReplanProposal) =>
    setAfterSave((current) => (current && current.item.slotId === item.slotId ? withReplanOutcome(current, proposal) : current));

  const handleSubmit = async (item: PendingCheckIn, body: CheckInSubmission) => {
    const saved = await submit(item, body);
    if (!saved) {
      toast.error(t("saveError"));
      return;
    }
    notifyChanged();
    if (body.result === "TAUGHT") {
      // Nothing to decide: the strip goes on to the next lesson ("O que fazer a seguir" offers to prepare the next).
      toast.success(t("taughtToast"));
      return;
    }
    // Every other answer has a next step: the strip shows it in place of the next card until the teacher goes on.
    setAfterSave(afterSaveFor(item, body, saved));
    if (saved.replanStarted) void watchAfterCheckIn(item.timetableId, watchReplan(item));
  };

  const runFollowUp = async (panel: AfterSave) => {
    const { item, followUp } = panel;
    if (!followUp) return;
    patchAfterSave(item.slotId, { busy: "followUp" });
    if (followUp.kind === "reinforcement") {
      const started = await reinforce(item.timetableId, item.slotId, followUp.outcomeIds);
      patchAfterSave(item.slotId, {
        busy: null,
        ...(started && {
          followUp: null,
          followUpDone: {
            kind: "reinforcement",
            day: formatLessonDay(started.targetDate, locale),
            target: reinforcementTarget(item.timetableId, started.targetSlotId, started.targetDate),
          },
        }),
      });
      if (started) notifyChanged();
      return;
    }
    const carried = await carry(item.timetableId, item.slotId, followUp.outcomeIds);
    patchAfterSave(item.slotId, {
      busy: null,
      ...(carried && {
        followUp: null,
        followUpDone: {
          kind: "carryOver",
          day: formatLessonDay(carried.targetDate, locale),
          target: lessonTarget(item.timetableId, carried.targetSlotId, carried.targetDate),
        },
      }),
    });
    if (carried) notifyChanged();
  };

  const runShift = async (panel: AfterSave) => {
    patchAfterSave(panel.item.slotId, { busy: "shift" });
    const result = await shift(panel.item.timetableId, panel.item.slotId);
    patchAfterSave(panel.item.slotId, { busy: null, ...(result && { shiftAsk: false }) });
    if (result) notifyChanged();
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

  const turmaName = (item: PendingCheckIn) => checkInTurmaName(item, (grade) => tTimetable("gradeShort", { grade }));
  const resultLabel = (result: CheckInSubmission["result"]) =>
    t(result === "PARTIAL" ? "resultPartial" : result === "NOT_HELD" ? "resultNotHeld" : "resultDifficulties");

  return (
    <>
      {afterSave && (
        <section aria-label={t("title")} className="mb-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{t("afterSaveTitle", { result: resultLabel(afterSave.result) })}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[turmaName(afterSave.item), afterSave.item.topicTitle].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setOpenTarget(lessonTarget(afterSave.item.timetableId, afterSave.item.slotId, afterSave.item.slotDate))}
            >
              {t("changeAnswer")}
            </Button>
          </div>
          <AfterSaveSteps
            panel={afterSave}
            onAdjust={() => adjust(afterSave.item.timetableId, afterSave.item.slotId)}
            onSkipAdjust={() => patchAfterSave(afterSave.item.slotId, { adjustAsk: false })}
            onReview={() => router.push(`${Routes.CALENDAR}/${afterSave.item.timetableId}`)}
            onShift={() => void runShift(afterSave)}
            onSkipShift={() => patchAfterSave(afterSave.item.slotId, { shiftAsk: false })}
            onFollowUp={() => void runFollowUp(afterSave)}
            onSkipFollowUp={() => patchAfterSave(afterSave.item.slotId, { followUp: null })}
            onOpenLesson={(target) => setOpenTarget(target)}
          />
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="h-8" onClick={() => setAfterSave(null)}>
              {showStrip ? t("afterSaveNext") : t("afterSaveClose")}
            </Button>
          </div>
        </section>
      )}
      {showStrip && !afterSave && (
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
      {adjustDialog}
    </>
  );
}
