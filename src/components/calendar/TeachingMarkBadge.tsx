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

const LEGEND: TeachingMark[] = [
  { key: "taught", glyph: "✓" },
  { key: "taughtWithDifficulties", glyph: "~" },
  { key: "partiallyTaught", glyph: "½" },
  { key: "notHeld", glyph: "✕" },
  { key: "unconfirmed", glyph: "•" },
];

/** What the marks mean, once, next to the week (the marks alone are small and only explained on hover). */
export function TeachingMarkLegend({ className = "" }: { className?: string }) {
  const t = useTranslations("checkIns.mark");
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground ${className}`}>
      {LEGEND.map((mark) => (
        <span key={mark.key} className="inline-flex items-center gap-1">
          <TeachingMarkBadge mark={mark} />
          {t(mark.key)}
        </span>
      ))}
    </p>
  );
}
