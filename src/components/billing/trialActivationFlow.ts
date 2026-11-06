import { ApiRequestError } from "@/services/api/client";
import {
  isTrialActivationErrorCode,
  type PlanLimits,
  type TrialActivationErrorCode,
} from "@/shared/types/plan-limits";

/** The 403 code of a failed activation, or null for any other failure (network, 5xx). */
export function trialActivationErrorCode(error: unknown): TrialActivationErrorCode | null {
  return error instanceof ApiRequestError && isTrialActivationErrorCode(error.code) ? error.code : null;
}

/** What the campaign-link landing page (`/trial/activate?token=…`) shows once it has an answer. */
export type TrialActivationOutcome =
  | { kind: "started"; limits: PlanLimits }
  | { kind: "alreadyActive"; limits: PlanLimits }
  | { kind: "alreadyPro" }
  | { kind: "noToken"; canStartTrial: boolean }
  | { kind: "error"; code: TrialActivationErrorCode | null; canStartTrial: boolean };

/**
 * Reads the account first so a teacher already on Pro or already on the trial (a second click
 * on the email) is told so instead of getting an error or a second "started" message, then
 * POSTs the token. On a 403 it reports whether the in-app activation is still possible.
 */
export async function resolveTrialActivation(
  token: string | null,
  deps: {
    getLimits: () => Promise<PlanLimits | null>;
    activate: (token: string) => Promise<PlanLimits>;
  },
): Promise<TrialActivationOutcome> {
  const before = await deps.getLimits().catch(() => null);
  if (before?.status === "PRO") return { kind: "alreadyPro" };
  if (before?.status === "TRIAL") return { kind: "alreadyActive", limits: before };
  const canStartTrial = before?.canStartTrial === true;
  if (!token) return { kind: "noToken", canStartTrial };

  try {
    const limits = await deps.activate(token);
    if (limits.status === "TRIAL") return { kind: "started", limits };
    if (limits.status === "PRO") return { kind: "alreadyPro" };
    return { kind: "error", code: null, canStartTrial };
  } catch (error) {
    return { kind: "error", code: trialActivationErrorCode(error), canStartTrial };
  }
}
