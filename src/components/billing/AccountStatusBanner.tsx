"use client";

import { AccountPrintLock } from "@/components/billing/AccountPrintLock";
import { TrialActivateButton } from "@/components/billing/TrialActivateButton";
import { Button } from "@/components/ui/button";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { invalidatePlanLimits } from "@/hooks/usePlanLimits";
import { Routes } from "@/shared/types";
import { TRIAL_ENDING_SOON_DAYS } from "@/shared/types/plan-limits";
import { selectHasEffectivePro } from "@/store/entitlements/selectors";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/shared/utils/utils";
import { Clock, Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import posthog from "posthog-js";
import { useEffect, type ReactNode } from "react";

const UPGRADE_CLASS =
  "shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700";

/**
 * The account's Pro-trial state at the top of the workspace (ENG-320/321): days left while on
 * the trial (prominent in the last days), the persistent read-only notice while locked, and the
 * in-app activation offer for eligible free users. Renders nothing for Pro and plain free users.
 */
export function AccountStatusBanner({ className }: { className?: string }) {
  const t = useTranslations("billing.banner");
  const access = useAccountAccess();
  const { status, isLocked, lockReason, canStartTrial, trialDaysLeft } = access;
  const hasEffectivePro = useAppSelector(selectHasEffectivePro);

  // The entitlement became Pro (checkout finished, a school seat) while the limits still say
  // LOCKED: re-read them so the lock lifts without a reload.
  useEffect(() => {
    if (isLocked && hasEffectivePro) invalidatePlanLimits();
  }, [isLocked, hasEffectivePro]);

  const upgradeLink = (label: string, source: string, cls = UPGRADE_CLASS) => (
    <Button asChild size="sm" className={cls}>
      <Link href={Routes.CHECKOUT} onClick={() => posthog.capture("trial_banner_upgrade_clicked", { source })}>
        {label}
      </Link>
    </Button>
  );

  let banner: ReactNode = null;

  if (isLocked) {
    banner = (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <div className="flex min-w-0 items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("lockedTitle")}</p>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80">
              {t(`lockedReason.${lockReason ?? "unknown"}`)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {canStartTrial && <TrialActivateButton source="locked_banner" />}
          {upgradeLink(t("upgradeCta"), "locked_banner", canStartTrial ? "shrink-0" : UPGRADE_CLASS)}
        </div>
      </div>
    );
  } else if (status === "TRIAL") {
    const endingSoon = trialDaysLeft !== null && trialDaysLeft <= TRIAL_ENDING_SOON_DAYS;
    banner = endingSoon ? (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
      >
        <div className="flex min-w-0 items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("trialEndingTitle", { days: trialDaysLeft })}</p>
            <p className="text-sm text-amber-900/80 dark:text-amber-200/80">{t("trialEndingDescription")}</p>
          </div>
        </div>
        {upgradeLink(t("upgradeCta"), "trial_ending")}
      </div>
    ) : (
      <div
        role="status"
        className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 truncate">
            {trialDaysLeft !== null ? t("trialDiscreet", { days: trialDaysLeft }) : t("trialActive")}
          </span>
        </span>
        <Button asChild size="sm" variant="link" className="h-7 shrink-0 px-1">
          <Link href={Routes.CHECKOUT} onClick={() => posthog.capture("trial_banner_upgrade_clicked", { source: "trial" })}>
            {t("seePlans")}
          </Link>
        </Button>
      </div>
    );
  } else if (canStartTrial && status !== "PRO") {
    banner = (
      <div
        role="status"
        className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("offerTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("offerDescription")}</p>
          </div>
        </div>
        <TrialActivateButton source="offer_banner" />
      </div>
    );
  }

  return (
    <>
      <AccountPrintLock locked={isLocked} />
      {banner && (
        <section aria-label={t("regionLabel")} className={cn("w-full", className)}>
          {banner}
        </section>
      )}
    </>
  );
}
