"use client";

import { QuickCreateCard } from "@/components/dashboard/QuickCreateCard";
import { RecentDocumentsCard } from "@/components/dashboard/RecentDocumentsCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentSuccessModal } from "@/components/ui/payment-success-modal";
import { CalendarDashboardWidget } from "@/components/calendar/CalendarDashboardWidget";
import {
  selectIsWorksheetCreationEnabled,
  selectIsHorarioPlanosEnabled,
  selectIsPresentationCreationEnabled,
  selectIsCurriculumPlanEnabled,
} from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { Routes } from "@/shared/types";
import {
  FileText,
  HelpCircle,
  NotebookPen,
  ScrollText,
  MonitorPlay,
  GanttChart,
  type LucideIcon,
} from "lucide-react";
import { fetchEntitlements } from "@/store/entitlements/entitlementsSlice";
import { fetchSubscription, fetchUsage } from "@/store/subscription/subscriptionSlice";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import posthog from "posthog-js";

import type { AppDispatch } from "@/store/store";

interface DocTypeAction {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
  gate?: "worksheet" | "presentation" | "curriculumPlan";
}

const DOC_TYPE_ACTIONS: DocTypeAction[] = [
  { id: "lessonPlan",     label: "Plano de Aula",     route: Routes.LESSON_PLAN,     icon: FileText },
  { id: "test",          label: "Teste",              route: Routes.TEST,            icon: NotebookPen },
  { id: "worksheet",     label: "Ficha de Trabalho",  route: Routes.WORKSHEET,       icon: ScrollText,  gate: "worksheet" },
  { id: "quiz",          label: "Quiz",               route: Routes.QUIZ,            icon: HelpCircle },
  { id: "presentation",  label: "Apresentação",       route: Routes.PRESENTATION,    icon: MonitorPlay, gate: "presentation" },
  { id: "curriculumPlan",label: "Planificação",       route: Routes.CURRICULUM_PLAN, icon: GanttChart,  gate: "curriculumPlan" },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const isWorksheetCreationEnabled = useAppSelector(selectIsWorksheetCreationEnabled);
  const isPresentationCreationEnabled = useAppSelector(selectIsPresentationCreationEnabled);
  const isCurriculumPlanEnabled = useAppSelector(selectIsCurriculumPlanEnabled);
  const isHorarioPlanosEnabled = useAppSelector(selectIsHorarioPlanosEnabled);

  const dispatch = useDispatch<AppDispatch>();

  const visibleActions = useMemo(
    () =>
      DOC_TYPE_ACTIONS.filter((action) => {
        if (action.gate === "worksheet") return isWorksheetCreationEnabled;
        if (action.gate === "presentation") return isPresentationCreationEnabled;
        if (action.gate === "curriculumPlan") return isCurriculumPlanEnabled;
        return true;
      }),
    [isWorksheetCreationEnabled, isPresentationCreationEnabled, isCurriculumPlanEnabled]
  );

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
      });

      dispatch(fetchSubscription());
      dispatch(fetchUsage());
      dispatch(fetchEntitlements());

      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, dispatch]);

  return (
    <PageContainer size="7xl" className="h-full" contentClassName="flex h-full flex-col py-1 sm:py-2">
      <PaymentSuccessModal
        open={showPaymentSuccess}
        onOpenChange={setShowPaymentSuccess}
      />

      <PageHeader
        title="Bem-vindo à Scooli!"
        description="Aqui está o que pode fazer hoje na Scooli."
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        {isHorarioPlanosEnabled && (
          <div className="shrink-0">
            <CalendarDashboardWidget />
          </div>
        )}

        <div className="shrink-0">
          <QuickCreateCard isWorksheetCreationEnabled={isWorksheetCreationEnabled} />
        </div>

        {/* Bottom row — fills remaining height on md+; natural height on mobile */}
        <div className="flex flex-col gap-3 sm:gap-4 md:min-h-[160px] md:flex-1 md:flex-row">
          {/* Doc-type grid */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 md:min-h-0 md:flex-1 md:overflow-y-auto">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Criar documento
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {visibleActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      posthog.capture("dashboard_quick_action_clicked", { action: action.id });
                      router.push(action.route);
                    }}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium leading-tight text-foreground">
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent documents */}
          <RecentDocumentsCard className="md:min-h-0 md:flex-1 md:overflow-y-auto" />
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
