import { Card } from "@/components/ui/card";
import type { TeachingMethod } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { Brain, Check } from "lucide-react";
import { TEACHING_METHODS } from "../constants";
import type { FormUpdateFn } from "../types";

interface TeachingMethodSectionProps {
  teachingMethod?: TeachingMethod;
  onUpdate: FormUpdateFn;
}

export function TeachingMethodSection({
  teachingMethod,
  onUpdate,
}: TeachingMethodSectionProps) {
  return (
    <Card className="p-4 sm:p-6 md:p-8 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Metodologia de Ensino{" "}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                (Opcional)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Escolha a abordagem pedagógica preferida
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {TEACHING_METHODS.map((method) => {
            const Icon = method.icon;
            const isSelected = teachingMethod === method.id;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() =>
                  onUpdate(
                    "teachingMethod",
                    teachingMethod === method.id
                      ? undefined
                      : (method.id as TeachingMethod)
                  )
                }
                className={cn(
                  "relative flex items-center p-3 rounded-lg text-left transition-all h-full",
                  "border-2 hover:scale-[1.01] active:scale-[0.99]",
                  isSelected
                    ? "bg-accent border-primary shadow-sm"
                    : "bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/50"
                )}
                aria-pressed={isSelected}
                aria-label={`Selecionar ${method.label}`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/20">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg mr-3 shrink-0",
                    isSelected ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h3
                    className={cn(
                      "font-semibold text-sm leading-tight mb-0.5",
                      isSelected ? "text-foreground" : "text-foreground"
                    )}
                  >
                    {method.label}
                  </h3>
                  <p
                    className={cn(
                      "text-[11px] leading-tight line-clamp-2",
                      isSelected ? "text-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {method.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
