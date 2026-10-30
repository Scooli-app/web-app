/**
 * Slide-count picker for the Presentations creation form (SCOOL-135), as one row of "Mais opções".
 * Optional: without a pick the backend sizes the deck from the lesson duration.
 *
 * Only rendered when {@code documentType.id === "presentation"} (the caller guards rendering).
 */
import { cn } from "@/shared/utils/utils";
import { useTranslations } from "next-intl";
import type { FormUpdateFn } from "../types";
import { OptionRow } from "./FormCard";

/** Presets shown as preset buttons. Matches typical classroom decks. */
const SLIDE_COUNT_PRESETS = [5, 8, 10, 12, 15, 20] as const;

interface SlideCountSectionProps {
  slideCount?: number;
  onUpdate: FormUpdateFn;
}

export function SlideCountSection({ slideCount, onUpdate }: SlideCountSectionProps) {
  const t = useTranslations("documentCreation.slideCount");

  return (
    <OptionRow label={t("title")}>
      <div className="flex flex-wrap gap-1.5">
        {SLIDE_COUNT_PRESETS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onUpdate("slideCount", slideCount === count ? undefined : count)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              slideCount === count
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary hover:bg-accent",
            )}
            aria-pressed={slideCount === count}
            aria-label={t("generateAriaLabel", { count })}
          >
            {count}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("hint")}</p>
    </OptionRow>
  );
}
