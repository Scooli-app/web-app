"use client";

import { Badge } from "@/components/ui/badge";
import type { Document } from "@/shared/types";

interface DocumentFiltersProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  documentCounts?: Record<string, number>;
}

const filterOptions: Array<{
  value: Document["documentType"] | "all";
  label: string;
  icon: string;
}> = [
  { value: "all", label: "Todos", icon: "📁" },
  { value: "lessonPlan", label: "Planos de Aula", icon: "📄" },
  { value: "test", label: "Testes", icon: "📝" },
  { value: "quiz", label: "Quizzes", icon: "❓" },
  { value: "presentation", label: "Apresentações", icon: "🎯" },
];

export function DocumentFilters({
  selectedType,
  onTypeChange,
  documentCounts,
}: DocumentFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      {filterOptions.map((option) => {
        const isSelected = selectedType === option.value;
        const count = documentCounts?.[option.value] || 0;

        return (
          <button
            key={option.value}
            onClick={() => onTypeChange(option.value)}
            className={`
              inline-flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium
              transition-all duration-200 border whitespace-nowrap
              ${
                isSelected
                  ? "bg-[#6753FF] text-white border-[#6753FF] shadow-sm"
                  : "bg-white text-[#6C6F80] border-[#C7C9D9] hover:border-[#6753FF]/50 hover:text-[#6753FF]"
              }
            `}
          >
            <span className="text-sm sm:text-base">{option.icon}</span>
            <span>{option.label}</span>
            {documentCounts && option.value !== "all" && (
              <Badge
                className={`ml-1 px-2 py-0 text-xs ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[#F4F5F8] text-[#6C6F80]"
                }`}
              >
                {count}
              </Badge>
            )}
            {option.value === "all" && documentCounts && (
              <Badge
                className={`ml-1 px-2 py-0 text-xs ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[#F4F5F8] text-[#6C6F80]"
                }`}
              >
                {Object.values(documentCounts).reduce(
                  (sum, count) => sum + count,
                  0
                )}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
