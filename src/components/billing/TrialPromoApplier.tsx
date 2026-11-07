"use client";

import { setPlanLimits, usePlanLimits } from "@/hooks/usePlanLimits";
import { maybeApplyTrialPromo } from "@/lib/trialPromo/applyTrialPromo";
import { meService } from "@/services/api/me.service";
import { formatTrialEndDate } from "@/shared/utils/trialDates";
import { useAuth } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Applies the promo code captured before sign-up (ENG-360) as soon as the signed-in account's
 * plan limits say TRIAL. Mounted inside `<SignedIn>` in the workspace layout. Refusals (an existing
 * teacher scanning the QR) are silent; network errors retry on the next load, at most 3 times.
 */
export function TrialPromoApplier() {
  const { userId } = useAuth();
  const { limits } = usePlanLimits();
  const t = useTranslations("billing.trialPromo");
  const locale = useLocale();
  const copy = useRef({ t, locale });
  copy.current = { t, locale };

  useEffect(() => {
    if (!userId || !limits) return;
    void maybeApplyTrialPromo(limits, { apply: meService.applyTrialPromo }).then((outcome) => {
      switch (outcome.kind) {
        case "applied": {
          setPlanLimits(userId, outcome.limits);
          posthog.capture("promo_applied", { code: outcome.code });
          const { t: tr, locale: loc } = copy.current;
          const date = formatTrialEndDate(outcome.limits.trialEndsAt, loc);
          toast.success(date ? tr("appliedToast", { date }) : tr("appliedToastNoDate"));
          break;
        }
        case "refused":
          posthog.capture("promo_refused", { code: outcome.code, reason: outcome.reason });
          break;
        case "gaveUp":
          posthog.capture("promo_refused", { code: outcome.code, reason: "max_attempts" });
          break;
        default:
          break;
      }
    });
  }, [userId, limits]);

  return null;
}
