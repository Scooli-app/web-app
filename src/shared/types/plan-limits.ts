/** Error codes returned by the API (HTTP 403) when a free-plan limit blocks an action. */
export type FreePlanLimitCode = "free_class_limit" | "free_period_limit";

/** Account state from `GET /users/me/plan-limits` (ENG-314 Pro trial). */
export type AccountStatus = "PRO" | "TRIAL" | "LOCKED" | "LEGACY_FREE";

/** Why a LOCKED account is read-only. */
export type LockReason = "trial_expired" | "trial_not_activated";

/**
 * What a read-only account cannot do (`action` of a 403 `account_locked`). `create` is any new
 * document without AI (blank, from a template, upload/import). An unknown future value gets the
 * same paywall (the client reports it as null).
 */
export type LockedAction = "generate" | "create" | "export" | "duplicate" | "share";

/** Actions the UI guards while locked: the server's, plus printing (blocked in the UI only). */
export type GuardedAction = LockedAction | "print";

/**
 * Why the upgrade modal opened: a free-plan limit, a Pro-only feature (presentations, own sources),
 * or the read-only lock (by lock reason; `account_locked` when the reason is unknown).
 */
export type UpgradeReason =
  | FreePlanLimitCode
  | "presentation_pro"
  | "sources_pro"
  | "account_locked"
  | LockReason;

export function isUpgradeReason(code: string): code is FreePlanLimitCode {
  return code === "free_class_limit" || code === "free_period_limit";
}

export interface PlanLimits {
  isPro: boolean;
  maxActiveClasses: number | null;
  activeClasses: number;
  windowStart: string | null;
  windowEnd: string | null;
  freeWeekStart: string | null;
  // Pro trial fields (ENG-314). Optional: an older backend does not send them.
  status?: AccountStatus;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  trialDaysLeft?: number | null;
  canStartTrial?: boolean;
  lockReason?: LockReason | null;
}

const ACCOUNT_STATUSES: readonly AccountStatus[] = ["PRO", "TRIAL", "LOCKED", "LEGACY_FREE"];
const LOCK_REASONS: readonly LockReason[] = ["trial_expired", "trial_not_activated"];

export function isLockReason(value: unknown): value is LockReason {
  return LOCK_REASONS.includes(value as LockReason);
}

/**
 * Normalises the plan-limits body. A response without a (known) `status` comes from a backend
 * that predates the trial: it resolves to PRO / LEGACY_FREE from `isPro`, never locked and never
 * offering a trial, so the app behaves exactly as before.
 */
export function parsePlanLimits(raw: PlanLimits): PlanLimits {
  const known = ACCOUNT_STATUSES.includes(raw.status as AccountStatus);
  const status: AccountStatus = known ? (raw.status as AccountStatus) : raw.isPro ? "PRO" : "LEGACY_FREE";
  return {
    ...raw,
    status,
    trialStartedAt: known ? raw.trialStartedAt ?? null : null,
    trialEndsAt: known ? raw.trialEndsAt ?? null : null,
    trialDaysLeft:
      known && status === "TRIAL" && typeof raw.trialDaysLeft === "number" ? raw.trialDaysLeft : null,
    canStartTrial: known && raw.canStartTrial === true,
    lockReason: status === "LOCKED" && isLockReason(raw.lockReason) ? raw.lockReason : null,
  };
}

/** What the UI needs to know about the account's access, derived from the plan limits. */
export interface AccountAccess {
  status: AccountStatus;
  isLocked: boolean;
  isTrial: boolean;
  lockReason: LockReason | null;
  canStartTrial: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
}

/** Trial days left at or under which the trial banner becomes prominent. */
export const TRIAL_ENDING_SOON_DAYS = 5;

/**
 * Fails open: while the limits are unknown (loading, or the read failed) nothing is locked;
 * the server still refuses locked actions with a 403 `account_locked`.
 */
export function resolveAccountAccess(limits: PlanLimits | null): AccountAccess {
  const parsed = limits ? parsePlanLimits(limits) : null;
  const status = parsed?.status ?? "LEGACY_FREE";
  return {
    status,
    isLocked: status === "LOCKED",
    isTrial: status === "TRIAL",
    lockReason: parsed?.lockReason ?? null,
    canStartTrial: parsed?.canStartTrial ?? false,
    trialEndsAt: parsed?.trialEndsAt ?? null,
    trialDaysLeft: parsed?.trialDaysLeft ?? null,
  };
}

/** The paywall copy for a lock: by reason, or the generic read-only copy when it is unknown. */
export function lockUpgradeReason(reason: unknown): UpgradeReason {
  return isLockReason(reason) ? reason : "account_locked";
}

/** Body of a 403 from a blocked endpoint while the account is read-only. */
interface AccountLockedPayload {
  code: "account_locked";
  reason?: LockReason | null;
  action?: LockedAction | null;
  error?: string;
}

export function isAccountLockedPayload(value: unknown): value is AccountLockedPayload {
  return !!value && typeof value === "object" && (value as { code?: unknown }).code === "account_locked";
}

/** 403 codes of `POST /users/me/trial/activate`. */
export type TrialActivationErrorCode =
  | "trial_link_expired"
  | "trial_not_eligible"
  | "trial_token_invalid"
  | "trial_not_available";

const TRIAL_ACTIVATION_ERROR_CODES: readonly TrialActivationErrorCode[] = [
  "trial_link_expired",
  "trial_not_eligible",
  "trial_token_invalid",
  "trial_not_available",
];

export function isTrialActivationErrorCode(value: unknown): value is TrialActivationErrorCode {
  return TRIAL_ACTIVATION_ERROR_CODES.includes(value as TrialActivationErrorCode);
}
