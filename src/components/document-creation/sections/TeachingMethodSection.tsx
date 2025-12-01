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
    <Card className="p-4 sm:p-6 md:p-8 border-[#E4E4E7] shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#EEF0FF] shrink-0">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-[#6753FF]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-[#0B0D17]">
              Metodologia de Ensino{" "}
              <span className="text-xs sm:text-sm font-normal text-[#6C6F80]">
                (Opcional)
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-[#6C6F80]">
              Escolha a abordagem pedagógica preferida
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
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
                  "relative flex sm:flex-col items-start sm:items-stretch p-3 sm:p-4 rounded-xl sm:rounded-2xl text-left transition-all",
                  "border-2 hover:scale-[1.01] active:scale-[0.99]",
                  isSelected
                    ? `${method.bgColor} ${method.borderColor} shadow-md`
                    : "bg-white border-[#E4E4E7] hover:border-[#C7C9D9] hover:bg-[#FAFAFA]"
                )}
                aria-pressed={isSelected}
                aria-label={`Selecionar ${method.label}`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                    <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#6753FF]">
                      <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl mr-3 sm:mr-0 sm:mb-3 shrink-0",
                    isSelected ? method.iconBg : "bg-[#F4F5F8]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6",
                      isSelected ? "text-[#6753FF]" : "text-[#6C6F80]"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0 pr-6 sm:pr-0">
                  <h3
                    className={cn(
                      "font-semibold text-sm sm:text-base mb-0.5 sm:mb-1",
                      isSelected ? "text-[#0B0D17]" : "text-[#2E2F38]"
                    )}
                  >
                    {method.label}
                  </h3>
                  <p
                    className={cn(
                      "text-[11px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-none",
                      isSelected ? "text-[#2E2F38]" : "text-[#6C6F80]"
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

