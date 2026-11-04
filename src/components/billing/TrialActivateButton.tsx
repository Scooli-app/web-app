"use client";

import { Button } from "@/components/ui/button";
import { trialActivationErrorCode } from "@/components/billing/trialActivationFlow";
import { useTrialActivation } from "@/hooks/useTrialActivation";
import type { PlanLimits } from "@/shared/types/plan-limits";
import { formatTrialEndDate } from "@/shared/utils/trialDates";
import { cn } from "@/shared/utils/utils";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import posthog from "posthog-js";
import type { ComponentProps } from "react";
import { toast } from "sonner";

interface TrialActivateButtonProps {
  /** Where the button is, for analytics ("banner", "paywall", "settings", "activation_page"). */
  source: string;
  onActivated?: (limits: PlanLimits) => void;
  size?: ComponentProps<typeof Button>["size"];
  variant?: ComponentProps<typeof Button>["variant"];
  className?: string;
}

/** "Ativar o meu mês Pro" without a campaign token (in-app activation, ENG-314). */
export function TrialActivateButton({
  source,
  onActivated,
  size = "sm",
  variant = "default",
  className,
}: TrialActivateButtonProps) {
  const t = useTranslations("billing.trial");
  const locale = useLocale();
  const { activate, activating } = useTrialActivation();

  const handleClick = async () => {
    if (activating) return;
    posthog.capture("trial_activate_clicked", { source });
    try {
      const limits = await activate();
      const date = formatTrialEndDate(limits.trialEndsAt, locale);
      toast.success(date ? t("startedToast", { date }) : t("startedToastNoDate"));
      onActivated?.(limits);
    } catch (error) {
      const code = trialActivationErrorCode(error);
      toast.error(t(`errors.${code ?? "generic"}`));
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={activating}
      aria-busy={activating}
      className={cn("shrink-0", className)}
    >
      {activating ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
      {activating ? t("activating") : t("activateCta")}
    </Button>
  );
}
