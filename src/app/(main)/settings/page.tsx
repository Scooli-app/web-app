"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createPortalSession,
  getCurrentSubscription,
  getSubscriptionPlans,
  getUsageStats,
} from "@/services/api";
import {
  PLAN_DISPLAY_INFO,
  type CurrentSubscription,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type UsageStats,
} from "@/shared/types/subscription";
import type { AppDispatch, RootState } from "@/store/store";
import { setTheme, type ThemeMode } from "@/store/ui/uiSlice";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Infinity,
  Loader2,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

function getStatusBadge(
  status: SubscriptionStatus,
  cancelAtPeriodEnd: boolean,
  planCode?: string
) {
  // Free plan always shows "Período de Teste" badge
  if (planCode === "free") {
    return {
      label: "Período de Teste",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };
  }

  if (cancelAtPeriodEnd) {
    return {
      label: "Cancela no fim do período",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    };
  }

  switch (status) {
    case "active":
    case "trialing":
      return {
        label: "Ativo",
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      };
    case "past_due":
      return {
        label: "Pagamento Pendente",
        className: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      };
    case "canceled":
      return {
        label: "Cancelado",
        className: "bg-secondary text-muted-foreground",
      };
    default:
      return {
        label: status,
        className: "bg-secondary text-muted-foreground",
      };
  }
}

function formatPrice(priceCents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
  }).format(priceCents / 100);
}

