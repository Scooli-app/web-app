import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { Button } from "@/components/ui/button";
import { GenerationCostHint } from "@/components/ui/generation-cost-hint";
import { selectEntitlementUsage } from "@/store/entitlements/selectors";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setUpgradeModalOpen } from "@/store/ui/uiSlice";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { MissingField } from "../missingField";
import { typeNameInSentence } from "../typeNameInSentence";
import type { DocumentTypeConfig } from "../types";

interface FormActionsProps {
  documentType: DocumentTypeConfig;
  isLoading: boolean;
  isFormValid: boolean;
  error: string;
  onSubmit: () => void;
  showGenerationHint?: boolean;
  /** First required field still empty; shown under the disabled button. */
  missingField?: MissingField | null;
  /** The teacher has no templates for this type, so the missing one has to be created. */
  noTemplates?: boolean;
}

export function FormActions({
  documentType,
  isLoading,
  isFormValid,
  error,
  onSubmit,
  showGenerationHint = false,
  missingField = null,
  noTemplates = false,
}: FormActionsProps) {
  const t = useTranslations("documentCreation");
  const tEnums = useTranslations("enums");
  const tUpgrade = useTranslations("nav.generations");
  const dispatch = useAppDispatch();
  const usage = useAppSelector(selectEntitlementUsage);
  // Only free users see the cost hint, so the same flag says whose credits can run out.
  const outOfCredits = showGenerationHint && usage?.remaining === 0;
  const locale = useLocale();
  const typeLabel = typeNameInSentence(tEnums(`documentType.${documentType.id}`), locale);

  return (
    <>
      {error && (
        <div className="p-3 sm:p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm sm:text-base text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
          {error}
        </div>
      )}

      <div className="-mx-1 space-y-1.5 bg-slate-50 px-1 pb-2 pt-2 dark:bg-background">
        <Button
          onClick={onSubmit}
          disabled={isLoading || !isFormValid || outOfCredits}
          className="w-full h-11 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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
        {outOfCredits ? (
          <div className="flex flex-col items-center gap-2 pt-1" aria-live="polite">
            <p className="text-center text-sm font-medium text-muted-foreground">{t("outOfCredits")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => dispatch(setUpgradeModalOpen(true))}>
              <Sparkles className="mr-1.5 h-4 w-4" />
              {tUpgrade("upgradeToPro")}
            </Button>
          </div>
        ) : missingField && !isLoading ? (
          <p className="text-center text-sm font-medium text-muted-foreground" aria-live="polite">
            {t("missing.prefix")}{" "}
            {missingField === "template" && noTemplates ? t("missing.templateNone") : t(`missing.${missingField}`)}
          </p>
        ) : (
          <AiDisclaimer />
        )}
      </div>
    </>
  );
}


