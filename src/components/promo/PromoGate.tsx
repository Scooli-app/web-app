"use client";

import { PromoOfferModal } from "@/components/promo/PromoOfferModal";
import { isPromoActive } from "@/shared/utils/promo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setPromoModalOpen } from "@/store/ui/uiSlice";
import { useEffect } from "react";

// Time-limited, unadvertised promo: shown once to signed-in free-tier users
// while NEXT_PUBLIC_PROMO_ENDS_AT hasn't passed yet. Deliberately uses a
// localStorage dismiss flag rather than the server-tracked prompt pattern
// used by OnboardingGate/AppFeedbackSurveyGate - building backend "prompt
// status" plumbing for a 30-day tactical promo isn't worth it.
const DISMISSED_KEY = "scooli_promo_dismissed";

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // localStorage unavailable (private browsing edge case) - non-fatal
  }
}

export function PromoGate() {
  const dispatch = useAppDispatch();
  const isPromoModalOpen = useAppSelector((state) => state.ui.isPromoModalOpen);
  const isUpgradeModalOpen = useAppSelector(
    (state) => state.ui.isUpgradeModalOpen,
  );
  const subscription = useAppSelector(
    (state) => state.subscription.subscription,
  );

  useEffect(() => {
    if (
      isPromoModalOpen ||
      isUpgradeModalOpen ||
      !subscription ||
      subscription.planCode !== "free" ||
      !isPromoActive() ||
      wasDismissed()
    ) {
      return;
    }
    dispatch(setPromoModalOpen(true));
  }, [dispatch, isPromoModalOpen, isUpgradeModalOpen, subscription]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      markDismissed();
    }
    dispatch(setPromoModalOpen(open));
  };

  return (
    <PromoOfferModal open={isPromoModalOpen} onOpenChange={handleOpenChange} />
  );
}
