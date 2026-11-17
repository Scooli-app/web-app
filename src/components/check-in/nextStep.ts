import { settledToast } from "@/components/replan/replanLogic";
import type { CheckInSubmission, SavedCheckIn } from "@/shared/types/check-in";
import type { ReplanProposal } from "@/shared/types/replan";

/**
 * The one thing left for the teacher after an answer, if any. Everything else happens by itself: the replan (Pro),
 * the carry-over of a partial lesson (without a replan), the revision of the materials once a replan is applied.
 */
export type NextStep =
  | { kind: "replanning" }
  | { kind: "replanReady"; proposal: ReplanProposal }
  | { kind: "replanNoChange" }
  | { kind: "replanFailed" }
  | { kind: "shift" }
  | { kind: "reinforce"; outcomeIds: string[] };

/** Right after the answer was saved. Null: nothing to decide. */
export function stepAfterSave(body: CheckInSubmission, saved: SavedCheckIn, slotType?: string): NextStep | null {
  if (slotType === "ASSESSMENT") return null;
  if (saved.replanStarted) return { kind: "replanning" };
  if (body.result === "NOT_HELD") return { kind: "shift" };
  if (body.result === "TAUGHT_WITH_DIFFICULTIES" && body.difficultOutcomeIds?.length) {
    return { kind: "reinforce", outcomeIds: body.difficultOutcomeIds };
  }
  return null;
}

/** Once the replan settled. A failure after "não houve aula" falls back to moving the lessons. */
export function stepAfterReplan(proposal: ReplanProposal): NextStep {
  const outcome = settledToast(proposal);
  if (outcome === "ready") return { kind: "replanReady", proposal };
  if (outcome === "noChange") return { kind: "replanNoChange" };
  return proposal.trigger === "not_held" && proposal.triggerSlotId ? { kind: "shift" } : { kind: "replanFailed" };
}
