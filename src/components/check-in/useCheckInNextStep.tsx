"use client";

import { ActionNotice } from "@/components/check-in/ActionNotice";
import { stepAfterReplan, stepAfterSave, type NextStep } from "@/components/check-in/nextStep";
import { REPLAN_CHANGED_EVENT } from "@/components/replan/replanLogic";
import { ReplanReviewSheet } from "@/components/replan/ReplanReviewSheet";
import { formatLessonDay, useCheckInFollowUps } from "@/hooks/useCheckInFollowUps";
import { useReplan } from "@/hooks/useReplan";
import { replanService } from "@/services/api/replan.service";
import type { CheckInSubmission, ReinforcementRequested, SavedCheckIn } from "@/shared/types/check-in";
import type { ReplanProposal } from "@/shared/types/replan";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";
import { toast } from "sonner";

/** The lesson an answer is about. `label` prefixes the line where several turmas share it (the dashboard). */
export interface StepLesson {
  timetableId: string;
  slotId: string;
  slotType?: string;
  label?: string;
}

/**
 * What follows a check-in, on every surface that takes one (dashboard strip, lesson dialog, previous-lesson prompt):
 * everything that can happen by itself does, and at most ONE line asks the teacher, with a confirm and a decline.
 *
 * - Pro: the replan runs in the background; the line waits for it, then "A IA propõe ajustes a N aulas"
 *   [Aplicar] [Rejeitar] (with "ver alterações"). Applying it also updates the lessons' materials by themselves.
 * - Without a replan: "não houve aula" asks to move the following lessons; difficulties with outcomes ask for the
 *   reinforcement sheet; a partial lesson's outcomes go to the next lesson by themselves (a toast says where).
 */
