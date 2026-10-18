import { MAX_LENGTHS } from "@/shared/config/constants";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import type { FormUpdateFn } from "../types";
import { FieldHeading, FormCard } from "./FormCard";

interface TopicSectionProps {
  topic: string;
  placeholder: string;
  onUpdate: FormUpdateFn;
}

export function TopicSection({
  topic,
  placeholder,
  onUpdate,
}: TopicSectionProps) {
  const t = useTranslations("documentCreation.topic");

  return (
    // Label beside the field, like "Para que aula?": a one-line answer doesn't need a card of its own height.
    <FormCard>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 sm:w-44 sm:shrink-0">
          <FieldHeading title={t("title")} required className="mb-0" />
        </div>
        <Input
          value={topic}
          maxLength={MAX_LENGTHS.DOCUMENT_PROMPT}
          onChange={(e) => onUpdate("topic", e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border-border bg-muted px-3 text-sm placeholder:text-muted-foreground"
          aria-label={t("ariaLabel")}
        />
      </div>
    </FormCard>
  );
}
