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
    <Card className="border-border p-4 shadow-sm sm:p-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
            <Layers className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Modelo de Documento <span className="text-destructive">*</span>
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Escolha a estrutura do seu documento
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mb-1 text-sm font-medium text-foreground">
            Nenhum modelo disponível
          </h3>
          <p className="mb-4 max-w-[280px] text-center text-xs text-muted-foreground">
            Crie o seu primeiro modelo para definir a estrutura dos seus
            documentos
          </p>
          <Button
            type="button"
            onClick={onCreateTemplate}
            className="h-10 rounded-xl bg-primary px-4 text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Modelo
          </Button>
        </div>
      </div>
    </Card>
  );
}
