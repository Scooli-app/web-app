"use client";

import { Routes } from "@/shared/types";
import { PROMO_PLAN_CODES, isPromoActive } from "@/shared/utils/promo";
import { useAppSelector } from "@/store/hooks";
import { X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

const DISMISSED_KEY = "scooli_promo_navbar_dismissed";

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

// Persistent, dismissible reminder in the navbar - separate from PromoGate's
// one-time modal so dismissing one doesn't hide the other. Starts hidden and
// only reveals itself after mount to avoid an SSR/hydration mismatch, since
// the dismissed flag lives in localStorage (unavailable during SSR).
export function PromoNavCta() {
  const router = useRouter();
  const subscription = useAppSelector(
    (state) => state.subscription.subscription,
  );
  const [dismissed, setDismissed] = useState(true);
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    setDismissed(wasDismissed());
  }, []);

  const shouldShow =
    !dismissed && isPromoActive() && subscription?.planCode === "free";

  useEffect(() => {
    if (shouldShow && !hasTrackedViewRef.current) {
      hasTrackedViewRef.current = true;
      posthog.capture("promo_navbar_cta_viewed");
    }
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  const handleClick = () => {
    posthog.capture("promo_navbar_cta_clicked");
    router.push(`${Routes.CHECKOUT}?plan=${PROMO_PLAN_CODES.monthly}`);
  };

  const handleDismiss = () => {
    markDismissed();
    setDismissed(true);
    posthog.capture("promo_navbar_cta_dismissed");
  };

  return (
    <div className="hidden items-center gap-1 rounded-full border border-dashed border-primary/30 bg-primary/10 py-1 pl-3 pr-1 sm:flex">
      <button
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-primary hover:text-primary/80"
      >
        <Zap className="h-3.5 w-3.5" />
        Pro por 4,99€/mês
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar"
        className="rounded-full p-1 text-primary/60 transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
