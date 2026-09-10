"use client";

import {
  createCheckoutSession,
  getSubscriptionPlans,
} from "@/services/api/subscription.service";
import {
  getPlanDisplayInfo,
  type SubscriptionPlan,
} from "@/shared/types/subscription";
import {
  PROMO_PLANS,
  isPromoActive,
  isPromoPlanCode,
} from "@/shared/utils/promo";
import { useAuth } from "@clerk/nextjs";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  MessageCircle,
  RefreshCw,
  Shield,
  Sparkles,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

type ErrorType = "network" | "server" | "validation" | "checkout" | "unknown";

interface CheckoutError {
  type: ErrorType;
  message: string;
  details?: string;
}

type Translator = ReturnType<typeof useTranslations>;

function parseError(
  err: unknown,
  context: "plans" | "checkout",
  t: Translator,
): CheckoutError {
  const message = err instanceof Error ? err.message : String(err);
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("net::") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("connection")
  ) {
    return {
      type: "network",
      message: t("errors.network.message"),
      details: t("errors.network.details"),
    };
  }

  // Server/API errors
  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503") ||
    lowerMessage.includes("server")
  ) {
    return {
      type: "server",
      message: t("errors.server.message"),
      details: t("errors.server.details"),
    };
  }

  // Auth errors
  if (
    lowerMessage.includes("401") ||
    lowerMessage.includes("403") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("forbidden")
  ) {
    return {
      type: "validation",
      message: t("errors.sessionExpired.message"),
      details: t("errors.sessionExpired.details"),
    };
  }

  // Validation/Bad request errors
  if (
    lowerMessage.includes("400") ||
    lowerMessage.includes("invalid") ||
    lowerMessage.includes("validation")
  ) {
    return {
      type: "validation",
      message: context === "checkout" ? t("errors.invalidPlan") : t("errors.genericValidation"),
      details: message,
    };
  }

  // Stripe-specific errors
  if (
    lowerMessage.includes("stripe") ||
    lowerMessage.includes("payment") ||
    lowerMessage.includes("card")
  ) {
    return {
      type: "checkout",
      message: t("errors.payment"),
      details: message,
    };
  }

  // Default error
  return {
    type: "unknown",
    message:
      context === "checkout"
        ? t("errors.unknownCheckout")
        : t("errors.unknownGeneric"),
    details: message,
  };
}

function ErrorIcon({ type }: { type: ErrorType }) {
  switch (type) {
    case "network":
      return <WifiOff className="w-12 h-12 text-destructive" />;
    case "server":
      return <AlertCircle className="w-12 h-12 text-warning" />;
    case "checkout":
      return <XCircle className="w-12 h-12 text-destructive" />;
    default:
      return <AlertCircle className="w-12 h-12 text-destructive" />;
  }
}

function ErrorCard({
  error,
  onRetry,
  onGoBack,
  showSupport = false,
  t,
}: {
  error: CheckoutError;
  onRetry: () => void;
  onGoBack?: () => void;
  showSupport?: boolean;
  t: Translator;
}) {
  return (
    <div className="bg-card p-5 sm:p-8 rounded-2xl shadow-md border border-border text-center max-w-md mx-auto">
      <div className="mb-4 flex justify-center">
        <ErrorIcon type={error.type} />
      </div>

      <h2 className="text-xl font-semibold text-foreground mb-2">
        {error.message}
      </h2>

      {error.details && (
        <p className="text-muted-foreground mb-6 text-sm">{error.details}</p>
      )}

      <div className="space-y-3">
        <button
          onClick={onRetry}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          {t("common.retry")}
        </button>

        {onGoBack && (
          <button
            onClick={onGoBack}
            className="w-full border border-border text-foreground bg-background hover:bg-accent px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {t("common.back")}
          </button>
        )}
      </div>

      {showSupport && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            {t("support.persistPrompt")}
          </p>
          <a
            href="mailto:suporte@scooli.app"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t("support.contact")}
          </a>
        </div>
      )}
    </div>
  );
}

