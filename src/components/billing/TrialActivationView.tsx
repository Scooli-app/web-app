"use client";

import { resolveTrialActivation, type TrialActivationOutcome } from "@/components/billing/trialActivationFlow";
import { TrialActivateButton } from "@/components/billing/TrialActivateButton";
import { Button } from "@/components/ui/button";
import { useTrialActivation } from "@/hooks/useTrialActivation";
import { meService } from "@/services/api/me.service";
import { Routes } from "@/shared/types";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { formatTrialEndDate } from "@/shared/utils/trialDates";
import { AlertCircle, Crown, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Landing page of the campaign email's "Ativar o meu mês Pro" link (ENG-320). The middleware
 * sends signed-out visitors through sign-in and back here with the token.
 */
export function TrialActivationView({ token }: { token: string | null }) {
  const t = useTranslations("billing.trialActivation");
  const tErrors = useTranslations("billing.trial.errors");
  const locale = useLocale();
  const { activate } = useTrialActivation();
  const [outcome, setOutcome] = useState<TrialActivationOutcome | null>(null);
  const activateRef = useRef(activate);
  activateRef.current = activate;
  // One POST per visit, also under React strict mode's double effects.
  const startedRef = useRef(false);

  const run = useCallback(() => {
    setOutcome(null);
    void resolveTrialActivation(token, {
      getLimits: () => meService.getPlanLimits(),
      activate: (value) => activateRef.current(value),
    }).then(setOutcome);
  }, [token]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    run();
  }, [run]);

  const onInAppActivated = (limits: PlanLimits) => setOutcome({ kind: "started", limits });

  const dashboard = (
    <Button asChild className="w-full sm:w-auto">
      <Link href={Routes.DASHBOARD}>{t("dashboardCta")}</Link>
    </Button>
  );
  const upgrade = (
    <Button asChild className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 sm:w-auto">
      <Link href={Routes.CHECKOUT}>{t("upgradeCta")}</Link>
    </Button>
  );
  const inApp = (
    <TrialActivateButton source="activation_page" size="default" className="w-full sm:w-auto" onActivated={onInAppActivated} />
  );

  if (!outcome) {
    return (
      <Shell icon={<Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />} title={t("activatingTitle")} busy />
    );
  }

  const endTitle = (limits: PlanLimits, key: "successTitle" | "alreadyActiveTitle") => {
    const date = formatTrialEndDate(limits.trialEndsAt, locale);
    return date ? t(key, { date }) : t(`${key}NoDate`);
  };

  switch (outcome.kind) {
    case "started":
      return (
        <Shell icon={<Sparkles className="h-7 w-7 text-primary" aria-hidden />} title={endTitle(outcome.limits, "successTitle")} description={t("successDescription")}>
          {dashboard}
        </Shell>
      );
    case "alreadyActive":
      return (
        <Shell icon={<Sparkles className="h-7 w-7 text-primary" aria-hidden />} title={endTitle(outcome.limits, "alreadyActiveTitle")}>
          {dashboard}
        </Shell>
      );
    case "alreadyPro":
      return (
        <Shell icon={<Crown className="h-7 w-7 text-amber-500" aria-hidden />} title={t("alreadyProTitle")} description={t("alreadyProDescription")}>
          {dashboard}
        </Shell>
      );
    case "noToken":
      return outcome.canStartTrial ? (
        <Shell icon={<Sparkles className="h-7 w-7 text-primary" aria-hidden />} title={t("noTokenTitle")} description={t("noTokenDescription")}>
          {inApp}
        </Shell>
      ) : (
        <Shell icon={<AlertCircle className="h-7 w-7 text-amber-500" aria-hidden />} title={tErrors("trial_not_eligible")} description={t("notEligibleDescription")}>
          {upgrade}
        </Shell>
      );
    case "error": {
      const errorIcon = <AlertCircle className="h-7 w-7 text-amber-500" aria-hidden />;
      switch (outcome.code) {
        case "trial_link_expired":
          return (
            <Shell icon={errorIcon} title={tErrors("trial_link_expired")} description={outcome.canStartTrial ? t("expiredCanStart") : t("expiredUpgrade")}>
              {outcome.canStartTrial ? inApp : upgrade}
            </Shell>
          );
        case "trial_not_eligible":
          return (
            <Shell icon={errorIcon} title={tErrors("trial_not_eligible")} description={t("notEligibleDescription")}>
              {upgrade}
            </Shell>
          );
        case "trial_token_invalid":
          return (
            <Shell icon={errorIcon} title={tErrors("trial_token_invalid")} description={outcome.canStartTrial ? t("invalidCanStart") : t("invalidNoStart")}>
              {outcome.canStartTrial ? inApp : upgrade}
            </Shell>
          );
        case "trial_not_available":
          return (
            <Shell icon={errorIcon} title={tErrors("trial_not_available")} description={t("notAvailableDescription")}>
              {dashboard}
            </Shell>
          );
        default:
          return (
            <Shell icon={errorIcon} title={t("genericErrorTitle")} description={t("genericErrorDescription")}>
              <Button type="button" onClick={run} className="w-full sm:w-auto">
                {t("retry")}
              </Button>
            </Shell>
          );
      }
    }
  }
}

function Shell({
  icon,
  title,
  description,
  busy = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 items-center justify-center py-8">
      <section
        aria-live="polite"
        aria-busy={busy}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-md sm:p-8"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">{icon}</div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
        {children && <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">{children}</div>}
      </section>
    </div>
  );
}
