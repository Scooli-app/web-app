"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CalendarCheck, CircleDot, MinusCircle, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type ClassState,
  type LessonOutcome,
  ClassStateConflictError,
  correctClassState,
  getClassState,
  recordClassState,
} from "@/services/api/classState.service";

export interface ClassStateSectionProps {
  timetableId: string;
  lessonId: string;
  /** Only shown for lessons that have already elapsed; a future lesson has nothing to confirm yet. */
  isPast: boolean;
}

/**
 * One-tap lesson closeout (Feature 2). Confirming "Como planeado" saves
 * synchronously with no confirmation modal and offers an undo. "Ficou a
 * meio" / "Não aconteceu" save immediately too, then reveal an optional
 * note field — the note is never required to record the outcome.
 *
 * A past lesson with no state row is UNCONFIRMED: expected to have
 * happened but not yet confirmed. This is never rendered as "unfinished"
 * or "skipped" — it is a neutral prompt to close it out.
 *
 * A genuine fetch failure (network/5xx) is tracked separately from a
 * confirmed UNCONFIRMED state: conflating the two would let a tap fire
 * the wrong request (POST vs PATCH) against a lesson whose real state we
 * never actually saw.
 */
export function ClassStateSection({ timetableId, lessonId, isPast }: ClassStateSectionProps) {
  const t = useTranslations("calendar.classState");
  const [state, setState] = useState<ClassState | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [saving, setSaving] = useState<LessonOutcome | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<ClassState | null>(null);

  const refetch = () =>
    getClassState(timetableId, lessonId)
      .then((result) => {
        setState(result);
        setFetchError(false);
      })
      .catch(() => {
        setState(null);
        setFetchError(true);
      });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);
    getClassState(timetableId, lessonId)
      .then((result) => {
        if (!cancelled) setState(result);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [timetableId, lessonId]);

  if (!isPast || loading) return null;

  /**
   * Runs a save operation and centralises conflict recovery: ANY
   * ClassStateConflictError (stale revision, already-recorded,
   * not-yet-recorded — e.g. because our local `state` was stale or the
   * initial fetch had failed) refetches the authoritative state and tells
   * the teacher, rather than silently corrupting local state or reporting
   * a generic failure. Every write path (initial tap, undo, note save)
   * goes through this so the contract holds everywhere, not just on the
   * happy path.
   */
  const runSave = async (
    op: () => Promise<ClassState>,
    onSuccess: (result: ClassState) => void,
  ) => {
    try {
      const result = await op();
      onSuccess(result);
    } catch (error) {
      if (error instanceof ClassStateConflictError) {
        await refetch();
        toast.error(t("staleRevision"));
      } else {
        toast.error(t("saveFailed"));
      }
    }
  };

  const applyOutcome = async (outcome: LessonOutcome) => {
    if (fetchError) {
      // We never confirmed whether this lesson already has a recorded
      // outcome; refresh first rather than guessing POST vs PATCH.
      setSaving(outcome);
      await refetch();
      setSaving(null);
      return;
    }
    setSaving(outcome);
    const previous = state;
    await runSave(
      () =>
        state && state.observed
          ? correctClassState(timetableId, lessonId, outcome, state.revision)
          : recordClassState(timetableId, lessonId, outcome),
      (result) => {
        setState(result);
        setUndoSnapshot(previous);
        if (outcome === "AS_PLANNED") {
          toast(t("savedAsPlanned"), {
            action: {
              label: t("undo"),
              onClick: () => void undo(previous),
            },
          });
        } else {
          setNoteOpen(true);
        }
      },
    );
    setSaving(null);
  };

  const undo = async (previous: ClassState | null) => {
    if (!state || !state.observed) return;
    setSaving("AS_PLANNED");
    await runSave(
      () =>
        previous && previous.observed
          ? correctClassState(
              timetableId,
              lessonId,
              previous.outcome as LessonOutcome,
              state.revision,
              previous.note,
            )
          : // There was nothing before this — history is append-only, so we
            // can't un-create the first event. Re-fetch instead of guessing.
            getClassState(timetableId, lessonId),
      (result) => {
        setState(result);
        setUndoSnapshot(null);
      },
    );
    setSaving(null);
  };

  const saveNote = async () => {
    if (!state || !state.observed) return;
    setSaving(state.outcome as LessonOutcome);
    await runSave(
      () =>
        correctClassState(
          timetableId,
          lessonId,
          state.outcome as LessonOutcome,
          state.revision,
          noteDraft.trim() || null,
        ),
      (result) => {
        setState(result);
        setNoteOpen(false);
      },
    );
    setSaving(null);
  };

  const outcome = state?.observed ? (state.outcome as LessonOutcome) : null;

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("title")}
      </p>
      {fetchError ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t("loadFailed")}</p>
          <Button size="sm" variant="ghost" onClick={() => void refetch()} className="h-7">
            {t("retry")}
          </Button>
        </div>
      ) : (
        <>
          {!state?.observed && (
            <p className="text-xs text-muted-foreground">{t("unconfirmedHint")}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={outcome === "AS_PLANNED" ? "default" : "outline"}
              disabled={saving !== null}
              onClick={() => void applyOutcome("AS_PLANNED")}
              className="h-8 rounded-full"
            >
              <CalendarCheck className="mr-1 h-3.5 w-3.5" />
              {t("asPlanned")}
            </Button>
            <Button
              size="sm"
              variant={outcome === "PARTIAL" ? "default" : "outline"}
              disabled={saving !== null}
              onClick={() => void applyOutcome("PARTIAL")}
              className="h-8 rounded-full"
            >
              <CircleDot className="mr-1 h-3.5 w-3.5" />
              {t("partial")}
            </Button>
            <Button
              size="sm"
              variant={outcome === "NOT_HELD" ? "default" : "outline"}
              disabled={saving !== null}
              onClick={() => void applyOutcome("NOT_HELD")}
              className="h-8 rounded-full"
            >
              <MinusCircle className="mr-1 h-3.5 w-3.5" />
              {t("notHeld")}
            </Button>
            {undoSnapshot !== null && outcome === "AS_PLANNED" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={saving !== null}
                onClick={() => void undo(undoSnapshot)}
                className="h-8 rounded-full text-muted-foreground"
              >
                <Undo2 className="mr-1 h-3.5 w-3.5" />
                {t("undo")}
              </Button>
            )}
          </div>
          {noteOpen && (outcome === "PARTIAL" || outcome === "NOT_HELD") && (
            <div className="space-y-1.5 pt-1">
              <Textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={
                  outcome === "PARTIAL" ? t("partialNotePlaceholder") : t("notHeldNotePlaceholder")
                }
                className="min-h-16 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)} className="h-7">
                  {t("skipNote")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => void saveNote()}
                  disabled={saving !== null}
                  className="h-7"
                >
                  {t("saveNote")}
                </Button>
              </div>
            </div>
          )}
          {state?.observed && state.note && !noteOpen && (
            <p className="text-xs text-muted-foreground italic">&ldquo;{state.note}&rdquo;</p>
          )}
        </>
      )}
    </div>
  );
}