export function useCheckInNextStep({
  onChanged,
  onShifted,
  onReinforced,
}: {
  /** Something in the turma changed (applied, moved, a worksheet asked for): reload what depends on it. */
  onChanged?: () => void;
  onShifted?: () => void;
  onReinforced?: (started: ReinforcementRequested) => void;
} = {}): {
  afterSave: (lesson: StepLesson, body: CheckInSubmission, saved: SavedCheckIn) => void;
  /** For a replan asked by hand from the same surface: shows its wait and its outcome on the same line. */
  trackReplan: (lesson: StepLesson) => { onStarted: () => void; onSettled: (proposal: ReplanProposal | null) => void };
  row: ReactNode;
  sheet: ReactNode;
  active: boolean;
  clear: () => void;
} {
  const t = useTranslations("checkIns");
  const tr = useTranslations("replan");
  const locale = useLocale();
  const { watchAfterCheckIn, requestReplan, shift } = useReplan();
  const { reinforce } = useCheckInFollowUps();
  const [current, setCurrent] = useState<{ lesson: StepLesson; step: NextStep } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const clear = useCallback(() => {
    setCurrent(null);
    setSheetOpen(false);
  }, []);

  const settle = useCallback(
    (lesson: StepLesson) => (proposal: ReplanProposal | null) =>
      setCurrent((now) => (now && now.lesson.slotId === lesson.slotId ? { lesson, step: stepAfterReplan(proposal) } : now)),
    [],
  );

  const afterSave = useCallback(
    (lesson: StepLesson, body: CheckInSubmission, saved: SavedCheckIn) => {
      if (saved.carriedTo) toast.success(t("carryOverDone", { day: formatLessonDay(saved.carriedTo, locale) }));
      const step = stepAfterSave(body, saved, lesson.slotType);
      setCurrent(step ? { lesson, step } : null);
      if (saved.replanStarted) void watchAfterCheckIn(lesson.timetableId, settle(lesson), lesson.slotId);
    },
    [locale, settle, t, watchAfterCheckIn],
  );

  const trackReplan = useCallback(
    (lesson: StepLesson) => ({
      onStarted: () => setCurrent({ lesson, step: { kind: "replanning" } }),
      onSettled: settle(lesson),
    }),
    [settle],
  );

  const changed = (timetableId: string) => {
    window.dispatchEvent(new CustomEvent(REPLAN_CHANGED_EVENT, { detail: { timetableId } }));
    onChanged?.();
  };

  const run = async (work: () => Promise<boolean>) => {
    setBusy(true);
    try {
      if (await work()) clear();
    } finally {
      setBusy(false);
    }
  };

  const decide = (lesson: StepLesson, proposal: ReplanProposal, accept: boolean) =>
    run(async () => {
      try {
        if (accept) {
          await replanService.accept(lesson.timetableId, proposal.id, null);
          toast.success(tr("appliedAll"));
        } else {
          await replanService.reject(lesson.timetableId, proposal.id);
        }
        changed(lesson.timetableId);
        return true;
      } catch {
        toast.error(tr("actionError"));
        return false;
      }
    });

  let row: ReactNode = null;
  let sheet: ReactNode = null;
  if (current) {
    const { lesson, step } = current;
    const prefix = (text: string) => (lesson.label ? `${lesson.label}: ${text}` : text);
    const close = { label: t("afterSaveClose"), onClick: clear };
    switch (step.kind) {
      case "replanning":
        row = <ActionNotice waiting message={prefix(tr("notHeldInProgress"))} />;
        break;
      case "replanReady":
        row = (
          <ActionNotice
            message={
              <>
                {prefix(tr("readyRow", { count: step.proposal.items.length }))}{" "}
                <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setSheetOpen(true)}>
                  {tr("seeChanges")}
                </button>
              </>
            }
            hint={tr("readyHint")}
            actions={[
              { label: tr("applyAll"), primary: true, busy, onClick: () => void decide(lesson, step.proposal, true) },
              { label: tr("reject"), busy, onClick: () => void decide(lesson, step.proposal, false) },
            ]}
          />
        );
        sheet = (
          <ReplanReviewSheet
            key={step.proposal.id}
            timetableId={lesson.timetableId}
            proposal={step.proposal}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onDecided={() => {
              changed(lesson.timetableId);
              clear();
            }}
          />
        );
        break;
      case "replanNoChange":
        row = <ActionNotice message={prefix(tr("noChangeToast"))} actions={[close]} />;
        break;
      case "replanFailed":
        row = (
          <ActionNotice
            message={prefix(tr("failedToast"))}
            actions={[
              {
                label: tr("retry"),
                primary: true,
                busy,
                onClick: () =>
                  void run(async () => {
                    if (await requestReplan(lesson.timetableId, { triggerSlotId: lesson.slotId }, settle(lesson))) {
                      setCurrent({ lesson, step: { kind: "replanning" } });
                    }
                    return false;
                  }),
              },
              close,
            ]}
          />
        );
        break;
      case "shift":
        row = (
          <ActionNotice
            message={prefix(t("shiftQuestion"))}
            actions={[
              {
                label: t("shiftAction"),
                primary: true,
                busy,
                onClick: () =>
                  void run(async () => {
                    const result = await shift(lesson.timetableId, lesson.slotId);
                    if (result) {
                      onShifted?.();
                      onChanged?.();
                    }
                    return result !== null;
                  }),
              },
              { label: t("shiftKeep"), onClick: clear },
            ]}
          />
        );
        break;
      case "reinforce":
        row = (
          <ActionNotice
            message={prefix(t("reinforcementQuestion"))}
            actions={[
              {
                label: t("reinforcementAction"),
                primary: true,
                busy,
                onClick: () =>
                  void run(async () => {
                    const started = await reinforce(lesson.timetableId, lesson.slotId, step.outcomeIds);
                    if (started) {
                      onReinforced?.(started);
                      onChanged?.();
                    }
                    return started !== null;
                  }),
              },
              { label: t("followUpKeep"), onClick: clear },
            ]}
          />
        );
        break;
    }
  }

  return { afterSave, trackReplan, row, sheet, active: current !== null, clear };
}
