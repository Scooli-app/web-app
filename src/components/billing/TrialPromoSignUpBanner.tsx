"use client";

import { trialDuration } from "@/lib/trialPromo/formatTrialDuration";
import { promoCodeFromSearch, readStoredPromo } from "@/lib/trialPromo/promoStorage";
import { trialPromoService } from "@/services/api/trial-promo.service";
import type { TrialPromoCheck } from "@/shared/types/trial-promo";
import { Gift } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// One public check per code and page load (strict mode mounts twice). A failed check shows nothing.
const checks = new Map<string, Promise<TrialPromoCheck | null>>();

function checkPromo(code: string): Promise<TrialPromoCheck | null> {
  let pending = checks.get(code);
  if (!pending) {
    pending = trialPromoService.check(code).catch(() => null);
    checks.set(code, pending);
  }
  return pending;
}

/** Test hook. */
export function resetTrialPromoChecks() {
  checks.clear();
}

/**
 * "Oferta {name}: cria a tua conta e ganha {duration} de Pro grátis" above Clerk's form on
 * `/sign-up` and `/sign-in` when the visitor came through a valid promo link (ENG-360). Name and
 * duration come from the promo itself. Nothing for an invalid or unknown code, a promo without a
 * usable name or length, or while the check is pending.
 */
export function TrialPromoSignUpBanner() {
  const t = useTranslations("billing.trialPromo");
  const pathname = usePathname();
  const onCallback = pathname.endsWith("/sso-callback");
  const [offer, setOffer] = useState<TrialPromoCheck | null>(null);

  useEffect(() => {
    if (onCallback) return;
    const code = promoCodeFromSearch(window.location.search) ?? readStoredPromo()?.code ?? null;
    if (!code) return;
    let cancelled = false;
    void checkPromo(code).then((result) => {
      if (!cancelled && result?.valid === true) setOffer(result);
    });
    return () => {
      cancelled = true;
    };
  }, [onCallback]);

  const duration = trialDuration(offer?.totalTrialDays);
  const name = offer?.name?.trim();
  if (onCallback || !offer || !duration || !name) return null;

  const durationText =
    duration.unit === "months" ? t("durationMonths", { count: duration.count }) : t("durationDays", { count: duration.count });

  return (
    <div
      role="note"
      data-testid="trial-promo-banner"
      className="flex w-full max-w-[25rem] items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground"
    >
      <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
      <p>{t.rich("signUpBanner", { name, duration: durationText, strong: (chunks) => <strong className="font-semibold">{chunks}</strong> })}</p>
    </div>
  );
}
