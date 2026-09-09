import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FormUpdateFn } from "../types";

interface AdditionalDetailsSectionProps {
  additionalDetails?: string;
  onUpdate: FormUpdateFn;
}

export function AdditionalDetailsSection({
  additionalDetails,
  onUpdate,
}: AdditionalDetailsSectionProps) {
  const t = useTranslations("documentCreation.additionalDetails");

  return (
    <Card className="p-4 sm:p-6 md:p-8 border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {t("title")}{" "}
              <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                {t("optional")}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
        <Textarea
          value={additionalDetails}
          onChange={(e) => onUpdate("additionalDetails", e.target.value)}
          placeholder={t("placeholder")}
          rows={3}
          className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base md:text-sm bg-muted border-border rounded-xl placeholder:text-muted-foreground placeholder:text-sm min-h-0"
          aria-label={t("ariaLabel")}
        />
      </div>
    </Card>
  );
}
