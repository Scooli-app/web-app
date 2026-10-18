import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";
import type { WorksheetVariant } from "@/shared/types";
import { FieldHeading, FormCard } from "./FormCard";

interface WorksheetVariantSectionProps {
  worksheetVariant?: WorksheetVariant;
  onVariantChange: (worksheetVariant: WorksheetVariant) => void;
}

const VARIANT_OPTIONS: Array<Exclude<WorksheetVariant, "assessment">> = [
  "practice",
  "diagnostic",
  "formative",
  "exploration",
];

/** The worksheet's purpose as one row of buttons; only the chosen one's explanation is shown. */
export function WorksheetVariantSection({ worksheetVariant, onVariantChange }: WorksheetVariantSectionProps) {
  const t = useTranslations("documentCreation.worksheetVariant");
  const tVariants = useTranslations("documentCreation.worksheetVariants");

  return (
    <FormCard>
      <FieldHeading title={t("title")} required />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label={t("title")}>
        {VARIANT_OPTIONS.map((value) => {
          const isSelected = worksheetVariant === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onVariantChange(value)}
              title={`${tVariants(`${value}.label`)}: ${tVariants(`${value}.description`)}`}
              className={cn(
                "truncate rounded-lg border px-2 py-1.5 text-center text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              {/* Short on the button; the full name and what it does are spelled out below. */}
              {tVariants(`${value}.short`)}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 truncate text-xs text-muted-foreground">
        {worksheetVariant && worksheetVariant !== "assessment" ? (
          <>
            <span className="font-medium text-foreground">{tVariants(`${worksheetVariant}.label`)}:</span>{" "}
            {tVariants(`${worksheetVariant}.description`)}
          </>
        ) : (
          t("description")
        )}
      </p>
    </FormCard>
  );
}
