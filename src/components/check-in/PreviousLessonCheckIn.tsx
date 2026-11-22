"use client";

import { Button } from "@/components/ui/button";
import { useCheckInNextStep } from "@/components/check-in/useCheckInNextStep";
import type { PreviousLessonCheckIn as PreviousCheckIn } from "@/services/api/timetable.service";
import type { CheckInOutcome, CheckInResult, CheckInSubmission } from "@/shared/types/check-in";
import { isCheckableSlot, type TeachingSlotInput } from "@/shared/utils/teachingStatus";
import { toIso } from "@/shared/utils/calendar";
import { selectIsClassStateEnabled } from "@/store/features/selectors";
import { useAppSelector } from "@/store/hooks";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { readAsked } from "@/hooks/checkInSession";
import { buildSubmission, initialOutcomeSelection, needsDetailStep } from "@/hooks/checkInQueue";
import { CheckInOutcomeStep, CheckInResultOptions, type OutcomeStepExtras } from "./CheckInChoices";
import {
  answerPreviousLesson,
  loadPreviousCheckIn,
  phaseAfterSave,
  previousCheckInVisible,
  type SavedPhase,
} from "./previousCheckInLogic";

type OutcomeResult = Extract<CheckInResult, "TAUGHT_WITH_DIFFICULTIES" | "PARTIAL">;

interface PreviousLessonCheckInProps {
  timetableId: string;
  /** The lesson being prepared. The prompt asks about the lesson before it. */
  lessonId: string;
  /** The dialog's own slot. A past, checkable slot has its own question in the dialog, so no prompt here. */
  dialogSlot: TeachingSlotInput;
  /** Fires after the answer is saved, so the turma's progress and the previous lesson's mark can refresh. */
  onCheckedIn?: () => void;
  /** Fires after the lessons after a not-held previous lesson were moved, so the turma's lessons reload. */
  onShifted?: () => void;
}

/**
 * "A última aula correu bem?" at the top of the lesson creation flow (ENG-224). One line, skippable, and it
 * never gates generation. Answering saves a normal check-in on the previous lesson, which the new lesson's
 * generation then reads. Hidden unless `class_state_enabled` is on.
 */
