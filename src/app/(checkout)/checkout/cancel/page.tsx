"use client";

import { useRouter } from "next/navigation";
import {
  Heart,
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Gift,
  Shield,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#F4F5F8] rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-[#6C6F80]" />
          </div>

          <h1 className="text-3xl font-bold text-[#0B0D17] mb-3">
            Lamentamos vê-lo partir...
          </h1>
          <p className="text-lg text-[#6C6F80]">
            O processo de pagamento foi cancelado e não foi efetuada nenhuma
            cobrança.
          </p>
        </div>

        {/* Value proposition reminder */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-[#E4E4E7] mb-6">
          <h2 className="text-lg font-semibold text-[#0B0D17] mb-4">
            O que está a perder:
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-[#6753FF]" />
              </div>
              <div>
                <span className="text-[#0B0D17] font-medium">
                  Gerações ilimitadas
                </span>
                <p className="text-sm text-[#6C6F80]">
                  Crie quantos documentos precisar, sem limites
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-[#6753FF]" />
              </div>
              <div>
                <span className="text-[#0B0D17] font-medium">
                  Poupe horas de trabalho
                </span>
                <p className="text-sm text-[#6C6F80]">
                  Professores Pro poupam em média 5h por semana
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#EEF0FF] flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-[#6753FF]" />
              </div>
              <div>
                <span className="text-[#0B0D17] font-medium">
                  Cancele a qualquer momento
                </span>
                <p className="text-sm text-[#6C6F80]">
                  Sem compromisso, pode cancelar quando quiser
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button
            onClick={() => router.push("/checkout")}
            className="w-full bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-6 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            Quero experimentar o Pro
          </button>

          <Link
            href="/dashboard"
            className="w-full border border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar com o plano gratuito
          </Link>
        </div>

        {/* Help section */}
        <div className="bg-[#F4F5F8] p-5 rounded-xl">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#6753FF] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[#0B0D17] font-medium mb-1">
                Teve algum problema?
              </h3>
              <p className="text-sm text-[#6C6F80] mb-2">
                Se encontrou alguma dificuldade durante o pagamento ou tem
                dúvidas sobre os planos, estamos aqui para ajudar.
              </p>
              <a
                href="mailto:suporte@scooli.app"
                className="inline-flex items-center gap-2 text-[#6753FF] hover:text-[#4E3BC0] font-medium text-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                suporte@scooli.app
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
