import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/utils";
import { Compass, Pencil, Search, TrendingUp } from "lucide-react";
import type { WorksheetVariant } from "@/shared/types";

interface WorksheetVariantSectionProps {
  worksheetVariant?: WorksheetVariant;
  onVariantChange: (worksheetVariant: WorksheetVariant) => void;
}

const VARIANT_OPTIONS: Array<{
  value: Exclude<WorksheetVariant, "assessment">;
  label: string;
  description: string;
  icon: typeof Pencil;
}> = [
  {
    value: "practice",
    label: "Treinar e consolidar",
    description:
      "Ficha com exercícios progressivos para praticar e reforçar aprendizagens.",
    icon: Pencil,
  },
  {
    value: "diagnostic",
    label: "Diagnosticar conhecimentos",
    description:
      "Ajuda a perceber o ponto de partida, lacunas e erros frequentes antes do tema.",
    icon: Search,
  },
  {
    value: "formative",
    label: "Acompanhar aprendizagem",
    description:
      "Apoia monitorização, autoavaliação e próximos passos ao longo do trabalho.",
    icon: TrendingUp,
  },
  {
    value: "exploration",
    label: "Introduzir novo conteúdo",
    description:
      "Usa estímulos e perguntas guiadas para explorar ideias antes da prática formal.",
    icon: Compass,
  },
];

export function WorksheetVariantSection({
  worksheetVariant,
  onVariantChange,
}: WorksheetVariantSectionProps) {
  return (
    <Card className="border-border p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6 md:p-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent sm:h-10 sm:w-10 sm:rounded-xl">
            <Compass className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Objetivo da Ficha <span className="text-destructive">*</span>
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Escolha a finalidade principal da ficha de trabalho
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VARIANT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = worksheetVariant === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onVariantChange(option.value)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/40"
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground sm:text-base">
                      {option.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
