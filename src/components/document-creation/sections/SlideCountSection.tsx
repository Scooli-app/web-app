/**
 * Slide-count picker for the Presentations creation form (SCOOL-135).
 *
 * Preset row (5 / 8 / 10 / 12 / 15 / 20) styled to match {@link DurationSection}.
 * Defaults to 10 — see PRESENTATIONS_NOTES.md decision #4.
 *
 * Only rendered when {@code documentType.id === "presentation"} (the caller
 * guards rendering; this component does not check the type itself).
 */
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/utils/utils";
import { Presentation } from "lucide-react";
import type { FormUpdateFn } from "../types";

/** Presets shown as preset buttons. Matches typical classroom decks. */
const SLIDE_COUNT_PRESETS = [5, 8, 10, 12, 15, 20] as const;

/** Default applied when the user submits without picking one. */
export const DEFAULT_SLIDE_COUNT = 10;

interface SlideCountSectionProps {
  slideCount?: number;
  onUpdate: FormUpdateFn;
  className?: string;
}

export function SlideCountSection({
  slideCount,
  onUpdate,
  className,
}: SlideCountSectionProps) {
  // Treat the default (10) as "not yet explicitly chosen" for visual feedback —
  // no preset is highlighted until the user clicks something.
  const selected = slideCount;

  return (
    <Card
      className={cn(
        "p-4 sm:p-6 border-border shadow-sm hover:shadow-md transition-shadow h-full",
        className,
      )}
    >
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-accent shrink-0">
            <Presentation className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Número de slides{" "}
            <span className="text-xs sm:text-sm font-normal text-muted-foreground">
              (Opcional)
            </span>
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Sem escolha, geramos {DEFAULT_SLIDE_COUNT} slides. Mínimo 5, máximo 20.
        </p>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {SLIDE_COUNT_PRESETS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() =>
                onUpdate("slideCount", selected === count ? undefined : count)
              }
              className={cn(
                "inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all",
                "border hover:scale-[1.02] active:scale-[0.98]",
                selected === count
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card text-foreground border-border hover:border-primary hover:bg-accent",
              )}
              aria-pressed={selected === count}
              aria-label={`Gerar ${count} slides`}
            >
              <span>📊</span>
              <span>{count} slides</span>
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
