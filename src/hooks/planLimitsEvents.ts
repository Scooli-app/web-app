/**
 * "The plan limits may have changed" signal for code outside React (the API client, streaming
 * services) that must not import the plan-limits hook. `usePlanLimits` listens and re-reads.
 */
const listeners = new Set<() => void>();

export function onPlanLimitsStale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markPlanLimitsStale(): void {
  listeners.forEach((listener) => listener());
}
