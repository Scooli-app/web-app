"use client";

import { captureTrialPromo, promoCodeFromSearch } from "@/lib/trialPromo/promoStorage";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";

const OPENED_KEY = "scooli_trial_promo_opened";
const openedThisLoad = new Set<string>();

/** `promo_link_opened` once per tab session per code, not on every Clerk step or reload. */
function firstOpenInTab(code: string): boolean {
  if (openedThisLoad.has(code)) return false;
  openedThisLoad.add(code);
  try {
    if (sessionStorage.getItem(OPENED_KEY) === code) return false;
    sessionStorage.setItem(OPENED_KEY, code);
  } catch {
    // Storage blocked: the in-memory guard still covers strict mode and re-renders.
  }
  return true;
}

/**
 * Mounted app-wide (root layout): any page opened with `?promo=CODE` — the fair QR's `/sign-up`,
 * `/sign-in`, the landing redirect — stores the code (ENG-360). `TrialPromoApplier` applies it once
 * the teacher is signed in and on the trial.
 */
export function TrialPromoCapture() {
  const pathname = usePathname();

  useEffect(() => {
    const code = promoCodeFromSearch(window.location.search);
    if (!code) return;
    captureTrialPromo(code);
    if (firstOpenInTab(code)) posthog.capture("promo_link_opened", { code, path: pathname });
  }, [pathname]);

  return null;
}
