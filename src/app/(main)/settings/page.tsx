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
  Sparkles,
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
import { setTheme } from "@/store/ui/uiSlice";
import type { RootState, AppDispatch } from "@/store/store";

function getStatusBadge(status: SubscriptionStatus, cancelAtPeriodEnd: boolean) {
  if (cancelAtPeriodEnd) {
    return {
      label: "Cancela no fim do período",
      className: "bg-amber-100 text-amber-700",
    };
  }

  switch (status) {
    case "active":
    case "trialing":
      return {
        label: "Ativo",
        className: "bg-[#E6FAF2] text-[#1DB67D]",
      };
    case "past_due":
      return {
        label: "Pagamento Pendente",
        className: "bg-[#FFF7E5] text-[#FFC857]",
      };
    case "canceled":
      return {
        label: "Cancelado",
        className: "bg-[#F4F5F8] text-[#6C6F80]",
      };
    case "free":
      return {
        label: "Gratuito",
        className: "bg-[#EEF0FF] text-[#6753FF]",
      };
    default:
      return {
        label: status,
        className: "bg-[#F4F5F8] text-[#6C6F80]",
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

  const handleThemeToggle = () => {
    dispatch(setTheme(theme === "light" ? "dark" : "light"));
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
        <h1 className="text-4xl font-bold text-[#0B0D17] mb-2">Definições</h1>
        <p className="text-lg text-[#6C6F80]">
          Gerir a sua conta, subscrição e preferências.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile & Account Card */}
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#EEF0FF] flex items-center justify-center">
              <User className="w-5 h-5 text-[#6753FF]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0B0D17]">
              Perfil e Conta
            </h2>
          </div>

          <div className="flex items-center gap-4 p-4 bg-[#F4F5F8] rounded-xl mb-6">
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
              <div className="w-14 h-14 rounded-full bg-[#6753FF] flex items-center justify-center">
                <span className="text-white text-xl font-semibold">
                  {user?.firstName?.charAt(0) || "U"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0B0D17] truncate">
                {user?.fullName || "Utilizador"}
              </p>
              <p className="text-sm text-[#6C6F80] truncate">
                {user?.primaryEmailAddress?.emailAddress || ""}
              </p>
            </div>
          </div>

          <Button
            onClick={handleManageAccount}
            className="w-full sm:w-auto bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-5 py-3 rounded-xl font-medium"
          >
            Gerir Conta
          </Button>
        </div>

        {/* Subscription & Credits Card */}
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#EEF0FF] flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#6753FF]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0B0D17]">
              Subscrição e Créditos
            </h2>
          </div>

          {isLoadingData ? (
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded-lg w-48 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded-lg w-64 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded-full w-full animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-4 bg-[#FFECEC] rounded-xl">
              <p className="text-[#FF4F4F] text-sm mb-3">{error}</p>
              <Button
                onClick={fetchData}
                className="bg-[#FF4F4F] hover:bg-[#E04545] text-white px-4 py-2 rounded-xl font-medium"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Plan Info */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="font-semibold text-[#0B0D17] text-lg">
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
                <p className="text-sm text-[#6C6F80] mb-6">
                  {subscription.cancelAtPeriodEnd
                    ? `Acesso até ${formatDate(subscription.currentPeriodEnd)}`
                    : `Renova a ${formatDate(subscription.currentPeriodEnd)}`}
                </p>
              )}

              {/* Credits Progress */}
              {usage && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#2E2F38]">
                      Créditos utilizados
                    </span>
                    <span className="text-sm text-[#6C6F80]">
                      {usage.creditsUsed} / {usage.creditsLimit}
                    </span>
                  </div>
                  <div className="h-3 bg-[#F4F5F8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#6753FF] rounded-full transition-all duration-300"
                      style={{ width: `${creditsUsedPercent}%` }}
                    />
                  </div>
                  {creditsUsedPercent >= 80 && (
                    <p className="text-xs text-[#FFC857] mt-2">
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
                    className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-5 py-3 rounded-xl font-medium"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                ) : (
                  <Button
                    onClick={handleManageSubscription}
                    disabled={isLoadingPortal}
                    className="bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-5 py-3 rounded-xl font-medium disabled:opacity-50"
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
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#EEF0FF] flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#6753FF]" />
            </div>
            <h2 className="text-xl font-semibold text-[#0B0D17]">
              Preferências
            </h2>
          </div>

          {/* Theme Toggle */}
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[#F4F5F8] rounded-xl">
              <div className="flex items-center gap-3">
                {theme === "light" ? (
                  <Sun className="w-5 h-5 text-[#6753FF]" />
                ) : (
                  <Moon className="w-5 h-5 text-[#6753FF]" />
                )}
                <div>
                  <p className="font-medium text-[#0B0D17]">Tema</p>
                  <p className="text-sm text-[#6C6F80]">
                    {theme === "light" ? "Modo claro" : "Modo escuro"}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleThemeToggle}
                variant="outline"
                className="border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-4 py-2 rounded-xl"
              >
                {theme === "light" ? "Escuro" : "Claro"}
              </Button>
            </div>

            {/* Notifications (placeholder - disabled) */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#6C6F80] uppercase tracking-wide">
                Notificações
              </p>
              <div className="flex items-start gap-3 opacity-50">
                <Checkbox disabled checked={false} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#2E2F38]">
                    Novidades e atualizações
                  </p>
                  <p className="text-xs text-[#6C6F80]">
                    Receber emails sobre novas funcionalidades
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 opacity-50">
                <Checkbox disabled checked={false} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[#2E2F38]">
                    Atividade na comunidade
                  </p>
                  <p className="text-xs text-[#6C6F80]">
                    Notificações sobre interações com os seus recursos
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#6C6F80] italic">
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
        <div className="h-10 bg-gray-200 rounded-lg w-48 mb-2" />
        <div className="h-6 bg-gray-200 rounded-lg w-80" />
      </div>
      <div className="space-y-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7] h-48" />
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7] h-64" />
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7] h-56" />
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