function calculateMonthlyEquivalent(plan: SubscriptionPlan): string | null {
  if (plan.interval !== "year") return null;
  const monthlyPrice = plan.priceCents / 12;
  return formatPrice(monthlyPrice, plan.currency);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SettingsContent() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setError(null);
      const [subscriptionData, usageData, plansData] = await Promise.all([
        getCurrentSubscription(),
        getUsageStats(),
        getSubscriptionPlans(),
      ]);
      setSubscription(subscriptionData);
      setUsage(usageData);
      // Filter to only paid plans and sort: monthly first, then annual
      const paidPlans = plansData
        .filter((p) => p.priceCents > 0)
        .sort((a, b) => {
          if (a.interval === "month" && b.interval === "year") return -1;
          if (a.interval === "year" && b.interval === "month") return 1;
          return 0;
        });
      setPlans(paidPlans);
    } catch (err) {
      console.error("[Settings] Fetch error:", err);
      setError("Não foi possível carregar os dados da subscrição.");
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isUserLoaded) {
      fetchData();
    }
  }, [isUserLoaded, fetchData]);

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    setError(null);
    try {
      const response = await createPortalSession();
      if (response?.url) {
        window.location.href = response.url;
      } else {
        throw new Error("Portal URL not received");
      }
    } catch {
      setError("Não foi possível abrir o portal de pagamentos. Tente novamente.");
      setIsLoadingPortal(false);
    }
  };

  const handleManageAccount = () => {
    openUserProfile();
  };

  const handleThemeChange = (newTheme: ThemeMode) => {
    dispatch(setTheme(newTheme));
  };

  const isFreeUser = !subscription || subscription.planCode === "free";
  const creditsUsedPercent = usage
    ? Math.min((usage.used / usage.limit) * 100, 100)
    : 0;

  const planInfo = subscription
    ? PLAN_DISPLAY_INFO[subscription.planCode] || {
        name: subscription.planName,
        description: "",
      }
    : PLAN_DISPLAY_INFO.free;

  const statusBadge = subscription
    ? getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd, subscription.planCode)
    : getStatusBadge("free", false, "free");

  if (!isUserLoaded) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Definições</h1>
        <p className="text-lg text-muted-foreground">
          Gerir a sua conta, subscrição e preferências.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile & Account Card */}
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Perfil e Conta
            </h2>
          </div>

          <div className="flex items-center gap-4 p-4 bg-muted rounded-xl mb-6">
            {user?.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName || "Avatar"}
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover"
                priority
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xl font-semibold">
                  {user?.firstName?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {user?.fullName || "Utilizador"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress || ""}
              </p>
            </div>
          </div>

          <Button
            onClick={handleManageAccount}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium"
          >
            Gerir Conta
          </Button>
        </div>

        {/* Subscription & Credits Card */}
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Subscrição e Créditos
            </h2>
          </div>

          {isLoadingData ? (
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded-lg w-48 animate-pulse" />
              <div className="h-4 bg-muted rounded-lg w-64 animate-pulse" />
              <div className="h-3 bg-muted rounded-full w-full animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 rounded-xl">
              <p className="text-destructive text-sm mb-3">{error}</p>
              <Button
                onClick={fetchData}
                className="bg-destructive hover:bg-destructive/90 text-white px-4 py-2 rounded-xl font-medium"
              >
                Tentar novamente
              </Button>
            </div>
          ) : isFreeUser ? (
            <>
              {/* Free Trial Plan Info */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-semibold text-foreground text-lg">
                  {planInfo.name}
                </span>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              {/* Free Trial Usage */}
              {usage && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Gerações restantes
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {usage.remaining} de {usage.limit}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${100 - creditsUsedPercent}%` }}
                    />
                  </div>
                  {usage.remaining === 0 ? (
                    <p className="text-xs text-destructive font-semibold mt-2 animate-pulse">
                      Esgotou as suas gerações gratuitas. Faça upgrade agora para continuar a criar.
                    </p>
                  ) : usage.remaining <= 20 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Restam poucas gerações. Considere fazer upgrade.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Upgrade Plan Options */}
              {plans.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Upgrade para Pro
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {plans.map((plan) => {
                      const isAnnual = plan.interval === "year";
                      const monthlyEquivalent = calculateMonthlyEquivalent(plan);
                      return (
                        <button
                          key={plan.planCode}
                          onClick={() => router.push(`/checkout?plan=${plan.planCode}`)}
                          className={`relative p-4 rounded-xl border-2 text-left transition-all hover:border-primary hover:shadow-md ${
                            isAnnual
                              ? "border-primary bg-primary/5"
                              : "border-border bg-muted/30"
                          }`}
                        >
                          {(plan.popular || isAnnual) && (
                            <span className={`absolute -top-2.5 left-3 px-2 py-0.5 text-xs font-medium rounded-full ${
                              isAnnual
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground"
                            }`}>
                              {isAnnual ? "Poupa 20%" : "Mais Popular"}
                            </span>
                          )}
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-foreground">
                              {plan.name}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-foreground">
                              {formatPrice(plan.priceCents, plan.currency)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              /{plan.interval === "month" ? "mês" : "ano"}
                            </span>
                          </div>
                          {monthlyEquivalent && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ≈ {monthlyEquivalent}/mês
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Pro Plan Info */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-semibold text-foreground text-lg">
                  {planInfo.name}
                </span>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              {/* Renewal/Period Info */}
              {subscription && (
                <p className="text-sm text-muted-foreground mb-6">
                  {subscription.cancelAtPeriodEnd
                    ? `Acesso até ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renova a ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              )}

              {/* Pro Usage - Unlimited */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Gerações utilizadas
                  </span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    {usage?.used ?? 0}
                    <span className="mx-0.5">/</span>
                    <Infinity className="w-4 h-4" />
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                    style={{ width: "100%" }}
                  />
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  Gerações ilimitadas com o plano Pro
                </p>
              </div>

              {/* Actions */}
              <Button
                onClick={handleManageSubscription}
                disabled={isLoadingPortal}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {isLoadingPortal ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    A abrir...
                  </>
                ) : (
                  <>
                    Gerir Subscrição
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* App Preferences Card */}
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Preferências
            </h2>
          </div>

          {/* Theme Selection */}
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                {theme === "light" ? (
                  <Sun className="w-5 h-5 text-primary" />
                ) : theme === "dark" ? (
                  <Moon className="w-5 h-5 text-primary" />
                ) : (
                  <Monitor className="w-5 h-5 text-primary" />
                )}
                <div>
                  <p className="font-medium text-foreground">Tema</p>
                  <p className="text-sm text-muted-foreground">
                    {theme === "light"
                      ? "Modo claro"
                      : theme === "dark"
                        ? "Modo escuro"
                        : "Detetar automaticamente"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleThemeChange("light")}
                  variant="outline"
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl ${
                    theme === "light"
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "border-border text-foreground bg-background hover:bg-accent"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  <span className="hidden sm:inline">Claro</span>
                  {theme === "light" && <Check className="w-4 h-4 hidden sm:block" />}
                </Button>
                <Button
                  onClick={() => handleThemeChange("dark")}
                  variant="outline"
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl ${
                    theme === "dark"
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "border-border text-foreground bg-background hover:bg-accent"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline">Escuro</span>
                  {theme === "dark" && <Check className="w-4 h-4 hidden sm:block" />}
                </Button>
                <Button
                  onClick={() => handleThemeChange("system")}
                  variant="outline"
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl ${
                    theme === "system"
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                      : "border-border text-foreground bg-background hover:bg-accent"
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span className="hidden sm:inline">Sistema</span>
                  {theme === "system" && <Check className="w-4 h-4 hidden sm:block" />}
                </Button>
              </div>
            </div>

            {/* Notifications (placeholder - disabled) */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Notificações
              </p>
              <div className="flex items-start gap-3 opacity-50">
                <Checkbox disabled checked={false} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Novidades e atualizações
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receber emails sobre novas funcionalidades
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 opacity-50">
                <Checkbox disabled checked={false} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Atividade na comunidade
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Notificações sobre interações com os seus recursos
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">
                Em breve disponível
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="w-full max-w-3xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-48 mb-2" />
        <div className="h-6 bg-muted rounded-lg w-80" />
      </div>
      <div className="space-y-6">
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border h-48" />
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border h-64" />
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border h-56" />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent />
    </Suspense>
  );
}

