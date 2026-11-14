"use client";

import { ActionNotice } from "@/components/check-in/ActionNotice";
import type { WeekLessonTarget } from "@/components/dashboard/WeekLessonDialog";
import { offersAdjustNextLessons, settledToast } from "@/components/replan/replanLogic";
import { followUpFor, type CheckInFollowUp } from "@/hooks/useCheckInFollowUps";
import type { CheckInResult, CheckInSubmission, PendingCheckIn, SavedCheckIn } from "@/shared/types/check-in";
import type { ReplanProposal } from "@/shared/types/replan";
import { useTranslations } from "next-intl";

/** Where the replan that follows the answer stands: none, being written, or its outcome. */
export type ReplanState = "none" | "generating" | "ready" | "noChange" | "failed";

/** What the teacher can still do about an answer just saved in the dashboard strip. */
export interface AfterSave {
  item: PendingCheckIn;
  result: CheckInResult;
  replan: ReplanState;
  /** Not held and no replan running: offer to move the following lessons. */
  shiftAsk: boolean;
  /** Partial or difficulties: offer the AI's proposal for the following lessons. */
  adjustAsk: boolean;
  followUp: CheckInFollowUp | null;
  followUpDone: { kind: CheckInFollowUp["kind"]; day: string; target: WeekLessonTarget } | null;
  busy: "followUp" | "shift" | null;
}

/** The steps an answer leaves, right after it was saved. */
export function afterSaveFor(item: PendingCheckIn, body: CheckInSubmission, saved: SavedCheckIn): AfterSave {
  const notHeld = body.result === "NOT_HELD" && item.slotType !== "ASSESSMENT";
  return {
    item,
    result: body.result,
    replan: saved.replanStarted ? "generating" : "none",
    shiftAsk: notHeld && !saved.replanStarted,
    adjustAsk: !saved.replanStarted && offersAdjustNextLessons(body.result, item.slotType),
    followUp: followUpFor(body),
    followUpDone: null,
    busy: null,
  };
}

/** The panel once the replan settled. A failed replan after "não houve aula" falls back to moving the lessons. */
export function withReplanOutcome(panel: AfterSave, proposal: ReplanProposal): AfterSave {
  const replan = settledToast(proposal);
  return {
    ...panel,
    replan,
    adjustAsk: false,
    shiftAsk: panel.shiftAsk || (replan === "failed" && panel.result === "NOT_HELD" && panel.item.slotType !== "ASSESSMENT"),
  };
}

/** The panel's steps, each with what it does and its buttons, in the app's colours. */
export function AfterSaveSteps({
  panel,
  onAdjust,
  onSkipAdjust,
  onReview,
  onShift,
  onSkipShift,
  onFollowUp,
  onSkipFollowUp,
  onOpenLesson,
}: {
  panel: AfterSave;
  onAdjust: () => void;
  onSkipAdjust: () => void;
  onReview: () => void;
  onShift: () => void;
  onSkipShift: () => void;
  onFollowUp: () => void;
  onSkipFollowUp: () => void;
  onOpenLesson: (target: WeekLessonTarget) => void;
}) {
  const t = useTranslations("checkIns");
  const tr = useTranslations("replan");
  const { replan, followUp, followUpDone } = panel;
  return (
    <div className="space-y-2">
      {replan === "generating" && <ActionNotice message={tr("notHeldInProgress")} />}
      {replan === "ready" && (
        <ActionNotice message={tr("readyNotice")} actions={[{ label: tr("readyAction"), onClick: onReview, primary: true }]} />
      )}
      {replan === "noChange" && <ActionNotice message={tr("noChangeToast")} />}
      {replan === "failed" && <ActionNotice message={tr("failedToast")} />}
      {panel.adjustAsk && replan === "none" && (
        <ActionNotice
          message={tr("adjustQuestion")}
          hint={tr("adjustHint")}
          actions={[
            { label: tr("adjustAction"), onClick: onAdjust, primary: true },
            { label: t("shiftKeep"), onClick: onSkipAdjust },
          ]}
        />
      )}
      {panel.shiftAsk && (
        <ActionNotice
          message={t("shiftQuestion")}
          actions={[
            { label: t("shiftAction"), onClick: onShift, primary: true, busy: panel.busy === "shift" },
            { label: t("shiftKeep"), onClick: onSkipShift },
          ]}
        />
      )}
      {followUp && (
        <ActionNotice
          message={t(followUp.kind === "reinforcement" ? "reinforcementQuestion" : "carryOverQuestion")}
          actions={[
            {
              label: t(followUp.kind === "reinforcement" ? "reinforcementAction" : "carryOverAction"),
              onClick: onFollowUp,
              primary: true,
              busy: panel.busy === "followUp",
            },
            { label: t("followUpKeep"), onClick: onSkipFollowUp },
          ]}
        />
      )}
      {followUpDone && (
        <ActionNotice
          message={t(followUpDone.kind === "reinforcement" ? "reinforcementDone" : "carryOverDone", { day: followUpDone.day })}
          actions={[{ label: t("openLesson"), onClick: () => onOpenLesson(followUpDone.target) }]}
        />
      )}
    </div>
  );
}