function InlineError({
  error,
  onDismiss,
  t,
}: {
  error: CheckoutError;
  onDismiss: () => void;
  t: Translator;
}) {
  return (
    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-destructive font-medium text-sm">
            {error.message}
          </p>
          {error.details && (
            <p className="text-destructive/80 text-sm mt-1">{error.details}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-destructive hover:text-destructive/70 transition-colors"
          aria-label={t("errors.closeAriaLabel")}
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function formatPrice(locale: string, priceCents: number, currency?: string): string {
  const price = priceCents / 100;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
    minimumFractionDigits: 2,
  });
  return formatter.format(price);
}

function getLocalizedPlanName(plan: SubscriptionPlan): string {
  return getPlanDisplayInfo(plan.planCode)?.name ?? plan.name;
}

function getPlanBadge(plan: SubscriptionPlan, t: Translator): string | null {
  if (plan.popular) {
    return t("planBadge.popular");
  }
  if (plan.interval === "year") {
    return t("planBadge.bestValue");
  }
  return null;
}

function calculateSavings(
  monthlyPlan: SubscriptionPlan | undefined,
  annualPlan: SubscriptionPlan,
  locale: string,
  t: Translator,
): string | null {
  if (!monthlyPlan) {
    return null;
  }
  const yearlyFromMonthly = monthlyPlan.priceCents * 12;
  const savings = yearlyFromMonthly - annualPlan.priceCents;
  if (savings <= 0) {
    return null;
  }
  const savingsFormatted = formatPrice(locale, savings, annualPlan.currency);
  return t("savingsPerYear", { amount: savingsFormatted });
}

function calculateMonthlyEquivalent(plan: SubscriptionPlan, locale: string): string | null {
  if (plan.interval !== "year") {
    return null;
  }
  const monthlyPrice = plan.priceCents / 12;
  return formatPrice(locale, monthlyPrice, plan.currency);
}

function calculateSavingsPercent(
  monthlyPlan: SubscriptionPlan | undefined,
  annualPlan: SubscriptionPlan,
): string | null {
  if (!monthlyPlan) {
    return null;
  }
  const yearlyFromMonthly = monthlyPlan.priceCents * 12;
  const savings = yearlyFromMonthly - annualPlan.priceCents;
  if (savings <= 0) {
    return null;
  }
  return `${Math.round((savings / yearlyFromMonthly) * 100)}%`;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const t = useTranslations("checkout");
  const locale = useLocale();

  const planParam = searchParams.get("plan");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(
    planParam,
  );
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<CheckoutError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const autoCheckoutTriggered = useRef(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const initiateCheckout = useCallback(async (planCode: string) => {
    setIsCheckingOut(true);
    setError(null);

    posthog.capture("checkout_initiated", {
      plan_code: planCode,
      plan_interval:
        plans.find((p) => p.planCode === planCode)?.interval ?? null,
      price_cents:
        plans.find((p) => p.planCode === planCode)?.priceCents ?? null,
      is_promo: isPromoPlanCode(planCode),
    });
    // Persist plan details so payment_success can include them after the
    // Stripe redirect lands on the dashboard with no plan info in the URL.
    try {
      sessionStorage.setItem("scooli_pending_plan", planCode);
      const pendingPlan = plans.find((p) => p.planCode === planCode);
      if (pendingPlan) {
        sessionStorage.setItem(
          "scooli_pending_plan_interval",
          pendingPlan.interval,
        );
        sessionStorage.setItem(
          "scooli_pending_plan_price",
          String(pendingPlan.priceCents),
        );
      }
    } catch {
      // sessionStorage unavailable (private browsing edge case) — non-fatal
    }

    try {
      const response = await createCheckoutSession({ planCode });

      if (!response?.url) {
        throw new Error("Não foi possível obter o link de pagamento");
      }

      window.location.href = response.url;
    } catch (err) {
      const parsedError = parseError(err, "checkout", t);
      posthog.capture("checkout_error", {
        plan_code: planCode,
        error_type: parsedError.type,
        error_message: parsedError.message,
        is_promo: isPromoPlanCode(planCode),
      });
      posthog.captureException(err);
      setError(parsedError);
      setIsCheckingOut(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoadingPlans(true);
      setError(null);

      const fetchedPlans = await getSubscriptionPlans();

      if (!fetchedPlans || !Array.isArray(fetchedPlans)) {
        throw new Error("Resposta inválida do servidor");
      }

      // Filter out free plan and sort: monthly first, then annual
      const paidPlans = fetchedPlans
        .filter(
          (p) => p && typeof p.priceCents === "number" && p.priceCents > 0,
        )
        .sort((a, b) => {
          if (a.interval === "month" && b.interval === "year") {
            return -1;
          }
          if (a.interval === "year" && b.interval === "month") {
            return 1;
          }
          return 0;
        });

      if (paidPlans.length === 0) {
        throw new Error("Nenhum plano disponível no momento");
      }

      // While the promo is active, the plan grid/default selection show the
      // discounted (unadvertised) plans instead of the live pro_monthly/
      // pro_annual ones - those are excluded from /subscriptions/plans on
      // purpose, so there's nothing to merge them with.
      const displayPlans = isPromoActive() ? PROMO_PLANS : paidPlans;
      setPlans(displayPlans);

      // If a plan param is present, always attempt checkout directly rather
      // than requiring it to appear in the public plans list first: unlisted
      // plan codes (e.g. time-limited promos excluded from /subscriptions/plans
      // on purpose) are still valid checkout targets - the backend is the
      // source of truth and will reject an unknown/expired code via
      // createCheckoutSession, surfaced through the existing error handling.
      if (planParam && !autoCheckoutTriggered.current) {
        autoCheckoutTriggered.current = true;
        setSelectedPlanCode(planParam);
        await initiateCheckout(planParam);
      } else if (displayPlans.length > 0 && !selectedPlanCode) {
        // Set default selection if no planParam
        setSelectedPlanCode(displayPlans[0].planCode);
      }
    } catch (err) {
      const parsedError = parseError(err, "plans", t);
      setError(parsedError);
    } finally {
      setIsLoadingPlans(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planParam, selectedPlanCode, initiateCheckout]);

  const handleRetry = useCallback(() => {
    autoCheckoutTriggered.current = false;
    setRetryCount((prev) => prev + 1);
    setError(null);
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchPlans();
    }
  }, [isLoaded, isSignedIn, fetchPlans]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const returnUrl = `/checkout${planParam ? `?plan=${planParam}` : ""}`;
      router.push(`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`);
    }
  }, [isLoaded, isSignedIn, planParam, router]);

  const handleCheckout = async () => {
    if (!selectedPlanCode) {
      return;
    }
    await initiateCheckout(selectedPlanCode);
  };

  // Loading state - auth loading or redirecting to sign-up
  if (!isLoaded || (!isSignedIn && isLoaded)) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("loading.generic")}</p>
        </div>
      </div>
    );
  }

  // Auto-checkout in progress (no error)
  if (planParam && isCheckingOut && !error) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t("autoCheckout.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("autoCheckout.description")}
          </p>
        </div>
      </div>
    );
  }

  // Full-page error state (failed to load plans)
  if (error && !isLoadingPlans && plans.length === 0) {
    return (
      <div className="min-h-dvh">
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back")}</span>
          </button>

          <ErrorCard
            error={error}
            onRetry={handleRetry}
            onGoBack={() => router.back()}
            showSupport={retryCount >= 2}
            t={t}
          />
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.planCode === selectedPlanCode);
  const monthlyPlan = plans.find((p) => p.interval === "month");

  return (
    <div className="min-h-dvh">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t("common.back")}</span>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              {t("header.title")}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            {t("header.description")}
          </p>
        </div>

        {/* Loading State */}
        {isLoadingPlans && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t("loading.plans")}</p>
          </div>
        )}

        {/* Plans Grid */}
        {!isLoadingPlans && plans.length > 0 && (
          <>
            {/* Inline error for validation issues (invalid plan param) */}
            {error && error.type === "validation" && (
              <InlineError error={error} onDismiss={clearError} t={t} />
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {plans.map((plan) => {
                const badge = getPlanBadge(plan, t);
                const savings =
                  plan.interval === "year"
                    ? calculateSavings(monthlyPlan, plan, locale, t)
                    : null;
                const monthlyEquivalent = calculateMonthlyEquivalent(plan, locale);
                const savingsPercent =
                  plan.interval === "year"
                    ? calculateSavingsPercent(monthlyPlan, plan)
                    : null;
                const isSelected = selectedPlanCode === plan.planCode;

                return (
                  <div
                    key={plan.planCode}
                    onClick={() => {
                      setSelectedPlanCode(plan.planCode);
                      if (error?.type === "checkout") {
                        clearError();
                      }
                    }}
                    className={`relative bg-card p-5 sm:p-8 rounded-2xl shadow-md border-2 cursor-pointer transition-all hover:shadow-lg ${
                      isSelected
                        ? "border-primary ring-4 ring-primary/10"
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {badge && (
                      <div
                        className={`absolute -top-3 left-6 px-4 py-1 rounded-full text-xs font-semibold ${
                          plan.interval === "year"
                            ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        {badge}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-1">
                          {getLocalizedPlanName(plan)}
                        </h3>
                        {savings && (
                          <span className="inline-block bg-success/20 text-success text-xs font-medium px-2 py-1 rounded-full">
                            {savings}
                          </span>
                        )}
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary-foreground" />
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground sm:text-4xl">
                          {plan.interval === "year" && monthlyEquivalent
                            ? monthlyEquivalent
                            : formatPrice(locale, plan.priceCents, plan.currency)}
                        </span>
                        <span className="text-muted-foreground">{t("perMonth")}</span>
                      </div>
                      {plan.interval === "year" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {savingsPercent
                            ? t("paidAnnuallyWithSavings", {
                                price: formatPrice(locale, plan.priceCents, plan.currency),
                                percent: savingsPercent,
                              })
                            : t("paidAnnually", {
                                price: formatPrice(locale, plan.priceCents, plan.currency),
                              })}
                        </p>
                      )}
                    </div>

                    {plan.description && (
                      <p className="text-muted-foreground text-sm mb-4">
                        {plan.description}
                      </p>
                    )}

                    {Array.isArray(plan.features) &&
                      plan.features.length > 0 && (
                        <ul className="space-y-3">
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-success" />
                              </div>
                              <span className="text-secondary-foreground">
                                {feature}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                );
              })}
            </div>

            {/* Checkout Button */}
            <div className="bg-card p-5 sm:p-8 rounded-2xl shadow-md border border-border">
              {/* Checkout error */}
              {error && error.type !== "validation" && (
                <InlineError error={error} onDismiss={clearError} t={t} />
              )}

              <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  {selectedPlan && (
                    <>
                      <p className="text-muted-foreground text-sm mb-1">
                        {t("selectedPlanLabel")}
                      </p>
                      <p className="text-xl font-semibold text-foreground">
                        {t("selectedPlanSummary", {
                          planName: getLocalizedPlanName(selectedPlan),
                          price: formatPrice(locale, selectedPlan.priceCents, selectedPlan.currency),
                          interval:
                            selectedPlan.interval === "month"
                              ? t("intervalMonth")
                              : t("intervalYear"),
                        })}
                      </p>
                    </>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={!selectedPlanCode || isCheckingOut}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:w-auto sm:min-w-[220px] sm:px-8 sm:text-lg"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />{t("checkoutButton.processing")}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      {t("checkoutButton.cta")}
                    </>
                  )}
                </button>
              </div>

              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>{t("trust.securePayment")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{t("trust.cancelAnytime")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{t("trust.instantAccess")}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
