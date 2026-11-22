"use client";

import type { SchoolSourceType } from "@/shared/types/sources";
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";

const TYPES: SchoolSourceType[] = ["regra", "apoio"];

interface SourceTypeCardsProps {
  value: SchoolSourceType;
  onChange: (value: SchoolSourceType) => void;
}

/** Two selectable cards: the label is the click target and the only focusable control is its radio. */
export function SourceTypeCards({ value, onChange }: SourceTypeCardsProps) {
  const t = useTranslations("schoolSources.type");
  return (
    <div role="radiogroup" aria-label={t("label")} className="grid gap-2 sm:grid-cols-2">
      {TYPES.map((type) => (
        <label
          key={type}
          className={cn(
            "flex cursor-pointer flex-col gap-1 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/60",
            "has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-[3px]",
            value === type ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <input
            type="radio"
            name="schoolSourceType"
            value={type}
            checked={value === type}
            onChange={() => onChange(type)}
            className="sr-only"
          />
          <span className="text-sm font-medium">{t(`${type}.title`)}</span>
          <span className="text-sm text-muted-foreground">{t(`${type}.hint`)}</span>
        </label>
      ))}
    </div>
  );
}
