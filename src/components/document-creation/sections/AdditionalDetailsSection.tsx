import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import type { FormUpdateFn } from "../types";

interface AdditionalDetailsSectionProps {
  additionalDetails?: string;
  onUpdate: FormUpdateFn;
}

export function AdditionalDetailsSection({
  additionalDetails,
  onUpdate,
}: AdditionalDetailsSectionProps) {
  return (
    <Card className="p-4 sm:p-6 md:p-8 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
              Detalhes Adicionais{" "}
              <span className="text-xs sm:text-sm font-normal text-[#6C6F80]">
                (Opcional)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6C6F80]">
              Adicione informações extras para personalizar o conteúdo
            </p>
          </div>
        </div>
        <textarea
          value={additionalDetails}
          onChange={(e) => onUpdate("additionalDetails", e.target.value)}
          placeholder="Ex: Incluir atividade de grupo, usar exemplos do dia-a-dia, focar em alunos com dificuldades..."
          rows={3}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base md:text-sm bg-[#F4F5F8] border border-[#C7C9D9] rounded-xl placeholder:text-[#6C6F80] resize-none focus:outline-none focus:border-[#6753FF] focus:ring-2 focus:ring-[#6753FF]/20 transition-all placeholder:text-sm"
          aria-label="Detalhes adicionais"
        />
      </div>
    </Card>
  );
}

