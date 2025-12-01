import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Layers, Plus } from "lucide-react";

interface TemplateEmptyStateProps {
  onCreateTemplate: () => void;
}

export function TemplateEmptyState({
  onCreateTemplate,
}: TemplateEmptyStateProps) {
  return (
    <Card className="p-4 sm:p-6 border-[#E4E4E7] shadow-sm">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
              Modelo de Documento <span className="text-red-500">*</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6C6F80]">
              Escolha a estrutura do seu documento
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl border-2 border-dashed border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#EEF0FF] mb-3">
            <FileText className="w-6 h-6 text-[#6753FF]" />
          </div>
          <h3 className="text-sm font-medium text-[#0B0D17] mb-1">
            Nenhum modelo disponível
          </h3>
          <p className="text-xs text-[#6C6F80] text-center mb-4 max-w-[280px]">
            Crie o seu primeiro modelo para definir a estrutura dos seus
            documentos
          </p>
          <Button
            type="button"
            onClick={onCreateTemplate}
            className="bg-[#6753FF] hover:bg-[#5642E8] text-white rounded-xl h-10 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Modelo
          </Button>
        </div>
      </div>
    </Card>
  );
}

