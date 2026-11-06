/**
 * Fair promo links (ENG-360). The public check needs no session: the sign-up page asks it before
 * the account exists, to decide whether to show the offer.
 */
import apiClient from "./client";
import type { TrialPromoCheck } from "@/shared/types/trial-promo";

export const trialPromoService = {
  check: (code: string) =>
    apiClient
      .get<TrialPromoCheck>(`/public/trial-promos/${encodeURIComponent(code)}`)
      .then((r) => r.data),
};
