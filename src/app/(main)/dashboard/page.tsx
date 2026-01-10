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
        <h1 className="text-4xl font-bold text-[#0B0D17] mb-2">
          Bem-vindo à Scooli!
        </h1>
        <p className="text-lg text-[#6C6F80]">
          Aqui está o que pode fazer hoje na Scooli.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h2 className="text-2xl font-semibold text-[#0B0D17] mb-4">
            Ações Rápidas
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/lesson-plan")}
              className="w-full bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Criar Plano de Aula
            </button>
            <button
              onClick={() => router.push("/test")}
              className="w-full border border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Gerar Teste
            </button>
            <button
              onClick={() => router.push("/quiz")}
              className="w-full border border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-5 py-3 rounded-xl font-medium transition-colors"
            >
              Criar Quiz
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          <h2 className="text-2xl font-semibold text-[#0B0D17] mb-4">
            Atividade Recente
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-[#6753FF] rounded-full" />
              <span className="text-[#2E2F38]">Bem-vindo à Scooli!</span>
            </div>
            <p className="text-sm text-[#6C6F80] pl-5">
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
        <div className="h-10 bg-gray-200 rounded-lg w-64 mb-2" />
        <div className="h-6 bg-gray-200 rounded-lg w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7] h-64" />
        <div className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7] h-64" />
      </div>
    </div>
  );
}
