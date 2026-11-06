/** Body of `GET /public/trial-promos/{code}` (ENG-360). */
export interface TrialPromoCheck {
  code: string;
  valid: boolean;
  /** Days the promo adds to the trial (30 for the fair code). Only on a valid code. */
  extraDays?: number;
  validUntil?: string | null;
}

/** 403 codes of `POST /users/me/trial/promo`. */
export type TrialPromoErrorCode = "promo_invalid" | "promo_not_eligible" | "promo_already_used";

const TRIAL_PROMO_ERROR_CODES: readonly TrialPromoErrorCode[] = [
  "promo_invalid",
  "promo_not_eligible",
  "promo_already_used",
];

export function isTrialPromoErrorCode(value: unknown): value is TrialPromoErrorCode {
  return TRIAL_PROMO_ERROR_CODES.includes(value as TrialPromoErrorCode);
}
