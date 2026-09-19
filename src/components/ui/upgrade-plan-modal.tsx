"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Routes } from "@/shared/types";
import { AlertCircle, ArrowRight, Crown, Infinity, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "./button";

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradePlanModal({
  open,
  onOpenChange,
}: UpgradePlanModalProps) {
  const t = useTranslations("billing.upgradePlanModal");
  const router = useRouter();

  useEffect(() => {
    if (open) {
      posthog.capture("upgrade_modal_viewed");
    }
  }, [open]);

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
            <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          </div>

          <DialogTitle className="text-2xl font-bold text-foreground mb-1">
            {t("title")}
          </DialogTitle>

          <DialogDescription className="text-muted-foreground">
            {t("description")}
          </DialogDescription>
        </div>

        {/* Benefits List */}
        <div className="space-y-3 p-6 pr-14">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {t("unlockLabel")}
          </p>

          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl border border-border/50">
            <div className="w-10 h-10 bg-emerald-500 dark:bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <Infinity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{t("unlimitedGenerations.title")}</p>
              <p className="text-xs text-muted-foreground">{t("unlimitedGenerations.description")}</p>
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
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white h-12 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            {t("cta")}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <button
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
