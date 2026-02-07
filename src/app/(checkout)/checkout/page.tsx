"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Check,
  Loader2,
  Sparkles,
  ArrowLeft,
  Shield,
  Zap,
  AlertCircle,
  WifiOff,
  RefreshCw,
  MessageCircle,
  XCircle,
} from "lucide-react";
import {
  createCheckoutSession,
  getSubscriptionPlans,
} from "@/services/api/subscription.service";
import type { SubscriptionPlan } from "@/shared/types/subscription";

type ErrorType = "network" | "server" | "validation" | "checkout" | "unknown";

interface CheckoutError {
  type: ErrorType;
  message: string;
  details?: string;
}

function parseError(err: unknown, context: "plans" | "checkout"): CheckoutError {
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
      message: "Sem ligação à internet",
      details: "Verifique a sua ligação e tente novamente.",
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
      message: "Serviço temporariamente indisponível",
      details: "Os nossos servidores estão a ter dificuldades. Tente novamente em alguns minutos.",
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
      message: "Sessão expirada",
      details: "Por favor, faça login novamente para continuar.",
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
      message: context === "checkout" ? "Plano inválido" : "Erro de validação",
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
      message: "Erro no processamento de pagamento",
      details: message,
    };
  }

  // Default error
  return {
    type: "unknown",
    message: context === "checkout" 
      ? "Não foi possível iniciar o pagamento" 
      : "Ocorreu um erro inesperado",
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
}: {
  error: CheckoutError;
  onRetry: () => void;
  onGoBack?: () => void;
  showSupport?: boolean;
}) {
  return (
    <div className="bg-card p-8 rounded-2xl shadow-md border border-border text-center max-w-md mx-auto">
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
          Tentar novamente
        </button>

        {onGoBack && (
          <button
            onClick={onGoBack}
            className="w-full border border-border text-foreground bg-background hover:bg-accent px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Voltar
          </button>
        )}
      </div>

      {showSupport && (
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">
            O problema persiste?
          </p>
          <a
            href="mailto:suporte@scooli.app"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar suporte
          </a>
        </div>
      )}
    </div>
  );
}

