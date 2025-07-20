import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Home, Mail } from "lucide-react";
import Link from "next/link";

export default function AccountDisabledPage() {
  return (
    <div className="min-h-screen bg-[#EEF0FF] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Card className="bg-white p-8 rounded-2xl shadow-md border border-[#E4E4E7]">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#FF4F4F] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#0B0D17] mb-2">
              Conta Desativada
            </h1>
            <p className="text-lg text-[#6C6F80]">
              A sua conta foi temporariamente desativada
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4 mb-8">
            <div className="bg-[#FFECEC] border border-[#FF4F4F] rounded-xl p-4">
              <p className="text-sm text-[#2E2F38]">
                <strong>Estado da conta:</strong> Inativa
              </p>
            </div>

            <div className="text-center">
              <p className="text-base text-[#2E2F38] mb-4">
                A sua conta Scooli foi desativada. Isto pode acontecer por:
              </p>

              <ul className="text-left text-sm text-[#6C6F80] space-y-2 mb-4">
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#6C6F80] rounded-full mt-2 flex-shrink-0" />
                  <span>Violação dos termos de utilização</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#6C6F80] rounded-full mt-2 flex-shrink-0" />
                  <span>Atividade suspeita na conta</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#6C6F80] rounded-full mt-2 flex-shrink-0" />
                  <span>Solicitação de desativação temporária</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-1.5 h-1.5 bg-[#6C6F80] rounded-full mt-2 flex-shrink-0" />
                  <span>Problema com o pagamento da subscrição</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-[#EEF0FF] border border-[#6753FF] rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-[#6753FF] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-[#0B0D17] mb-1">
                  Precisa de ajuda?
                </h3>
                <p className="text-sm text-[#2E2F38] mb-2">
                  Entre em contacto connosco para reativar a sua conta.
                </p>
                <p className="text-sm font-medium text-[#6753FF]">
                  suporte@scooli.app
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-[#6753FF] hover:bg-[#4E3BC0] text-white px-5 py-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-[#6753FF]"
            >
              <a href="mailto:suporte@scooli.app?subject=Reativação de Conta">
                <Mail className="h-4 w-4 mr-2" />
                Contactar Suporte
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full border border-[#C7C9D9] text-[#0B0D17] bg-white hover:bg-[#EEF0FF] px-5 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6753FF]"
            >
              <Link href="/login">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Login
              </Link>
            </Button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#E4E4E7]">
            <p className="text-xs text-[#6C6F80] text-center">
              Se acredita que isto é um erro, por favor contacte-nos
              imediatamente.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
