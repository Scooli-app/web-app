"use client";

import { checkInService } from "@/services/api/check-in.service";
import type { CheckInSubmission, PendingCheckIn } from "@/shared/types/check-in";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearDismissed, readDismissed, readSkipped, writeDismissed, writeSkipped } from "./checkInSession";
import { afterConfirmAll, loadPendingCheckIns, visibleCheckIns, withCheckInAt, withoutCheckIn } from "./checkInQueue";

/**
 * Pending "Como correu a aula?" check-ins for the dashboard. Loads once when `enabled` (the
 * `class_state_enabled` flag) turns on; does nothing otherwise. Saves are optimistic: the item
 * leaves the queue at once and comes back, at its old place, if the request fails.
 */
export function usePendingCheckIns(enabled: boolean) {
  const [items, setItems] = useState<PendingCheckIn[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [skipped, setSkipped] = useState<string[]>([]);
  // Mirror of `items` for the async handlers, so each one sees the queue as it is now.
  const itemsRef = useRef<PendingCheckIn[]>([]);

  const replaceItems = useCallback((next: PendingCheckIn[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // Session state is read here, not during render, so server and client markup match.
    setDismissed(readDismissed());
    setSkipped(readSkipped());
    loadPendingCheckIns(enabled, (limit) => checkInService.getPending(limit))
      .then((list) => {
        if (cancelled) return;
        replaceItems(list);
        setLoaded(true);
      })
      .catch(() => {
        /* the strip stays hidden; the dashboard works without it */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, replaceItems]);

  /** Pending items the teacher has not set aside for this session. */
  const visible = useMemo(() => visibleCheckIns(items, skipped), [items, skipped]);

  /** Saves one answer. Resolves false (and restores the item) when the request fails. */
  const submit = useCallback(
    async (item: PendingCheckIn, body: CheckInSubmission): Promise<boolean> => {
      const { items: next, index } = withoutCheckIn(itemsRef.current, item.slotId);
      replaceItems(next);
      try {
        await checkInService.submit(item.timetableId, item.slotId, body);
        return true;
      } catch {
        replaceItems(withCheckInAt(itemsRef.current, item, index));
        return false;
      }
    },
    [replaceItems],
  );

  /** Confirms every pending lesson. Resolves the count, or null (and restores the list) on failure. */
  const confirmAll = useCallback(async (): Promise<number | null> => {
    const snapshot = itemsRef.current;
    replaceItems(afterConfirmAll(snapshot));
    try {
      const { updated } = await checkInService.confirmAll();
      return updated;
    } catch {
      replaceItems(snapshot);
      return null;
    }
  }, [replaceItems]);

  /** "Ainda não" on a test: hide this one for the rest of the session. */
  const skipForSession = useCallback((item: PendingCheckIn) => {
    setSkipped((current) => {
      if (current.includes(item.slotId)) return current;
      const next = [...current, item.slotId];
      writeSkipped(next);
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    writeDismissed();
    setDismissed(true);
  }, []);

  /** The teacher asked to see the pending lessons ("Ver"): undoes the dismiss and the "Ainda não" skips. */
  const show = useCallback(() => {
    clearDismissed();
    writeSkipped([]);
    setDismissed(false);
    setSkipped([]);
  }, []);

  return { visible, loaded, dismissed, submit, confirmAll, skipForSession, dismiss, show };
}
