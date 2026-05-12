"use client";

import { useAppSelector } from "@/store/hooks";
import { Loader2 } from "lucide-react";

const PENDING_STATUSES = new Set([
  "uploaded",
  "parsing",
  "summarising",
  "chunking",
  "embedding",
]);

/**
 * Small spinner + count shown next to the "As minhas fontes" sidebar item
 * whenever at least one source is still being ingested. Renders nothing when
 * everything is indexed or failed.
 */
export function SourcesPendingBadge() {
  const pendingCount = useAppSelector(
    (state) => state.sources.sources.filter((s) => PENDING_STATUSES.has(s.status)).length,
  );

  if (pendingCount === 0) return null;

  return (
    <span
      className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
      aria-label={`${pendingCount} ${pendingCount === 1 ? "fonte" : "fontes"} a processar`}
    >
      <Loader2 className="h-2.5 w-2.5 animate-spin" />
      {pendingCount}
    </span>
  );
}
