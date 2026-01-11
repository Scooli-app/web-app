"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaymentSuccessModal } from "@/components/ui/payment-success-modal";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    const paymentParam = searchParams.get("payment");
    if (paymentParam === "success") {
      setShowPaymentSuccess(true);
      // Clean URL without reload
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PaymentSuccessModal
        open={showPaymentSuccess}
        onOpenChange={setShowPaymentSuccess}
      />

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Bem-vindo à Scooli!
        </h1>
        <p className="text-lg text-muted-foreground">
          Aqui está o que pode fazer hoje na Scooli.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/lesson-plan")}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Criar Plano de Aula
            </button>
            <button
              onClick={() => router.push("/test")}
              className="w-full border border-border text-foreground bg-background hover:bg-accent px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Gerar Teste
            </button>
            <button
              onClick={() => router.push("/quiz")}
              className="w-full border border-border text-foreground bg-background hover:bg-accent px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Criar Quiz
            </button>
          </div>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-md border border-border">
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            Atividade Recente
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span className="text-foreground">Bem-vindo à Scooli!</span>
            </div>
            <p className="text-sm text-muted-foreground pl-5">
              Comece por explorar as funcionalidades.
            </p>
          </div>
        </div>
      </div>
    </div>
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
    <div className="w-full max-w-7xl mx-auto animate-pulse">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-64 mb-2" />
        <div className="h-6 bg-muted rounded-lg w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border h-64" />
        <div className="bg-card p-8 rounded-2xl shadow-md border border-border h-64" />
      </div>
    </div>
  );
}
