/**
 * Runs `run` one call at a time. Calls made while one is in flight collapse into a single
 * follow-up that starts after it settles, so the follow-up always reads the latest state.
 */
export function createSerialRunner(run: () => Promise<boolean>): (() => Promise<boolean>) & { settled: () => Promise<boolean> } {
  let inFlight: Promise<boolean> | null = null;
  let queued: Promise<boolean> | null = null;
  const start = () => {
    inFlight = run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  const next = () => {
    queued = null;
    return start();
  };
  const call = () => {
    if (!inFlight) return start();
    queued ??= inFlight.then(next, next);
    return queued;
  };
  /** Resolves with the outcome of the last pending run, or true when nothing is pending. */
  const settled = () => queued ?? inFlight ?? Promise.resolve(true);
  return Object.assign(call, { settled });
}
