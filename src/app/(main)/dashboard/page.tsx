"use client";

import { QuickCreateCard } from "@/components/dashboard/QuickCreateCard";
import { useVisibleDocTypeActions } from "@/components/document-creation/documentTypeActions";
import { LoadError } from "@/components/ui/load-error";
import { NextStepsCard } from "@/components/next-steps/NextStepsCard";
import { YourWeekCard } from "@/components/dashboard/YourWeekCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { PaymentSuccessModal } from "@/components/ui/payment-success-modal";
import { isPromoPlanCode } from "@/shared/utils/promo";
import { fetchEntitlements } from "@/store/entitlements/entitlementsSlice";
import {
  selectIsHorarioPlanosEnabled,
  selectIsWorksheetCreationEnabled,
} from "@/store/features/selectors";
import { fetchFeatureFlags } from "@/store/features/featuresSlice";
import { useAppSelector } from "@/store/hooks";
import {
  fetchSubscription,
  fetchUsage,
} from "@/store/subscription/subscriptionSlice";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect, useState } from "react";
import { useDispatch } from "react-redux";

import type { AppDispatch } from "@/store/store";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("dashboard");
  const tEnums = useTranslations("enums");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const isWorksheetCreationEnabled = useAppSelector(
    selectIsWorksheetCreationEnabled,
  );
  const isHorarioPlanosEnabled = useAppSelector(selectIsHorarioPlanosEnabled);
  const flagsFailed = useAppSelector(
    (state) => state.features.error !== null && Object.keys(state.features.flags).length === 0,
  );
  const visibleActions = useVisibleDocTypeActions();
  const { limits } = usePlanLimits();
  // limits is null while loading or after a failed fetch: only show examples once we know there are no classes.
  const showExamples = limits !== null && limits.activeClasses === 0;

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (paymentParam === "success") {
      setShowPaymentSuccess(true);

      let planCode: string | null = null;
      let planInterval: string | null = null;
      let priceCents: number | null = null;
      try {
        planCode = sessionStorage.getItem("scooli_pending_plan");
        planInterval = sessionStorage.getItem("scooli_pending_plan_interval");
        const priceRaw = sessionStorage.getItem("scooli_pending_plan_price");
        priceCents = priceRaw ? Number(priceRaw) : null;
        sessionStorage.removeItem("scooli_pending_plan");
        sessionStorage.removeItem("scooli_pending_plan_interval");
        sessionStorage.removeItem("scooli_pending_plan_price");
      } catch {
        // sessionStorage unavailable — non-fatal
      }

      posthog.capture("payment_success", {
        plan_code: planCode,
        plan_interval: planInterval,
        price_cents: priceCents,
        is_promo: isPromoPlanCode(planCode),
      });

      dispatch(fetchSubscription());
      dispatch(fetchUsage());
      dispatch(fetchEntitlements());

      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, dispatch]);

  return (
    <PageContainer
      size="7xl"
      className="h-full"
      contentClassName="flex h-full flex-col py-1 sm:py-2"
    >
      <PaymentSuccessModal
        open={showPaymentSuccess}
        onOpenChange={setShowPaymentSuccess}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        {flagsFailed && (
          <LoadError onRetry={() => void dispatch(fetchFeatureFlags())} />
        )}

        {isHorarioPlanosEnabled && (
          <div className="shrink-0 space-y-3">
            <YourWeekCard />
            <NextStepsCard />
          </div>
        )}

        <div className="shrink-0 space-y-2">
          <QuickCreateCard
            isWorksheetCreationEnabled={isWorksheetCreationEnabled}
            showExamples={showExamples}
          />
          {/* Start a blank document of a given type: one row (sideways on a phone), no card. */}
          {/* On a short phone screen this row (the menu's "+ Criar" does the same) gives way. */}
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] max-sm:[@media(max-height:720px)]:hidden">
            <span className="mr-1 shrink-0 text-sm text-muted-foreground">{t("createDocument")}</span>
            {visibleActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    posthog.capture("dashboard_quick_action_clicked", {
                      action: action.id,
                    });
                    router.push(action.route);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {tEnums(`documentType.${action.id}`)}
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </PageContainer>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <PageContainer size="7xl" contentClassName="animate-pulse py-1 sm:py-2">
      <div className="mb-6 sm:mb-8">
        <div className="mb-2 h-8 w-48 rounded-lg bg-muted" />
        <div className="h-4 w-72 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <div className="md:col-span-2 h-20 rounded-2xl border border-border bg-card shadow-sm" />
        <div className="h-48 rounded-2xl border border-border bg-card shadow-sm" />
        <div className="h-48 rounded-2xl border border-border bg-card shadow-sm" />
      </div>
    </PageContainer>
  );
}
