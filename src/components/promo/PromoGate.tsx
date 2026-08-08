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
  // Never open on top of the onboarding takeover: this dialog is modal, so Radix
  // sets pointer-events:none on <body> while its content renders at z-50 — hidden
  // behind the opaque z-9999 onboarding, which then swallows every click.
  const isOnboardingModalOpen = useAppSelector(
    (state) => state.ui.isOnboardingModalOpen,
  );
  const subscription = useAppSelector(
    (state) => state.subscription.subscription,
  );

  useEffect(() => {
    if (
      isPromoModalOpen ||
      isUpgradeModalOpen ||
      isOnboardingModalOpen ||
      !subscription ||
      subscription.planCode !== "free" ||
      !isPromoActive() ||
      wasDismissed()
    ) {
      return;
    }
    dispatch(setPromoModalOpen(true));
  }, [
    dispatch,
    isPromoModalOpen,
    isUpgradeModalOpen,
    isOnboardingModalOpen,
    subscription,
  ]);

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