function InlineError({
  error,
  onDismiss,
}: {
  error: CheckoutError;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-destructive font-medium text-sm">{error.message}</p>
          {error.details && (
            <p className="text-destructive/80 text-sm mt-1">{error.details}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-destructive hover:text-destructive/70 transition-colors"
          aria-label="Fechar erro"
        >
          <XCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function formatPrice(priceCents: number, currency?: string): string {
  const price = priceCents / 100;
  const formatter = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
    minimumFractionDigits: 2,
  });
  return formatter.format(price);
}

function getPlanBadge(plan: SubscriptionPlan): string | null {
  if (plan.popular) {
    return "Mais Popular";
  }
  if (plan.interval === "year") {
    return "Melhor Valor";
  }
  return null;
}

function calculateSavings(
  monthlyPlan: SubscriptionPlan | undefined,
  annualPlan: SubscriptionPlan
): string | null {
  if (!monthlyPlan) {
    return null;
  }
  const yearlyFromMonthly = monthlyPlan.priceCents * 12;
  const savings = yearlyFromMonthly - annualPlan.priceCents;
  if (savings <= 0) {
    return null;
  }
  const savingsFormatted = formatPrice(savings, annualPlan.currency);
  return `Poupe ${savingsFormatted}/ano`;
}

function calculateMonthlyEquivalent(plan: SubscriptionPlan): string | null {
  if (plan.interval !== "year") {
    return null;
  }
  const monthlyPrice = plan.priceCents / 12;
  return formatPrice(monthlyPrice, plan.currency);
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  const planParam = searchParams.get("plan");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(
    planParam
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

    try {
      const response = await createCheckoutSession({ planCode });
      
      if (!response?.url) {
        throw new Error("Não foi possível obter o link de pagamento");
      }
      
      window.location.href = response.url;
    } catch (err) {
      const parsedError = parseError(err, "checkout");
      setError(parsedError);
      setIsCheckingOut(false);
    }
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
        .filter((p) => p && typeof p.priceCents === "number" && p.priceCents > 0)
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

      setPlans(paidPlans);

      // If plan param is valid, auto-checkout
      if (
        planParam &&
        paidPlans.some((p) => p.planCode === planParam) &&
        !autoCheckoutTriggered.current
      ) {
        autoCheckoutTriggered.current = true;
        setSelectedPlanCode(planParam);
        await initiateCheckout(planParam);
      } else if (planParam && !paidPlans.some((p) => p.planCode === planParam)) {
        // Invalid plan param - show warning but continue
        setError({
          type: "validation",
          message: "Plano não encontrado",
          details: `O plano "${planParam}" não está disponível. Por favor, escolha um dos planos abaixo.`,
        });
        setSelectedPlanCode(paidPlans[0].planCode);
      } else if (paidPlans.length > 0 && !selectedPlanCode) {
        // Set default selection if no planParam
        setSelectedPlanCode(paidPlans[0].planCode);
      }
    } catch (err) {
      const parsedError = parseError(err, "plans");
      setError(parsedError);
    } finally {
      setIsLoadingPlans(false);
    }
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  // Auto-checkout in progress (no error)
  if (planParam && isCheckingOut && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            A preparar o seu pagamento...
          </h2>
          <p className="text-muted-foreground">
            Será redirecionado para o Stripe em segundos.
          </p>
        </div>
      </div>
    );
  }

  // Full-page error state (failed to load plans)
  if (error && !isLoadingPlans && plans.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <ErrorCard
            error={error}
            onRetry={handleRetry}
            onGoBack={() => router.back()}
            showSupport={retryCount >= 2}
          />
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.planCode === selectedPlanCode);
  const monthlyPlan = plans.find((p) => p.interval === "month");

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Escolha o seu plano
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Desbloqueie todo o potencial do Scooli e crie conteúdo educacional
            sem limites.
          </p>
        </div>

        {/* Loading State */}
        {isLoadingPlans && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">A carregar planos...</p>
          </div>
        )}

        {/* Plans Grid */}
        {!isLoadingPlans && plans.length > 0 && (
          <>
            {/* Inline error for validation issues (invalid plan param) */}
            {error && error.type === "validation" && (
              <InlineError error={error} onDismiss={clearError} />
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {plans.map((plan) => {
                const badge = getPlanBadge(plan);
                const savings =
                  plan.interval === "year"
                    ? calculateSavings(monthlyPlan, plan)
                    : null;
                const monthlyEquivalent = calculateMonthlyEquivalent(plan);
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
                    className={`relative bg-card p-8 rounded-2xl shadow-md border-2 cursor-pointer transition-all hover:shadow-lg ${
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
                          {plan.name}
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
                        <span className="text-4xl font-bold text-foreground">
                          {formatPrice(plan.priceCents, plan.currency)}
                        </span>
                        <span className="text-muted-foreground">
                          /{plan.interval === "month" ? "mês" : "ano"}
                        </span>
                      </div>
                      {monthlyEquivalent && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Equivalente a {monthlyEquivalent}/mês
                        </p>
                      )}
                    </div>

                    {plan.description && (
                      <p className="text-muted-foreground text-sm mb-4">
                        {plan.description}
                      </p>
                    )}

                    {Array.isArray(plan.features) && plan.features.length > 0 && (
                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-success" />
                            </div>
                            <span className="text-secondary-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Checkout Button */}
            <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
              {/* Checkout error */}
              {error && error.type !== "validation" && (
                <InlineError error={error} onDismiss={clearError} />
              )}

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  {selectedPlan && (
                    <>
                      <p className="text-muted-foreground text-sm mb-1">
                        Plano selecionado
                      </p>
                      <p className="text-xl font-semibold text-foreground">
                        {selectedPlan.name} —{" "}
                        {formatPrice(
                          selectedPlan.priceCents,
                          selectedPlan.currency
                        )}
                        /{selectedPlan.interval === "month" ? "mês" : "ano"}
                      </p>
                    </>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={!selectedPlanCode || isCheckingOut}
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-3 min-w-[250px]"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      A processar...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Continuar para Pagamento
                    </>
                  )}
                </button>
              </div>

              {/* Trust badges */}
              <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Pagamento seguro via Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Cancele a qualquer momento</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Acesso instantâneo</span>
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
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
