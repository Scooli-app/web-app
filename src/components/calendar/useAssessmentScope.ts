"use client";

import { useCallback, useEffect, useState } from "react";
import type { AssessmentScope } from "@/services/api/timetable.service";
import { initialSelection, loadAssessmentScope, toggleOutcome } from "./assessmentScopeLogic";

/**
 * The scope of an assessment and which of its outcomes are ticked (ENG-209). Loads only when `enabled` (the
 * assessment, the flag, not skipped). Everything starts ticked when the scope arrives.
 */
export function useAssessmentScope(enabled: boolean, timetableId: string, lessonId: string) {
  const [scope, setScope] = useState<AssessmentScope | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setScope(null);
    setSelected([]);
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadAssessmentScope(enabled, timetableId, lessonId)
      .then((found) => {
        if (cancelled) return;
        setScope(found);
        setSelected(initialSelection(found));
      })
      .catch(() => {
        /* no scope to show: the test is generated from the whole AE context */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, timetableId, lessonId]);

  const toggle = useCallback(
    (id: string) => setSelected((prev) => toggleOutcome(prev, id, scope)),
    [scope],
  );

  return { scope, selected, loading, toggle };
}
