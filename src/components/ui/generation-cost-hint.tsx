import { cn } from "@/shared/utils/utils";
import { Sparkles } from "lucide-react";

interface GenerationCostHintProps {
  className?: string;
  compact?: boolean;
}

/**
 * Small visual hint that an action consumes 1 generation.
 */
export function GenerationCostHint({
  className,
  compact = false,
}: GenerationCostHintProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold leading-none whitespace-nowrap",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className,
      )}
      aria-label="Consome 1 geração"
      title="Consome 1 geração"
    >
      <Sparkles className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      <span>1</span>
    </span>
  );
}

