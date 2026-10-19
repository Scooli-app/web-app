import type { TeachingMethod } from "@/shared/types";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";
import { TEACHING_METHODS } from "../constants";
import type { FormUpdateFn } from "../types";
import { OptionRow } from "./FormCard";

interface TeachingMethodSectionProps {
  teachingMethod?: TeachingMethod;
  onUpdate: FormUpdateFn;
}

/** One row of small chips (click again to clear); the chosen method's explanation shows under them. */
export function TeachingMethodSection({ teachingMethod, onUpdate }: TeachingMethodSectionProps) {
  const t = useTranslations("documentCreation.teachingMethod");
  const tMethods = useTranslations("documentCreation.teachingMethods");

  return (
    <OptionRow label={t("title")}>
      <div className="flex flex-wrap gap-1.5">
        {TEACHING_METHODS.map((method) => {
          const isSelected = teachingMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onUpdate("teachingMethod", isSelected ? undefined : (method.id as TeachingMethod))}
              aria-pressed={isSelected}
              title={tMethods(`${method.id}.description`)}
              aria-label={t("selectAriaLabel", { label: tMethods(`${method.id}.label`) })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary hover:bg-accent",
              )}
            >
              {tMethods(`${method.id}.label`)}
            </button>
          );
        })}
      </div>
      {teachingMethod && (
        <p className="mt-1.5 text-xs text-muted-foreground">{tMethods(`${teachingMethod}.description`)}</p>
      )}
    </OptionRow>
  );
}
