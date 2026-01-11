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
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3">
            Lamentamos vê-lo partir...
          </h1>
          <p className="text-lg text-muted-foreground">
            O processo de pagamento foi cancelado e não foi efetuada nenhuma
            cobrança.
          </p>
        </div>

        {/* Value proposition reminder */}
        <div className="bg-card p-6 rounded-2xl shadow-md border border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            O que está a perder:
          </h2>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">
                  Gerações ilimitadas
                </span>
                <p className="text-sm text-muted-foreground">
                  Crie quantos documentos precisar, sem limites
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">
                  Poupe horas de trabalho
                </span>
                <p className="text-sm text-muted-foreground">
                  Professores Pro poupam em média 5h por semana
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="text-foreground font-medium">
                  Cancele a qualquer momento
                </span>
                <p className="text-sm text-muted-foreground">
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
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2"
          >
            Quero experimentar o Pro
          </button>

          <Link
            href="/dashboard"
            className="w-full border border-border text-foreground bg-background hover:bg-accent px-6 py-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar com o plano gratuito
          </Link>
        </div>

        {/* Help section */}
        <div className="bg-muted p-5 rounded-xl">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-foreground font-medium mb-1">
                Teve algum problema?
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                Se encontrou alguma dificuldade durante o pagamento ou tem
                dúvidas sobre os planos, estamos aqui para ajudar.
              </p>
              <a
                href="mailto:suporte@scooli.app"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
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
