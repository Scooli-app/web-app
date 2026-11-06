import { MAX_LENGTHS } from "@/shared/config/constants";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import type { FormUpdateFn } from "../types";
import { OptionRow } from "./FormCard";

interface AdditionalDetailsSectionProps {
  additionalDetails?: string;
  onUpdate: FormUpdateFn;
}

export function AdditionalDetailsSection({ additionalDetails, onUpdate }: AdditionalDetailsSectionProps) {
  const t = useTranslations("documentCreation.additionalDetails");

  return (
    <OptionRow label={t("title")}>
      <Textarea
        value={additionalDetails}
        maxLength={MAX_LENGTHS.ADDITIONAL_DETAILS}
        onChange={(e) => onUpdate("additionalDetails", e.target.value)}
        placeholder={t("placeholder")}
        rows={2}
        className="min-h-0 rounded-lg px-3 py-2 text-sm"
        aria-label={t("ariaLabel")}
      />
    </OptionRow>
  );
}
