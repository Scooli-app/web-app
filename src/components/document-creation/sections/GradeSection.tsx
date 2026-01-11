import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/utils";
import { GraduationCap } from "lucide-react";
import { GRADE_GROUPS } from "../constants";
import type { FormUpdateFn } from "../types";

interface GradeSectionProps {
  schoolYear: number;
  onUpdate: FormUpdateFn;
}

export function GradeSection({ schoolYear, onUpdate }: GradeSectionProps) {
  return (
    <Card className="p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Ano de Escolaridade <span className="text-destructive">*</span>
          </h2>
        </div>
        <div className="space-y-2.5 sm:space-y-3">
          {GRADE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 sm:mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {group.grades.map((grade) => {
                  const gradeValue = parseInt(grade.id);
                  const isSelected = schoolYear === gradeValue;
                  return (
                    <button
                      key={grade.id}
                      type="button"
                      onClick={() =>
                        onUpdate("schoolYear", isSelected ? 0 : gradeValue)
                      }
                      className={cn(
                        "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all",
                        "border hover:scale-[1.02] active:scale-[0.98]",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-card text-foreground border-border hover:border-primary hover:bg-accent"
                      )}
                      aria-pressed={isSelected}
                      aria-label={`Selecionar ${grade.label}`}
                    >
                      {grade.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
