"use client";

import type { TeachingMark, TeachingMarkKey } from "@/shared/utils/teachingStatus";
import { useTranslations } from "next-intl";

const TONE: Record<TeachingMarkKey, string> = {
  taught: "text-green-600 dark:text-green-400",
  taughtWithDifficulties: "text-amber-600 dark:text-amber-400",
  partiallyTaught: "text-amber-600 dark:text-amber-400",
  notHeld: "text-muted-foreground",
  assumedTaught: "text-muted-foreground/60",
  unconfirmed: "text-primary/70",
};

/**
 * The quiet check-in mark on a past lesson card: ✓ taught, ½ partly, ✕ not held, a muted ✓ when
 * assumed, and a dot while it still needs confirming. The label is for screen readers and tooltips.
 */
export function TeachingMarkBadge({ mark, className = "" }: { mark: TeachingMark; className?: string }) {
  const t = useTranslations("checkIns.mark");
  const label = t(mark.key);
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center text-[11px] font-semibold leading-none ${TONE[mark.key]} ${className}`}
    >
      {mark.glyph}
    </span>
  );
}
