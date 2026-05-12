"use client";

import { FeatureFlag } from "@/shared/types/featureFlags";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSources, refreshSource } from "@/store/sources/sourcesSlice";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Background component that keeps user-source ingestion state in sync across
 * pages. It polls any source that hasn't reached a terminal state (indexed or
 * failed) and fires a toast when one completes.
 *
 * Mounted once at the layout level — no UI of its own. The visible indicator
 * (spinner on the "As minhas fontes" sidebar item) is rendered separately
 * from the sidebar using the same Redux state.
 */

const POLL_INTERVAL_MS = 5000;
const PENDING_STATUSES = new Set([
  "uploaded",
  "parsing",
  "summarising",
  "chunking",
  "embedding",
]);

export function SourceIngestionTracker() {
  const dispatch = useAppDispatch();
  const isUserSourcesEnabled = useAppSelector(
    (state) => state.features.flags[FeatureFlag.USER_SOURCES] === true,
  );
  const sources = useAppSelector((state) => state.sources.sources);

  // Track the last-seen status of each source so we only toast on transitions.
  const previousStatusesRef = useRef<Map<string, string>>(new Map());
  // Guard against double-fetch in React strict mode / re-mounts.
  const hasFetchedRef = useRef(false);

  // Eagerly fetch sources once after the feature flag arrives, so the rest of
  // the app (including the sidebar indicator) reflects ingestion state without
  // needing the user to visit /sources first.
  useEffect(() => {
    if (!isUserSourcesEnabled || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void dispatch(fetchSources());
  }, [isUserSourcesEnabled, dispatch]);

  // Detect status transitions and fire toasts. On first observation of a
  // source (previousStatus === undefined) we record without toasting, so a
  // page reload doesn't replay completions the user has already seen.
  useEffect(() => {
    const prev = previousStatusesRef.current;
    for (const source of sources) {
      const before = prev.get(source.id);
      const after = source.status;
      if (before !== undefined && before !== after) {
        if (after === "indexed") {
          toast.success(`Fonte "${source.name}" pronta a usar.`);
        } else if (after === "failed") {
          const detail = source.lastError ? ` (${source.lastError})` : "";
          toast.error(`Falha ao processar "${source.name}"${detail}.`);
        }
      }
      prev.set(source.id, after);
    }
    // Drop entries for sources that no longer exist (deleted).
    const liveIds = new Set(sources.map((s) => s.id));
    for (const id of Array.from(prev.keys())) {
      if (!liveIds.has(id)) prev.delete(id);
    }
  }, [sources]);

  // Poll pending sources while any exist. The list of pending IDs is captured
  // when the effect runs; if it changes (new uploads, completions) the effect
  // restarts with the fresh set.
  const pendingIds = sources
    .filter((s) => PENDING_STATUSES.has(s.status))
    .map((s) => s.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!isUserSourcesEnabled || pendingIds.length === 0) return;
    const ids = pendingIds.split(",");
    const interval = setInterval(() => {
      ids.forEach((id) => {
        void dispatch(refreshSource(id));
      });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isUserSourcesEnabled, pendingIds, dispatch]);

  return null;
}
