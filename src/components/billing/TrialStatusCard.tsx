"use client";

import { TrialActivateButton } from "@/components/billing/TrialActivateButton";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { formatTrialEndDate } from "@/shared/utils/trialDates";
import { Lock, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

/** The Pro trial on the account/billing page: end date and days left, the lock, or the offer. */
export function TrialStatusCard() {
  const t = useTranslations("billing.trialStatusCard");
  const tBanner = useTranslations("billing.banner");
  const locale = useLocale();
  const { status, isLocked, lockReason, canStartTrial, trialEndsAt, trialDaysLeft, trialPromoCode } = useAccountAccess();

  if (status === "TRIAL") {
    const date = formatTrialEndDate(trialEndsAt, locale);
    return (
      <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground">{t("title")}</p>
              {date && <p className="text-sm text-muted-foreground">{t("endsOn", { date })}</p>}
              {trialPromoCode && (
                <p className="text-sm text-muted-foreground">{t("promoIncluded", { code: trialPromoCode })}</p>
              )}
            </div>
          </div>
          {trialDaysLeft !== null && (
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {t("daysLeft", { days: trialDaysLeft })}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/30">
        <div className="flex items-start gap-2">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-950 dark:text-amber-100">{tBanner("lockedTitle")}</p>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
              {tBanner(`lockedReason.${lockReason ?? "unknown"}`)}
            </p>
          </div>
        </div>
        {canStartTrial && <TrialActivateButton source="settings" className="mt-3" />}
      </div>
    );
  }

  if (canStartTrial && status !== "PRO") {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{tBanner("offerTitle")}</p>
          <p className="text-sm text-muted-foreground">{tBanner("offerDescription")}</p>
        </div>
        <TrialActivateButton source="settings" />
      </div>
    );
  }

  return null;
}
