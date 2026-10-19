import { DOCUMENT_GENERATION_STALL_THRESHOLD_MS } from "@/shared/config/constants";
import { useEffect, useState } from "react";

/**
 * Returns true once `active` has stayed true for `thresholdMs` continuously.
 * Resets to false whenever `active` goes false (or the threshold changes).
 *
 * `since` (ISO timestamp) is when the work actually began, if known. The wait is
 * then measured from it instead of from this component mounting, so reloading a
 * long-stuck document does not restart the clock.
 */
export function useGenerationStalled(
  active: boolean,
  since?: string | null,
  thresholdMs: number = DOCUMENT_GENERATION_STALL_THRESHOLD_MS,
): boolean {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!active) return;
    const startedAt = since ? Date.parse(since) : NaN;
    // Ignore missing, invalid or future timestamps (clock skew): fall back to "now".
    const elapsed = Number.isFinite(startedAt)
      ? Math.min(Math.max(Date.now() - startedAt, 0), thresholdMs)
      : 0;
    const timer = setTimeout(() => setStalled(true), thresholdMs - elapsed);
    return () => {
      clearTimeout(timer);
      setStalled(false);
    };
  }, [active, since, thresholdMs]);

  return active && stalled;
}
