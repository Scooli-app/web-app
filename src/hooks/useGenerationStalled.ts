import { DOCUMENT_GENERATION_STALL_THRESHOLD_MS } from "@/shared/config/constants";
import { useEffect, useState } from "react";

/**
 * Returns true once `active` has stayed true for `thresholdMs` continuously.
 * Resets to false whenever `active` goes false (or the threshold changes).
 */
export function useGenerationStalled(
  active: boolean,
  thresholdMs: number = DOCUMENT_GENERATION_STALL_THRESHOLD_MS,
): boolean {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setStalled(true), thresholdMs);
    return () => {
      clearTimeout(timer);
      setStalled(false);
    };
  }, [active, thresholdMs]);

  return active && stalled;
}
