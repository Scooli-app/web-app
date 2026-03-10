"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentSuccessModal } from "@/components/ui/payment-success-modal";
import { fetchSubscription, fetchUsage } from "@/store/subscription/subscriptionSlice";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import posthog from "posthog-js";

import type { AppDispatch } from "@/store/store";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (paymentParam === "success") {
      setShowPaymentSuccess(true);
      posthog.capture("payment_success");
      dispatch(fetchSubscription());
      dispatch(fetchUsage());

      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams, dispatch]);

  return (
    <PageContainer size="7xl" contentClassName="py-1 sm:py-2">
      <PaymentSuccessModal
        open={showPaymentSuccess}
        onOpenChange={setShowPaymentSuccess}
      />

      <PageHeader
        title="Bem-vindo à Scooli!"
        description="Aqui está o que pode fazer hoje na Scooli."
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-md sm:p-8">
          <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl">
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => {
                posthog.capture("dashboard_quick_action_clicked", { action: "lesson_plan" });
                router.push("/lesson-plan");
              }}
              className="w-full rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Criar Plano de Aula
            </button>
            <button
              onClick={() => {
                posthog.capture("dashboard_quick_action_clicked", { action: "test" });
                router.push("/test");
              }}
              className="w-full rounded-xl border border-border bg-background px-5 py-3 font-medium text-foreground transition-colors hover:bg-accent"
            >
              Gerar Teste
            </button>
            <button
              onClick={() => {
                posthog.capture("dashboard_quick_action_clicked", { action: "quiz" });
                router.push("/quiz");
              }}
              className="w-full rounded-xl border border-border bg-background px-5 py-3 font-medium text-foreground transition-colors hover:bg-accent"
            >
              Criar Quiz
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-md sm:p-8">
          <h2 className="mb-4 text-xl font-semibold text-foreground sm:text-2xl">
            Atividade Recente
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-foreground">Bem-vindo à Scooli!</span>
            </div>
            <p className="pl-5 text-sm text-muted-foreground">
              Comece por explorar as funcionalidades.
            </p>
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
        <div className="mb-2 h-9 w-56 rounded-lg bg-muted sm:h-10 sm:w-64" />
        <div className="h-5 w-full max-w-md rounded-lg bg-muted sm:h-6" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <div className="h-56 rounded-2xl border border-border bg-card p-5 shadow-md sm:h-64 sm:p-8" />
        <div className="h-56 rounded-2xl border border-border bg-card p-5 shadow-md sm:h-64 sm:p-8" />
      </div>
    </PageContainer>
  );
}
