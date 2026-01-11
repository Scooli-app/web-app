"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import {
  User,
  CreditCard,
  Settings,
  ExternalLink,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getCurrentSubscription,
  getUsageStats,
  createPortalSession,
} from "@/services/api";
import  {
    PLAN_DISPLAY_INFO,
    type CurrentSubscription,
    type UsageStats,
    type SubscriptionStatus,
} from "@/shared/types/subscription";
import { setTheme, type ThemeMode } from "@/store/ui/uiSlice";
import type { RootState, AppDispatch } from "@/store/store";

function getStatusBadge(status: SubscriptionStatus, cancelAtPeriodEnd: boolean) {
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
    case "free":
      return {
        label: "Gratuito",
        className: "bg-primary/10 text-primary",
      };
    default:
      return {
        label: status,
        className: "bg-secondary text-muted-foreground",
      };
  }
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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setError(null);
      const [subData, usageData] = await Promise.all([
        getCurrentSubscription(),
        getUsageStats(),
      ]);
      setSubscription(subData);
      setUsage(usageData);
    } catch {
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
      if (response?.portalUrl) {
        window.location.href = response.portalUrl;
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

  const isFreeUser = !subscription || subscription.status === "free";
  const creditsUsedPercent = usage
    ? Math.min((usage.creditsUsed / usage.creditsLimit) * 100, 100)
    : 0;

  const planInfo = subscription
    ? PLAN_DISPLAY_INFO[subscription.planCode] || {
        name: subscription.planName,
        description: "",
      }
    : PLAN_DISPLAY_INFO.free;

  const statusBadge = subscription
    ? getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)
    : getStatusBadge("free", false);

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
          ) : (
            <>
              {/* Plan Info */}
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
              {subscription && subscription.status !== "free" && (
                <p className="text-sm text-muted-foreground mb-6">
                  {subscription.cancelAtPeriodEnd
                    ? `Acesso até ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renova a ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              )}

              {/* Credits Progress */}
              {usage && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Créditos utilizados
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {usage.creditsUsed} / {usage.creditsLimit}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${creditsUsedPercent}%` }}
                    />
                  </div>
                  {creditsUsedPercent >= 80 && (
                    <p className="text-xs text-warning mt-2">
                      Está a aproximar-se do limite de créditos deste período.
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {isFreeUser ? (
                  <Button
                    onClick={() => router.push("/checkout")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                ) : (
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
                )}
              </div>
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

