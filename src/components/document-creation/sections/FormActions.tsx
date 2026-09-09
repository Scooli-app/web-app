import { Button } from "@/components/ui/button";
import { GenerationCostHint } from "@/components/ui/generation-cost-hint";
import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentTypeConfig } from "../types";

interface FormActionsProps {
  documentType: DocumentTypeConfig;
  isLoading: boolean;
  isFormValid: boolean;
  error: string;
  onSubmit: () => void;
  showGenerationHint?: boolean;
}

export function FormActions({
  documentType,
  isLoading,
  isFormValid,
  error,
  onSubmit,
  showGenerationHint = false,
}: FormActionsProps) {
  const t = useTranslations("documentCreation");
  const tEnums = useTranslations("enums");
  const typeLabel = tEnums(`documentType.${documentType.id}`);

  return (
    <>
      {error && (
        <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm sm:text-base text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
          {error}
        </div>
      )}

      <div className="pt-2 sm:pt-4 pb-4 sm:pb-4 space-y-3">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !isFormValid}
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          aria-label={`${t("createPrefix")} ${typeLabel}`}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="hidden sm:inline">{t("creatingDocumentLong")}</span>
              <span className="sm:hidden">{t("creatingDocumentShort")}</span>
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              {t("createPrefix")} {typeLabel}
              {showGenerationHint && (
                <GenerationCostHint
                  compact
                  className="ml-2 border-primary-foreground/35 bg-primary-foreground/15 text-primary-foreground"
                />
              )}
            </>
          )}
        </Button>
        <p className="text-center text-[11px] leading-4 text-muted-foreground/70">
          {t("aiDisclaimer")}
        </p>
        <p className="text-center text-xs sm:text-sm text-muted-foreground">
          <span className="text-destructive">*</span> {t("requiredFields")}
        </p>
      </div>
    </>
  );
}


