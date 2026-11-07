"use client";

import { TrialActivateButton } from "@/components/billing/TrialActivateButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccountAccess } from "@/hooks/useAccountAccess";
import { Routes } from "@/shared/types";
import type { UpgradeReason } from "@/shared/types/plan-limits";
import { AlertCircle, ArrowRight, CalendarRange, Crown, Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "./button";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Why the modal opened; shows that reason's copy. Without one, the generic free-plan limit copy. */
  reason?: UpgradeReason | null;
}

export function UpgradePlanModal({
  open,
  onOpenChange,
  reason,
}: UpgradePlanModalProps) {
  const t = useTranslations("billing.upgradePlanModal");
  const router = useRouter();
  // Eligible accounts are offered the free Pro month next to the paid plans (ENG-320).
  const { canStartTrial } = useAccountAccess();

  useEffect(() => {
    if (open) {
      posthog.capture("upgrade_modal_viewed", { reason: reason ?? null, can_start_trial: canStartTrial });
    }
    // Once per opening, not when the eligibility loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reason]);

  const isLockReason = reason === "account_locked" || reason === "trial_expired" || reason === "trial_not_activated";
  const description = !reason
    ? t("description")
    : reason === "trial_not_activated" && !canStartTrial
      ? t("reasons.trial_not_activated.descriptionNoTrial")
      : t(`reasons.${reason}.description`);

  const handleUpgrade = () => {
    posthog.capture("upgrade_modal_cta_clicked");
    onOpenChange(false);
    router.push(Routes.CHECKOUT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-y-auto">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-b from-amber-50 to-transparent px-8 pb-6 pt-8 pr-16 text-center dark:from-amber-900/10">
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
            {isLockReason ? (
              <Lock className="w-7 h-7 text-amber-600 dark:text-amber-400" aria-hidden />
            ) : reason === "see_plans" ? (
              <Crown className="w-7 h-7 text-amber-600 dark:text-amber-400" aria-hidden />
            ) : (
              <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" aria-hidden />
            )}
          </div>

          <DialogTitle className="text-2xl font-bold text-foreground mb-1">
            {reason ? t(`reasons.${reason}.title`) : t("title")}
          </DialogTitle>

          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </div>

        {/* Benefits List */}
        <div className="space-y-3 p-6 pr-14">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("unlockLabel")}
          </p>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <CalendarRange className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{t("wholeYear.title")}</p>
              <p className="text-xs text-muted-foreground">{t("wholeYear.description")}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{t("advancedCustomization.title")}</p>
              <p className="text-xs text-muted-foreground">{t("advancedCustomization.description")}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{t("premiumFeatures.title")}</p>
              <p className="text-xs text-muted-foreground">{t("premiumFeatures.description")}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2 pr-14">
          {canStartTrial && (
            <TrialActivateButton
              source="paywall"
              size="lg"
              className="mb-3 h-12 w-full rounded-xl font-bold"
              onActivated={() => onOpenChange(false)}
            />
          )}
          <Button
            onClick={handleUpgrade}
            variant={canStartTrial ? "outline" : "default"}
            className={canStartTrial ? "w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 group" : "w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-12 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 group"}
          >
            {t("cta")}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {t("maybeLater")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