export function PreviousLessonCheckIn({
  timetableId,
  lessonId,
  dialogSlot,
  onCheckedIn,
  onShifted,
}: PreviousLessonCheckInProps) {
  const enabled = useAppSelector(selectIsClassStateEnabled);
  const todayIso = toIso(new Date());

  const [pending, setPending] = useState<PreviousCheckIn | null>(null);
  const [hidden, setHidden] = useState(false);
  const [saved, setSaved] = useState<SavedPhase | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [outcomeResult, setOutcomeResult] = useState<OutcomeResult | null>(null);
  const [chosen, setChosen] = useState<CheckInResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  /** What follows the answer: done by itself where it can, at most one line to answer (the same as everywhere). */
  const nextStep = useCheckInNextStep({ onShifted: () => onShifted?.() });
  const clearNextStep = nextStep.clear;

  useEffect(() => {
    let cancelled = false;
    setPending(null);
    clearNextStep();
    setHidden(false);
    setSaved(null);
    setSaveFailed(false);
    setOutcomeResult(null);
    setChosen(null);
    setSelected([]);
    void loadPreviousCheckIn(enabled, timetableId, lessonId).then((found) => {
      if (cancelled) return;
      // The check-in strip already asked about this lesson in this session: asking again would duplicate it.
      setPending(found && !readAsked(found.slotId) ? found : null);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, timetableId, lessonId, clearNextStep]);

  const visible = previousCheckInVisible({
    enabled,
    pending,
    hidden,
    dialogSlotCheckable: isCheckableSlot(dialogSlot, todayIso),
  });
  if (!visible || !pending) return null;

  const answer = async (body: CheckInSubmission) => {
    const saved = await answerPreviousLesson(timetableId, pending, body);
    const phase = phaseAfterSave(saved !== false, body.result);
    if (saved && phase) {
      setSaved(phase);
      setSaveFailed(false);
      nextStep.afterSave({ timetableId, slotId: pending.slotId, slotType: pending.slotType }, body, saved);
      onCheckedIn?.();
    } else {
      setSaveFailed(true);
    }
  };

  return (
    <>
      <PreviousLessonCheckInView
        lessonName={pending.topicTitle || null}
        lesson={{ timetableId, slotId: pending.slotId }}
        saved={saved}
        step={nextStep.row}
        saveFailed={saveFailed}
        outcomeResult={outcomeResult}
        chosen={chosen}
        outcomes={pending.outcomes}
        selected={selected}
        onChoose={(result: CheckInResult) => {
          setChosen(result);
          if (needsDetailStep(result)) {
            setSelected(initialOutcomeSelection(pending.outcomes));
            setOutcomeResult(result as OutcomeResult);
            return;
          }
          void answer(buildSubmission(result));
        }}
        onToggle={(id) =>
          setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
        }
        onConfirm={(extras) => {
          if (outcomeResult) void answer(buildSubmission(outcomeResult, selected, extras));
        }}
        onBackOutcomes={() => setOutcomeResult(null)}
        onNotNow={() => setHidden(true)}
      />
      {nextStep.sheet}
    </>
  );
}

/**
 * The prompt's markup, separate from the container's loading and saving so each phase can be rendered and
 * checked on its own: the question with the lesson's name under it and the four results, the outcome step, the short
 * confirmation that replaces them after a save, and the save error.
 */
export function PreviousLessonCheckInView({
  lessonName,
  lesson,
  saved,
  step = null,
  saveFailed,
  outcomeResult,
  chosen = null,
  outcomes,
  selected,
  onChoose,
  onToggle,
  onConfirm,
  onBackOutcomes,
  onNotNow,
}: {
  /** The previous lesson's title, on one truncated line under the question. */
  lessonName: string | null;
  /** The previous lesson's ids, so the outcome step can offer fallback outcomes. */
  lesson?: { timetableId: string; slotId: string };
  saved: SavedPhase | null;
  /** The one line that follows the answer (useCheckInNextStep), shown under the saved line. */
  step?: ReactNode;
  saveFailed: boolean;
  outcomeResult: OutcomeResult | null;
  /** The result last chosen, shown pressed. */
  chosen?: CheckInResult | null;
  outcomes: CheckInOutcome[];
  selected: readonly string[];
  onChoose: (result: CheckInResult) => void;
  onToggle: (id: string) => void;
  /** Saves the outcomes ticked, possibly none, with the amount and note the step collected. */
  onConfirm: (extras: OutcomeStepExtras) => void;
  onBackOutcomes: () => void;
  onNotNow: () => void;
}) {
  const t = useTranslations("previousCheckIn");
  const tc = useTranslations("checkIns");

  if (saved) {
    const savedText = saved === "savedWithContext" ? t("savedWithContext") : t("saved");
    return (
      <div className="space-y-2">
        <p role="status" className="text-sm text-muted-foreground">
          {savedText}
        </p>
        {step}
      </div>
    );
  }

  const question = t("question");
  return (
    <section aria-label={question} className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-3">
      {/* Keeps the lesson in view in both steps: the outcome question alone does not say which lesson it is about. */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{question}</p>
          {lessonName && (
            <p className="truncate text-xs text-muted-foreground" title={lessonName}>
              {lessonName}
            </p>
          )}
        </div>
        {!outcomeResult && (
          <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onNotNow}>
            {t("notNow")}
          </Button>
        )}
      </div>
      {outcomeResult ? (
        <CheckInOutcomeStep
          question={outcomeResult === "PARTIAL" ? tc("uncoveredQuestion") : tc("difficultiesQuestion")}
          result={outcomeResult}
          outcomes={outcomes}
          lesson={lesson}
          selected={selected}
          onToggle={onToggle}
          onSave={onConfirm}
          onBack={onBackOutcomes}
        />
      ) : (
        <CheckInResultOptions onChoose={onChoose} selected={chosen} />
      )}
      {saveFailed && <p className="text-xs text-destructive">{tc("saveError")}</p>}
    </section>
  );
}
